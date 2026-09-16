export interface ModelSurface {
  id: string;
  name: string;
  aspect: number;
  hasUV: boolean;
}
export interface ImportedModel {
  id: string;
  name: string;
  format: "GLB" | "glTF" | "USDZ";
  // A self-contained glTF document. All buffers and textures are embedded.
  document: string;
  surfaces: ModelSurface[];
  bytes: number;
}

export function defaultScreenOrientation(model: Pick<ImportedModel, "format">) {
  // USD conversion retains bottom-origin UVs, while the glTF exporter flips
  // the original texture pixels. Replacement screenshots need the same flip.
  return {
    screenRotation: 0,
    screenFlipX: false,
    screenFlipY: model.format === "USDZ",
  };
}
export const MODEL_SIZE_LIMIT = 64 * 1024 * 1024;
export const MODEL_LIBRARY_LIMIT = 96 * 1024 * 1024;
export const isModelDataURI = (value: string) =>
  /^data:(?:application\/(?:octet-stream|gltf-buffer)|image\/(?:png|jpeg|webp));base64,[A-Za-z0-9+/]*={0,2}$/.test(
    value,
  );

export function parseModelDocument(document: string) {
  const json = JSON.parse(document);
  if (json?.asset?.version !== "2.0" || !Array.isArray(json.scenes))
    throw new Error("Use a glTF 2.0 model with a scene.");
  // Check every URI, including extension resources, before any loader runs.
  const visit = (value: unknown) => {
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) {
      if (
        key === "uri" &&
        (typeof child !== "string" || !isModelDataURI(child))
      )
        throw new Error(
          "The model has a missing or external resource. Include its local textures and .bin files.",
        );
      visit(child);
    }
  };
  visit(json);
  if (json.extensionsRequired?.includes("KHR_texture_basisu"))
    throw new Error(
      "This model uses KTX2 textures. Export it with PNG or JPEG textures and try again.",
    );
  return json;
}

export function validateImportedModels(
  value: unknown,
): value is ImportedModel[] {
  if (!Array.isArray(value) || value.length > 30) return false;
  let total = 0;
  const ids = new Set<string>();
  try {
    return value.every((m) => {
      if (
        !m ||
        typeof m.id !== "string" ||
        !m.id ||
        ids.has(m.id) ||
        typeof m.name !== "string" ||
        m.name.length > 100 ||
        !["GLB", "glTF", "USDZ"].includes(m.format) ||
        typeof m.document !== "string" ||
        !Number.isFinite(m.bytes) ||
        m.bytes <= 0 ||
        m.bytes > MODEL_SIZE_LIMIT ||
        !Array.isArray(m.surfaces) ||
        m.surfaces.length > 2000
      )
        return false;
      ids.add(m.id);
      total += m.document.length;
      if (total > MODEL_LIBRARY_LIMIT) return false;
      parseModelDocument(m.document);
      const surfaces = new Set<string>();
      return m.surfaces.every((s: ModelSurface) => {
        if (
          !s ||
          typeof s.id !== "string" ||
          surfaces.has(s.id) ||
          typeof s.name !== "string" ||
          s.name.length > 200 ||
          typeof s.hasUV !== "boolean" ||
          !Number.isFinite(s.aspect) ||
          s.aspect < 0.05 ||
          s.aspect > 20
        )
          return false;
        surfaces.add(s.id);
        return true;
      });
    });
  } catch {
    return false;
  }
}

export function validateModelBinding(
  d: {
    modelId?: string;
    screenSurface?: string;
    screenSelection?: "auto" | "manual";
    screenAspect?: number;
    screenRotation?: number;
    screenFlipX?: boolean;
    screenFlipY?: boolean;
  },
  models: ImportedModel[],
) {
  const model = models.find((m) => m.id === d.modelId);
  return (
    !!model &&
    (d.screenSelection === undefined ||
      ["auto", "manual"].includes(d.screenSelection)) &&
    (d.screenSurface === undefined ||
      d.screenSurface === "" ||
      model.surfaces.some((s) => s.id === d.screenSurface && s.hasUV)) &&
    (d.screenAspect === undefined ||
      (Number.isFinite(d.screenAspect) &&
        d.screenAspect >= 0.05 &&
        d.screenAspect <= 20)) &&
    (d.screenRotation === undefined ||
      [0, 90, 180, 270].includes(d.screenRotation)) &&
    (d.screenFlipX === undefined || typeof d.screenFlipX === "boolean") &&
    (d.screenFlipY === undefined || typeof d.screenFlipY === "boolean")
  );
}

function normalizedPath(path: string) {
  const parts: string[] = [];
  for (const part of path.replaceAll("\\", "/").split("/")) {
    if (part === "..") parts.pop();
    else if (part && part !== ".") parts.push(part);
  }
  return parts.join("/");
}
export function findModelResource(uri: string, entry: string, paths: string[]) {
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(uri))
    throw new Error(
      "Remote resources aren’t imported. Select the model’s local textures and .bin files.",
    );
  let decoded: string;
  try {
    decoded = decodeURIComponent(uri);
  } catch {
    throw new Error(`Invalid resource path: ${uri}`);
  }
  const exact = normalizedPath(
    `${entry.slice(0, entry.lastIndexOf("/") + 1)}${decoded}`,
  );
  const match = paths.find((p) => normalizedPath(p) === exact);
  if (match) return match;
  const basename = normalizedPath(decoded).split("/").pop();
  const candidates = paths.filter((p) => p.split("/").pop() === basename);
  if (candidates.length === 1) return candidates[0];
  throw new Error(
    candidates.length
      ? `Several files are named “${basename}”. Choose the model folder to preserve their paths.`
      : `Missing “${decoded}”. Select it together with the .gltf file, or choose the model folder.`,
  );
}

export function unpackGLB(buffer: ArrayBuffer): {
  document: string;
  binary?: Uint8Array;
} {
  const view = new DataView(buffer);
  if (
    buffer.byteLength < 20 ||
    view.getUint32(0, true) !== 0x46546c67 ||
    view.getUint32(4, true) !== 2 ||
    view.getUint32(8, true) !== buffer.byteLength
  )
    throw new Error("This isn’t a valid GLB 2.0 file.");
  let document = "";
  let binary: Uint8Array | undefined;
  for (let offset = 12; offset < buffer.byteLength;) {
    if (offset + 8 > buffer.byteLength)
      throw new Error("The GLB file is incomplete.");
    const size = view.getUint32(offset, true),
      type = view.getUint32(offset + 4, true);
    offset += 8;
    if (offset + size > buffer.byteLength || size % 4)
      throw new Error("The GLB file is incomplete.");
    const chunk = new Uint8Array(buffer, offset, size);
    if (type === 0x4e4f534a) document = new TextDecoder().decode(chunk);
    if (type === 0x004e4942) binary = chunk;
    offset += size;
  }
  if (!document)
    throw new Error("The GLB file is missing its scene description.");
  return { document, binary };
}
