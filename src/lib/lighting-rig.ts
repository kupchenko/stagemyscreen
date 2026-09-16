import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { lightingPreset, type SceneLighting } from "./scene-lighting.ts";

function tint(color: string, warmth: number) {
  const filter = new THREE.Color("#ffffff").lerp(
    new THREE.Color(warmth >= 0 ? "#ffb56d" : "#86baff"),
    (Math.abs(warmth) / 100) * 0.75,
  );
  return new THREE.Color(color).multiply(filter);
}

/** Reused lights keep switching presets independent of model or screenshot loading. */
export class LightingRig {
  group = new THREE.Group();
  ambient = new THREE.AmbientLight();
  key = new THREE.DirectionalLight();
  fill = new THREE.DirectionalLight();
  rim = new THREE.DirectionalLight();
  constructor() {
    this.group.name = "Scene lighting";
    this.group.add(this.ambient, this.key, this.fill, this.rim);
  }
  apply(scene: THREE.Scene, settings: SceneLighting) {
    const preset = lightingPreset(settings.mode);
    const brightness = settings.brightness / 100;
    for (const name of ["key", "fill", "rim"] as const) {
      const source = preset[name];
      this[name].color.copy(tint(source.color, settings.warmth));
      this[name].intensity = source.intensity * brightness;
      this[name].position.set(...source.position);
    }
    this.ambient.color.copy(tint(preset.environmentTint, settings.warmth));
    this.ambient.intensity = preset.ambient * brightness;
    this.group.rotation.y = THREE.MathUtils.degToRad(settings.direction);
    scene.environmentIntensity =
      (preset.environment * brightness * settings.reflections) / 100;
    scene.environmentRotation.y = THREE.MathUtils.degToRad(
      preset.environmentRotation + settings.direction,
    );
    return preset.exposure;
  }
  dispose() {
    for (const light of [this.key, this.fill, this.rim]) light.dispose();
    this.group.removeFromParent();
  }
}

/** The reflection studio follows the preset as well as the direct lights. */
export function createLightingEnvironment(settings: SceneLighting) {
  const room = new RoomEnvironment();
  // Preserve the original scene appearance for existing projects.
  if (settings.mode === "soft-studio" && settings.warmth === 0) return room;
  const preset = lightingPreset(settings.mode);
  room.traverse((object) => {
    if (object instanceof THREE.PointLight) {
      object.color.copy(tint(preset.environmentTint, settings.warmth));
      object.intensity *= Math.max(0.15, preset.ambient / 0.35);
    }
    if (!(object instanceof THREE.Mesh)) return;
    const material = object.material;
    if (material instanceof THREE.MeshLambertMaterial) {
      const source =
        object.position.z < -5
          ? preset.rim
          : object.position.x > 5
            ? preset.fill
            : preset.key;
      material.emissive.copy(tint(source.color, settings.warmth));
      material.emissiveIntensity *= Math.max(0.08, source.intensity / 2.6);
    } else if (material instanceof THREE.MeshStandardMaterial) {
      material.color.copy(tint(preset.environmentTint, settings.warmth));
    }
  });
  return room;
}
