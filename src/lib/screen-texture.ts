import * as THREE from "three";
import type { Fit } from "./studio.ts";

/** Map screen UVs directly into the original image, without rasterizing copies. */
export function screenTextureMatrix(
  width: number,
  height: number,
  ratio: number,
  fit: Fit,
  rotation = 0,
  flipX = false,
  flipY = false,
) {
  const quarter = rotation % 180 !== 0;
  const rotatedWidth = quarter ? height : width;
  const rotatedHeight = quarter ? width : height;
  const scale = (fit === "contain" ? Math.min : Math.max)(
    ratio / rotatedWidth,
    1 / rotatedHeight,
  );
  const x =
    (fit === "stretch" ? rotatedWidth : ratio / scale) * (flipX ? -1 : 1);
  const y = (fit === "stretch" ? rotatedHeight : 1 / scale) * (flipY ? -1 : 1);
  const angle = THREE.MathUtils.degToRad(rotation);
  const a = (Math.cos(angle) * x) / width;
  const b = (Math.sin(angle) * y) / width;
  const c = (-Math.sin(angle) * x) / height;
  const d = (Math.cos(angle) * y) / height;
  return new THREE.Matrix3().set(
    a,
    b,
    0.5 - (a + b) / 2,
    c,
    d,
    0.5 - (c + d) / 2,
    0,
    0,
    1,
  );
}

export function configureScreenMaterial(
  material: THREE.MeshBasicMaterial,
  contain: boolean,
) {
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <map_fragment>",
      `#ifdef USE_MAP
        vec4 screenPixel = texture2D(map, vMapUv);
        ${contain ? "if (any(lessThan(vMapUv, vec2(0.0))) || any(greaterThan(vMapUv, vec2(1.0)))) screenPixel = vec4(0.0);" : ""}
        // Composite transparent screenshots and letterboxes over the display.
        diffuseColor.rgb *= mix(vec3(0.00518152, 0.00560539, 0.00699541), screenPixel.rgb, screenPixel.a);
      #endif`,
    );
  };
  material.customProgramCacheKey = () => `native-screen-${contain}`;
  material.needsUpdate = true;
}
