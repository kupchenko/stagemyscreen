import * as THREE from "three";
import { HorizontalBlurShader } from "three/addons/shaders/HorizontalBlurShader.js";
import { VerticalBlurShader } from "three/addons/shaders/VerticalBlurShader.js";
import { FullScreenQuad } from "three/addons/postprocessing/Pass.js";

/** A height-weighted, blurred orthographic contact shadow with a true alpha channel. */
export class ContactShadow {
  softness = 50;
  private target = new THREE.WebGLRenderTarget(1024, 1024);
  private buffer = new THREE.WebGLRenderTarget(1024, 1024);
  private camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0, 5);
  private depth = new THREE.MeshDepthMaterial({
    depthPacking: THREE.BasicDepthPacking,
    side: THREE.DoubleSide,
    blending: THREE.NoBlending,
  });
  private horizontal = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.clone(HorizontalBlurShader.uniforms),
    vertexShader: HorizontalBlurShader.vertexShader,
    fragmentShader: HorizontalBlurShader.fragmentShader,
    depthTest: false,
    depthWrite: false,
  });
  private vertical = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.clone(VerticalBlurShader.uniforms),
    vertexShader: VerticalBlurShader.vertexShader,
    fragmentShader: VerticalBlurShader.fragmentShader,
    depthTest: false,
    depthWrite: false,
  });
  private quad = new FullScreenQuad(this.horizontal);
  mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 20),
    new THREE.MeshBasicMaterial({
      map: this.target.texture,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    }),
  );
  constructor() {
    this.camera.rotation.x = Math.PI / 2;
    this.mesh.rotation.x = Math.PI / 2;
    this.mesh.position.y = -2.4;
    this.depth.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        "gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );",
        "gl_FragColor = vec4( vec3(0.0), pow(1.0 - fragCoordZ, 2.0) );",
      );
    };
  }
  setResolution(size: number) {
    if (this.target.width === size) return;
    this.target.setSize(size, size);
    this.buffer.setSize(size, size);
  }
  update(renderer: THREE.WebGLRenderer, scene: THREE.Scene) {
    const previous = {
      target: renderer.getRenderTarget(),
      background: scene.background,
      override: scene.overrideMaterial,
      alpha: renderer.getClearAlpha(),
      color: renderer.getClearColor(new THREE.Color()),
    };
    this.camera.position.set(0, this.mesh.position.y, 0);
    this.mesh.visible = false;
    try {
      scene.background = null;
      scene.overrideMaterial = this.depth;
      renderer.setClearColor(0x000000, 0);
      renderer.setRenderTarget(this.target);
      renderer.clear();
      renderer.render(scene, this.camera);
      // Keep the blur radius in world space when the export shadow map is larger.
      for (let i = 0; i < 3; i++) {
        this.horizontal.uniforms.tDiffuse.value = this.target.texture;
        this.horizontal.uniforms.h.value = (this.softness * 0.07) / 1024;
        this.quad.material = this.horizontal;
        renderer.setRenderTarget(this.buffer);
        renderer.clear();
        this.quad.render(renderer);
        this.vertical.uniforms.tDiffuse.value = this.buffer.texture;
        this.vertical.uniforms.v.value = (this.softness * 0.07) / 1024;
        this.quad.material = this.vertical;
        renderer.setRenderTarget(this.target);
        renderer.clear();
        this.quad.render(renderer);
      }
    } finally {
      scene.background = previous.background;
      scene.overrideMaterial = previous.override;
      renderer.setRenderTarget(previous.target);
      renderer.setClearColor(previous.color, previous.alpha);
      this.mesh.visible = true;
    }
  }
  dispose() {
    this.target.dispose();
    this.buffer.dispose();
    this.depth.dispose();
    this.horizontal.dispose();
    this.vertical.dispose();
    this.quad.dispose();
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
