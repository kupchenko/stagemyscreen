import * as THREE from "three";
import {
  loadCustomModel,
  disposeObjects,
  setSurfaceMaterial,
  type CustomRuntime,
  type SurfaceSlot,
} from "./custom-models";
import type { ImportedModel } from "./imported-model";
import { ContactShadow } from "./contact-shadow";
import { buildDeviceModel } from "./device-models";
import { LightingRig, createLightingEnvironment } from "./lighting-rig";
import { DEFAULT_LIGHTING, type SceneLighting } from "./scene-lighting";
import { aspect, BACKGROUNDS, Device, Project } from "./studio";
import { configureScreenMaterial, screenTextureMatrix } from "./screen-texture";
import {
  exportDimensions,
  exportTiles,
  type ExportQuality,
} from "./export-quality";

interface Model {
  group: THREE.Group;
  screenMaterial?: THREE.MeshBasicMaterial;
  screenRatio: number;
  key: string;
  textureKey: string;
  asset?: ImportedModel;
  custom?: CustomRuntime;
  surface?: SurfaceSlot;
  loading?: Promise<void>;
  textureLoading?: Promise<void>;
  pending?: boolean;
  error?: string;
  textureError?: string;
}
function disposeModel(model: Model) {
  if (model.surface) setSurfaceMaterial(model.surface, model.surface.original);
  disposeObjects(
    [model.group, ...(model.custom?.resources || [])],
    model.screenMaterial ? [model.screenMaterial] : [],
  );
}
export class DeviceEngine {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(27, 16 / 9, 0.1, 100);
  models = new Map<string, Model>();
  project: Project | null = null;
  private width = 1;
  private height = 1;
  private disposed = false;
  private exporting = false;
  private queuedProject: Project | null = null;
  private environments = new Map<string, THREE.WebGLRenderTarget>();
  private pmrem: THREE.PMREMGenerator;
  private lighting = new LightingRig();
  private contact = new ContactShadow();
  private shadowDirty = true;
  private raycaster = new THREE.Raycaster();
  constructor(
    container: HTMLElement,
    private onStatus: (message: string) => void = () => {},
  ) {
    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.AgXToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.domElement.setAttribute(
      "aria-label",
      "Interactive 3D device canvas",
    );
    container.appendChild(this.renderer.domElement);
    this.pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.add(this.lighting.group);
    this.applyLighting(DEFAULT_LIGHTING);
    this.scene.add(this.contact.mesh);
    this.camera.position.set(0, 0.5, 12);
    this.camera.lookAt(0, 0, 0);
  }
  private applyLighting(settings: SceneLighting) {
    this.renderer.toneMappingExposure = this.lighting.apply(
      this.scene,
      settings,
    );
    const key = `${settings.mode}:${settings.warmth}`;
    let environment = this.environments.get(key);
    if (!environment) {
      const room = createLightingEnvironment(settings);
      try {
        environment = this.pmrem.fromScene(room, 0.025);
        this.environments.set(key, environment);
      } finally {
        room.traverse((o) => {
          if (o instanceof THREE.InstancedMesh) o.dispose();
        });
        room.dispose();
      }
    } else {
      // Keep a bounded cache when dragging warmth or browsing presets.
      this.environments.delete(key);
      this.environments.set(key, environment);
    }
    this.scene.environment = environment.texture;
    while (this.environments.size > 3) {
      const oldest = this.environments.keys().next().value!;
      this.environments.get(oldest)!.dispose();
      this.environments.delete(oldest);
    }
    this.contact.mesh.material.opacity = settings.shadowStrength / 100;
    this.contact.softness = settings.shadowSoftness;
  }
  resize(w: number, h: number) {
    this.width = w;
    this.height = h;
    if (this.exporting) return;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.render();
  }
  private create(d: Device, asset?: ImportedModel): Model {
    if (d.kind === "custom") {
      const model: Model = {
        group: new THREE.Group(),
        key: `custom:${d.modelId}`,
        textureKey: "",
        screenRatio: 1,
        asset,
        pending: true,
      };
      this.scene.add(model.group);
      model.loading = this.loadModel(model, d.id);
      return model;
    }
    const built = buildDeviceModel(d);
    this.scene.add(built.group);
    return {
      group: built.group,
      screenMaterial: built.screen.material,
      screenRatio: built.screenRatio,
      key: `${d.kind}:${d.finish}`,
      textureKey: "",
    };
  }
  private reportStatus() {
    if (this.disposed) return;
    const models = [...this.models.values()];
    this.onStatus(
      models.find((m) => m.error)?.error ||
        models.find((m) => m.textureError)?.textureError ||
        (models.some((m) => m.pending) ? "Loading imported models…" : ""),
    );
  }
  private async loadModel(model: Model, id: string) {
    try {
      if (!model.asset)
        throw new Error("The imported model is missing from this project.");
      const runtime = await loadCustomModel(model.asset);
      if (this.disposed || this.models.get(id) !== model) {
        disposeObjects(runtime.resources);
        return;
      }
      model.custom = runtime;
      // Preserve authored texture detail at oblique viewing angles as well.
      const anisotropy = this.renderer.capabilities.getMaxAnisotropy();
      for (const slot of runtime.slots) {
        for (const value of Object.values(slot.original)) {
          if (value instanceof THREE.Texture) {
            value.anisotropy = anisotropy;
            value.needsUpdate = true;
          }
        }
      }
      model.group.add(runtime.group);
      model.group.traverse((o) => {
        o.userData.deviceId = id;
      });
      model.pending = false;
      if (this.project) this.update(this.project);
      await model.textureLoading;
    } catch (e) {
      model.error = `${model.asset?.name || "Imported model"}: ${e instanceof Error ? e.message : "Could not load the model."}`;
    } finally {
      model.pending = false;
      this.reportStatus();
    }
  }
  private bindScreen(model: Model, d: Device) {
    if (!model.custom) return;
    const slot = model.custom.slots.find(
      (s) => s.info.id === d.screenSurface && s.info.hasUV,
    );
    if (model.surface !== slot) {
      if (model.surface)
        setSurfaceMaterial(model.surface, model.surface.original);
      model.screenMaterial?.map?.dispose();
      model.screenMaterial?.dispose();
      model.surface = slot;
      model.screenMaterial = undefined;
      model.textureKey = "";
      model.textureError = undefined;
      if (slot) {
        model.screenMaterial = new THREE.MeshBasicMaterial({
          color: "white",
          toneMapped: false,
          side: slot.original.side,
        });
        setSurfaceMaterial(slot, model.screenMaterial);
      }
    }
    model.screenRatio = d.screenAspect || slot?.info.aspect || 1;
  }
  update(project: Project) {
    if (this.exporting) {
      this.queuedProject = project;
      return;
    }
    this.project = project;
    this.applyLighting(project.lighting || DEFAULT_LIGHTING);
    for (const [id, model] of this.models)
      if (!project.devices.some((d) => d.id === id)) {
        this.scene.remove(model.group);
        disposeModel(model);
        this.models.delete(id);
      }
    for (const d of project.devices) {
      let model = this.models.get(d.id);
      const asset =
        d.kind === "custom"
          ? project.models?.find((m) => m.id === d.modelId)
          : undefined;
      const key =
        d.kind === "custom" ? `custom:${d.modelId}` : `${d.kind}:${d.finish}`;
      if (!model || model.key !== key || model.asset !== asset) {
        if (model) {
          this.scene.remove(model.group);
          disposeModel(model);
        }
        model = this.create(d, asset);
        this.models.set(d.id, model);
      }
      model.group.visible = d.visible;
      model.group.position.set(d.x, d.y, d.z);
      model.group.rotation.set(
        THREE.MathUtils.degToRad(d.rx),
        THREE.MathUtils.degToRad(d.ry),
        THREE.MathUtils.degToRad(d.rz),
      );
      model.group.scale.setScalar(d.scale);
      this.bindScreen(model, d);
      const textureKey = `${d.screenshot}|${d.fit}|${d.screenSurface}|${model.screenRatio}|${d.screenRotation}|${d.screenFlipX}|${d.screenFlipY}`;
      if (model.screenMaterial && model.textureKey !== textureKey) {
        model.textureKey = textureKey;
        model.textureError = undefined;
        model.textureLoading = this.loadScreen(model, d, textureKey);
      }
    }
    this.contact.mesh.visible = project.shadows;
    this.scene.updateMatrixWorld(true);
    let floor = Infinity;
    for (const model of this.models.values())
      if (model.group.visible) {
        floor = Math.min(
          floor,
          new THREE.Box3().setFromObject(model.group).min.y,
        );
      }
    this.contact.mesh.position.y = Number.isFinite(floor)
      ? floor - 0.025
      : -2.4;
    this.shadowDirty = true;
    const bg = BACKGROUNDS[project.background];
    this.scene.background = bg ? new THREE.Color(bg) : null;
    // Preserve the same vertical field of view at every export resolution.
    this.camera.zoom = project.zoom * (aspect(project.ratio) < 1 ? 0.66 : 1);
    this.camera.updateProjectionMatrix();
    this.render();
    this.reportStatus();
  }
  private async loadScreen(model: Model, d: Device, key: string) {
    try {
      const texture = await new THREE.TextureLoader().loadAsync(d.screenshot);
      if (
        this.disposed ||
        model.textureKey !== key ||
        this.models.get(d.id) !== model ||
        !model.screenMaterial
      ) {
        texture.dispose();
        return;
      }
      const image = texture.image as HTMLImageElement;
      texture.flipY = !model.custom;
      texture.matrixAutoUpdate = false;
      texture.matrix.copy(
        screenTextureMatrix(
          image.naturalWidth || image.width,
          image.naturalHeight || image.height,
          model.screenRatio,
          d.fit,
          model.custom ? d.screenRotation || 0 : 0,
          model.custom ? !!d.screenFlipX : false,
          model.custom ? !!d.screenFlipY : false,
        ),
      );
      configureScreenMaterial(model.screenMaterial, d.fit === "contain");
      this.assignTexture(model, texture);
      this.render();
    } catch {
      if (
        !this.disposed &&
        this.models.get(d.id) === model &&
        model.textureKey === key
      ) {
        model.textureError = `${d.name}: Could not load the screenshot. Replace it with a PNG, JPEG, or WebP image.`;
        this.reportStatus();
      }
    }
  }
  private assignTexture(model: Model, t: THREE.Texture) {
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    model.screenMaterial!.map?.dispose();
    model.screenMaterial!.map = t;
    model.screenMaterial!.needsUpdate = true;
  }
  render() {
    if (this.disposed || this.exporting) return;
    if (this.shadowDirty && this.project?.shadows) {
      this.contact.update(this.renderer, this.scene);
      this.shadowDirty = false;
    }
    this.renderer.render(this.scene, this.camera);
  }
  pick(clientX: number, clientY: number) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.raycaster.setFromCamera(
      new THREE.Vector2(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        (-(clientY - rect.top) / rect.height) * 2 + 1,
      ),
      this.camera,
    );
    const hit = this.raycaster.intersectObjects(
      [...this.models.values()]
        .filter((m) => m.group.visible)
        .map((m) => m.group),
      true,
    )[0];
    return hit?.object.userData.deviceId as string | undefined;
  }
  dragDelta(dx: number, dy: number, z: number) {
    const distance = this.camera.position.z - z;
    const visibleHeight =
      (2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * distance) /
      this.camera.zoom;
    return {
      x: (dx / this.height) * visibleHeight,
      y: (-dy / this.height) * visibleHeight,
    };
  }
  fitZoom(): number {
    if (!this.project) return 1;
    const previous = this.camera.zoom;
    this.camera.zoom = aspect(this.project.ratio) < 1 ? 0.66 : 1;
    this.camera.updateProjectionMatrix();
    let extent = 0.5;
    this.scene.updateMatrixWorld(true);
    for (const model of this.models.values()) {
      if (!model.group.visible) continue;
      const box = new THREE.Box3().setFromObject(model.group);
      if (box.isEmpty()) continue;
      for (const x of [box.min.x, box.max.x])
        for (const y of [box.min.y, box.max.y])
          for (const z of [box.min.z, box.max.z]) {
            const point = new THREE.Vector3(x, y, z).project(this.camera);
            extent = Math.max(extent, Math.abs(point.x), Math.abs(point.y));
          }
    }
    this.camera.zoom = previous;
    this.camera.updateProjectionMatrix();
    return Math.min(2, Math.max(0.4, Math.floor((0.9 / extent) * 100) / 100));
  }
  async export(
    width: number,
    transparent: boolean,
    quality: ExportQuality = "ultra",
    onProgress: (percent: number) => void = () => {},
  ): Promise<Blob> {
    if (!this.project) throw new Error("The scene is still loading.");
    if (this.exporting) throw new Error("An export is already in progress.");
    await Promise.all([...this.models.values()].map((m) => m.loading));
    await Promise.all([...this.models.values()].map((m) => m.textureLoading));
    const failure = [...this.models.values()].find(
      (m) => (m.error || m.textureError) && m.group.visible,
    );
    if (failure) throw new Error(failure.error || failure.textureError);
    const { height } = exportDimensions(width, aspect(this.project.ratio));
    const gl = this.renderer.getContext();
    const tiles = exportTiles(
      width,
      height,
      quality,
      Math.min(
        this.renderer.capabilities.maxTextureSize,
        gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
      ),
    );
    const output = document.createElement("canvas");
    output.width = width;
    output.height = height;
    const ctx = output.getContext("2d", { alpha: true });
    if (!ctx)
      throw new Error(
        "Not enough memory for this image. Choose a smaller resolution.",
      );
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    const camera = this.camera.clone();
    const pixelRatio = this.renderer.getPixelRatio();
    const background = this.scene.background;
    this.exporting = true;
    try {
      onProgress(0);
      this.contact.setResolution(
        Math.min(4096, this.renderer.capabilities.maxTextureSize),
      );
      if (this.project.shadows) this.contact.update(this.renderer, this.scene);
      this.renderer.setPixelRatio(1);
      this.scene.background = transparent
        ? null
        : background || new THREE.Color(0xffffff);
      // Render bounded tiles at their actual output resolution. Ultra renders
      // four source pixels per output pixel, plus the GPU's edge antialiasing.
      // Gutters preserve filtering at tile boundaries; only each tile's center is copied.
      for (const [index, tile] of tiles.entries()) {
        if (this.disposed || this.renderer.getContext().isContextLost())
          throw new Error(
            "The graphics context was lost. Reload and try a smaller export.",
          );
        this.renderer.setSize(tile.renderWidth, tile.renderHeight, false);
        if (
          gl.drawingBufferWidth !== tile.renderWidth ||
          gl.drawingBufferHeight !== tile.renderHeight
        )
          throw new Error(
            "The graphics device reduced the render size. Choose a smaller export.",
          );
        camera.setViewOffset(
          width * tile.scale,
          height * tile.scale,
          tile.left * tile.scale,
          tile.top * tile.scale,
          tile.renderWidth,
          tile.renderHeight,
        );
        this.renderer.render(this.scene, camera);
        ctx.save();
        ctx.beginPath();
        ctx.rect(tile.x, tile.y, tile.width, tile.height);
        ctx.clip();
        ctx.drawImage(
          this.renderer.domElement,
          tile.left,
          tile.top,
          tile.renderWidth / tile.scale,
          tile.renderHeight / tile.scale,
        );
        ctx.restore();
        onProgress(Math.round(((index + 1) / tiles.length) * 95));
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
      }
      const blob = await new Promise<Blob>((resolve, reject) =>
        output.toBlob(
          (b) =>
            b
              ? resolve(b)
              : reject(
                  new Error(
                    "PNG encoding failed. Choose a smaller resolution.",
                  ),
                ),
          "image/png",
        ),
      );
      onProgress(100);
      return blob;
    } finally {
      output.width = output.height = 1;
      this.scene.background = background;
      this.exporting = false;
      if (!this.disposed) {
        this.contact.setResolution(1024);
        this.shadowDirty = true;
        this.renderer.setPixelRatio(pixelRatio);
        this.resize(this.width, this.height);
        if (this.queuedProject) {
          const queued = this.queuedProject;
          this.queuedProject = null;
          this.update(queued);
        }
      }
    }
  }

  dispose() {
    this.disposed = true;
    this.models.forEach(disposeModel);
    this.models.clear();
    this.contact.dispose();
    this.environments.forEach((environment) => environment.dispose());
    this.environments.clear();
    this.pmrem.dispose();
    this.lighting.dispose();
    this.scene.traverse((o) => {
      if (o instanceof THREE.DirectionalLight) o.shadow.dispose();
    });
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
