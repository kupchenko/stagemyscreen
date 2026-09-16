import type { ImportedModel, ModelSurface } from "./imported-model.ts";

interface Material {
  name?: string;
  emissiveTexture?: { index: number };
  emissiveFactor?: number[];
}
interface Mesh {
  name?: string;
  primitives?: { material?: number }[];
}
interface Document {
  nodes?: { name?: string; mesh?: number }[];
  meshes?: Mesh[];
  materials?: Material[];
}

const cache = new WeakMap<ImportedModel, ModelSurface | null>();
// Verified screen meshes in Apple's public iPad Pro Silver and iPhone 17 USDZs.
const appleScreens = new Set(["wPdYmPhFqWNsgiI", "eXcdWRctfHqyWLU"]);
const normalizedName = (name: string) =>
  name.replace(/\s/g, "_").replace(/[\[\]\.:/]/g, "");

function nameScore(name: string) {
  const words = name.replace(/([a-z])([A-Z])/g, "$1 $2");
  if (
    /(?:^|[\s_.-])(?:bezel|frame|body|case|stand|keyboard|logo|camera|led|light)(?:$|[\s_.-])/i.test(
      words,
    )
  )
    return 0;
  return /(?:^|[\s_.-])(?:screen|display|lcd|oled)(?:$|[\s_.-]|\d)/i.test(words)
    ? 80
    : 0;
}

/** Select only an unambiguous display. Never default to the first model part. */
export function automaticScreen(
  model: ImportedModel,
): ModelSurface | undefined {
  if (cache.has(model)) return cache.get(model) || undefined;
  const evidence = new Map<string, number>();
  try {
    const document: Document = JSON.parse(model.document);
    const addMesh = (name: string, mesh: Mesh) => {
      // A multi-primitive mesh can contain both the case and the screen. Its
      // material names are handled separately; don't treat the whole group as a screen.
      if (mesh.primitives?.length !== 1) return;
      const material = document.materials?.[mesh.primitives[0].material ?? -1];
      const emission =
        material?.emissiveTexture && material.emissiveFactor?.some((v) => v > 0)
          ? 100
          : 0;
      const score =
        Math.max(nameScore(name), nameScore(material?.name || "")) + emission;
      const key = normalizedName(name);
      evidence.set(key, Math.max(evidence.get(key) || 0, score));
    };
    document.meshes?.forEach((mesh, index) =>
      addMesh(mesh.name || `mesh_${index}`, mesh),
    );
    document.nodes?.forEach((node) => {
      const mesh = document.meshes?.[node.mesh ?? -1];
      if (node.name && mesh) addMesh(node.name, mesh);
    });
    document.materials?.forEach((material) => {
      if (!material.name) return;
      const emission =
        material.emissiveTexture && material.emissiveFactor?.some((v) => v > 0)
          ? 100
          : 0;
      evidence.set(material.name, nameScore(material.name) + emission);
    });
  } catch {
    // Named surfaces remain usable for older assets without material metadata.
  }
  const ranked = model.surfaces
    .filter((s) => s.hasUV)
    .map((surface) => {
      const [meshName, materialName = ""] = surface.name.split(" · ");
      const score =
        model.format === "USDZ" && appleScreens.has(meshName)
          ? 300
          : Math.max(
              nameScore(surface.name),
              evidence.get(normalizedName(meshName)) || 0,
              evidence.get(materialName) || 0,
            );
      return { surface, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);
  const selected =
    ranked[0] && ranked[0].score > (ranked[1]?.score || 0)
      ? ranked[0].surface
      : undefined;
  cache.set(model, selected || null);
  return selected;
}
