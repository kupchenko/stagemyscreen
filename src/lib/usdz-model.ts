import * as THREE from "three";
import { USDLoader } from "three/addons/loaders/USDLoader.js";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { unzipSync } from "three/addons/libs/fflate.module.js";
import { MODEL_SIZE_LIMIT } from "./imported-model.ts";
import { disposeObjects } from "./model-resources.ts";

export function validateUSDZ(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  if (bytes.length > MODEL_SIZE_LIMIT)
    throw new Error("Choose a USDZ file of 64 MB or less.");
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b)
    throw new Error("This isn’t a valid USDZ archive.");
  const names: string[] = [];
  let expanded = 0;
  try {
    // Inspect the ZIP directory without allocating or inflating file contents.
    unzipSync(bytes, {
      filter: (file) => {
        names.push(file.name);
        expanded += file.originalSize;
        if (names.length > 200 || expanded > MODEL_SIZE_LIMIT)
          throw new Error("USDZ contents must fit within 64 MB and 200 files.");
        return false;
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("USDZ contents"))
      throw error;
    throw new Error("The USDZ archive is incomplete or invalid.");
  }
  if (!names.length || !/\.(usd|usda|usdc)$/i.test(names[0]))
    throw new Error("The USDZ archive must begin with its USD scene layer.");
  // A root-level, flattened layer keeps every texture inside the archive.
  // USDLoader currently resolves nested layers differently and does not await
  // their textures. Reject these instead of saving incomplete materials.
  if (
    names[0].includes("/") ||
    names[0].includes("\\") ||
    names.filter((name) => /\.(usd|usda|usdc)$/i.test(name)).length !== 1
  )
    throw new Error(
      "This USDZ uses nested scene layers. Flatten the USD scene before packaging it, or export it as GLB.",
    );
  if (new Set(names).size !== names.length)
    throw new Error("The USDZ archive contains duplicate file names.");
}

export async function convertUSDZ(buffer: ArrayBuffer): Promise<string> {
  validateUSDZ(buffer);
  const manager = new THREE.LoadingManager();
  manager.setURLModifier(() => {
    throw new Error(
      "A USDZ texture is missing or unsupported. Include PNG, JPEG, or AVIF textures inside the USDZ file.",
    );
  });
  let root: THREE.Group | undefined;
  try {
    await new Promise<void>((resolve, reject) => {
      // parse returns geometry immediately; the callback waits for textures.
      root = new USDLoader(manager).parse(buffer, "", () => resolve(), reject);
    });
    if (!root) throw new Error("The USDZ file has no scene.");
    let vertices = 0,
      surfaces = 0;
    const corrected = new Set<THREE.Material>();
    const remove: THREE.Object3D[] = [];
    root.traverse((object) => {
      if (object instanceof THREE.Camera || object instanceof THREE.Light)
        remove.push(object);
      if (!(object instanceof THREE.Mesh)) return;
      vertices += object.geometry.getAttribute("position")?.count || 0;
      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];
      surfaces += materials.length;
      for (const material of materials) {
        // Three r186 decodes USD base/emissive constants as sRGB. USD's
        // default is linear Rec.709; undo that extra gamma conversion.
        // Texture color spaces are independent and must stay unchanged.
        if (
          material instanceof THREE.MeshStandardMaterial &&
          !corrected.has(material)
        ) {
          material.color.convertLinearToSRGB();
          material.emissive.convertLinearToSRGB();
          corrected.add(material);
        }
        for (const value of Object.values(material))
          if (value instanceof THREE.Texture && !value.image?.width)
            throw new Error(
              "A USDZ texture could not be decoded. Re-export the model with PNG or JPEG textures.",
            );
      }
    });
    if (!vertices || vertices > 5000000 || surfaces > 2000)
      throw new Error(
        "Use a USDZ with visible geometry, fewer than 5 million vertices, and no more than 2,000 surfaces.",
      );
    remove.forEach((object) => object.removeFromParent());
    const document = await new GLTFExporter().parseAsync(root, {
      binary: false,
      onlyVisible: true,
      maxTextureSize: 8192,
    });
    return JSON.stringify(document);
  } finally {
    if (root) disposeObjects([root]);
  }
}
