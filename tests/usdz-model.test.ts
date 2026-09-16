import test from "node:test";
import assert from "node:assert/strict";
import { zipSync, strToU8 } from "three/addons/libs/fflate.module.js";
import { convertUSDZ, validateUSDZ } from "../src/lib/usdz-model.ts";
import {
  importModelFiles,
  loadCustomModel,
  disposeObjects,
} from "../src/lib/custom-models.ts";
import {
  validateImportedModels,
  MODEL_SIZE_LIMIT,
} from "../src/lib/imported-model.ts";
import { newCustomDevice } from "../src/lib/studio.ts";

// Only FileReader and ProgressEvent need browser shims for untextured models.
if (!globalThis.FileReader)
  Object.assign(globalThis, {
    FileReader: class {
      result: string | ArrayBuffer | null = null;
      onload: (() => void) | null = null;
      onloadend: (() => void) | null = null;
      async readAsArrayBuffer(blob: Blob) {
        this.result = await blob.arrayBuffer();
        this.onload?.();
        this.onloadend?.();
      }
      async readAsDataURL(blob: Blob) {
        this.result = `data:${blob.type || "application/octet-stream"};base64,${Buffer.from(await blob.arrayBuffer()).toString("base64")}`;
        this.onload?.();
        this.onloadend?.();
      }
    },
    ProgressEvent: class extends Event {},
  });

const scene = `#usda 1.0
(
    defaultPrim = "Device"
    metersPerUnit = 1
    upAxis = "Y"
)
def Xform "Device"
{
    def Mesh "Screen"
    {
        int[] faceVertexCounts = [4]
        int[] faceVertexIndices = [0, 1, 2, 3]
        point3f[] points = [(-1, -2, 0), (1, -2, 0), (1, 2, 0), (-1, 2, 0)]
        texCoord2f[] primvars:st = [(0, 0), (1, 0), (1, 1), (0, 1)] (
            interpolation = "vertex"
        )
        uniform token subdivisionScheme = "none"
        rel material:binding = </Device/Aluminum>
    }
    def Material "Aluminum"
    {
        token outputs:surface.connect = </Device/Aluminum/PreviewSurface.outputs:surface>
        def Shader "PreviewSurface"
        {
            uniform token info:id = "UsdPreviewSurface"
            color3f inputs:diffuseColor = (0.1, 0.3, 0.5)
            float inputs:metallic = 0.7
            float inputs:roughness = 0.25
            token outputs:surface
        }
    }
}
`;
function archive(
  files: Record<string, Uint8Array> = { "device.usda": strToU8(scene) },
) {
  const data = zipSync(files, { level: 0 });
  return data.buffer.slice(
    data.byteOffset,
    data.byteOffset + data.byteLength,
  ) as ArrayBuffer;
}

test("USDZ converts ASCII geometry, UVs and PBR materials into a portable imported model", async () => {
  const asset = await importModelFiles([
    new File([archive()], "Local Screen.usdz"),
  ]);
  assert.equal(asset.format, "USDZ");
  assert.equal(asset.name, "Local Screen");
  assert.equal(validateImportedModels([asset]), true);
  const json = JSON.parse(asset.document);
  const material = json.materials[0].pbrMetallicRoughness;
  [0.1, 0.3, 0.5, 1].forEach((value, i) =>
    assert.ok(Math.abs(material.baseColorFactor[i] - value) < 1e-5),
  );
  assert.equal(material.metallicFactor, 0.7);
  assert.equal(material.roughnessFactor, 0.25);
  assert.match(json.buffers[0].uri, /^data:application\/octet-stream;base64,/);
  assert.equal(asset.surfaces.length, 1);
  assert.equal(asset.surfaces[0].hasUV, true);
  assert.equal(asset.surfaces[0].aspect, 0.5);
  const reloaded = await loadCustomModel(JSON.parse(JSON.stringify(asset)));
  assert.equal(reloaded.slots[0].info.id, asset.surfaces[0].id);
  disposeObjects(reloaded.resources);
});

test("USDZ screenshot defaults place every image corner upright without mirroring", async () => {
  const asset = await importModelFiles([new File([archive()], "Screen.usdz")]);
  const device = newCustomDevice(asset);
  const runtime = await loadCustomModel(asset);
  try {
    assert.equal(device.screenRotation, 0);
    const geometry = runtime.slots[0].mesh.geometry;
    const position = geometry.getAttribute("position"),
      uv = geometry.getAttribute("uv");
    for (let i = 0; i < position.count; i++) {
      // With CanvasTexture.flipY=false, UVs sample from the canvas top edge.
      // A canvas flip reverses which source-image pixel lands at each UV.
      const imageX = device.screenFlipX ? 1 - uv.getX(i) : uv.getX(i);
      const imageY = device.screenFlipY ? 1 - uv.getY(i) : uv.getY(i);
      assert.equal(imageX, position.getX(i) < 0 ? 0 : 1);
      assert.equal(imageY, position.getY(i) > 0 ? 0 : 1);
    }
  } finally {
    disposeObjects(runtime.resources);
  }
});

test("USDZ rejects incomplete, nested, and oversized archives before scene decoding", () => {
  assert.throws(() => validateUSDZ(new ArrayBuffer(4)), /valid USDZ/);
  assert.throws(() => validateUSDZ(archive().slice(0, -10)), /incomplete/);
  assert.throws(
    () => validateUSDZ(archive({ "readme.txt": strToU8("hello") })),
    /scene layer/,
  );
  assert.throws(
    () => validateUSDZ(archive({ "nested/device.usda": strToU8(scene) })),
    /nested scene/,
  );
  assert.throws(
    () =>
      validateUSDZ(
        archive({
          "device.usda": strToU8(scene),
          "other.usda": strToU8(scene),
        }),
      ),
    /nested scene/,
  );
  // An exaggerated ZIP directory size is rejected without allocating that size.
  const data = archive(),
    view = new DataView(data);
  for (let offset = 0; offset < data.byteLength - 4; offset++)
    if (view.getUint32(offset, true) === 0x02014b50) {
      view.setUint32(offset + 24, MODEL_SIZE_LIMIT + 1, true);
      break;
    }
  assert.throws(() => validateUSDZ(data), /USDZ contents/);
});

test("USDZ missing and remote textures fail without starting a network request", async () => {
  for (const path of ["missing.png", "https://example.com/private.png"]) {
    const textured = scene
      .replace(
        "color3f inputs:diffuseColor = (0.1, 0.3, 0.5)",
        "color3f inputs:diffuseColor.connect = </Device/Aluminum/Image.outputs:rgb>",
      )
      .replace(
        '    def Material "Aluminum"\n    {',
        `    def Material "Aluminum"\n    {\n        def Shader "Image"\n        {\n            uniform token info:id = "UsdUVTexture"\n            asset inputs:file = @${path}@\n            float3 outputs:rgb\n        }`,
      );
    await assert.rejects(
      convertUSDZ(archive({ "device.usda": strToU8(textured) })),
      /texture is missing/,
    );
  }
});
