import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  findModelResource,
  parseModelDocument,
  unpackGLB,
  validateImportedModels,
  type ImportedModel,
} from "../src/lib/imported-model.ts";
import {
  loadCustomModel,
  disposeObjects,
  setSurfaceMaterial,
} from "../src/lib/custom-models.ts";
import {
  newCustomDevice,
  DEFAULT_PROJECT,
  validateProject,
  upgradeProject,
  applyPreset,
} from "../src/lib/studio.ts";
import { modelFixture, packGLB } from "./model-fixture.ts";

// Node's fetch lacks the browser ProgressEvent used by Three's FileLoader.
if (!globalThis.ProgressEvent)
  Object.assign(globalThis, {
    ProgressEvent: class extends Event {
      constructor(type: string, init: object) {
        super(type);
        Object.assign(this, init);
      }
    },
  });
const fixture = () =>
  ({
    id: "local-model",
    name: "Local Display",
    format: "GLB",
    document: JSON.stringify(modelFixture().json),
    surfaces: [{ id: "1:0", name: "Screen", aspect: 14 / 9, hasUV: true }],
    bytes: 40000,
  }) satisfies ImportedModel;

test("local resources resolve folders, URL encoding, and unambiguous flat selections", () => {
  assert.equal(
    findModelResource(
      "../textures/screen%20one.png",
      "Device/model/display.gltf",
      ["Device/textures/screen one.png"],
    ),
    "Device/textures/screen one.png",
  );
  assert.equal(
    findModelResource("textures/screen.png", "display.gltf", ["screen.png"]),
    "screen.png",
  );
  assert.throws(
    () =>
      findModelResource("screen.png", "display.gltf", [
        "a/screen.png",
        "b/screen.png",
      ]),
    /Several files/,
  );
  assert.throws(
    () => findModelResource("screen.png", "display.gltf", []),
    /Missing/,
  );
  for (const uri of [
    "https://example.com/a.png",
    "//example.com/a.png",
    "file:///a.png",
    "blob:abc",
    "data:image/svg+xml;base64,AAAA",
  ])
    assert.throws(() => findModelResource(uri, "display.gltf", []), /Remote/);
});
test("GLB containers check version, lengths, and required JSON before decoding", () => {
  const { json, binary } = modelFixture();
  const bytes = packGLB(json, binary);
  const buffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  );
  assert.equal(JSON.parse(unpackGLB(buffer).document).asset.version, "2.0");
  assert.equal(unpackGLB(buffer).binary!.length, binary.length);
  assert.throws(() => unpackGLB(buffer.slice(0, -4)), /valid GLB/);
  assert.throws(() => unpackGLB(new ArrayBuffer(4)), /valid GLB/);
});
test("portable project validation rejects missing model refs, invalid bindings, and external resources", () => {
  const model = fixture(),
    device = newCustomDevice(model);
  const project = {
    ...structuredClone(DEFAULT_PROJECT),
    models: [model],
    devices: [
      device,
      { ...device, id: "copy", screenSurface: "1:0", screenRotation: 90 },
    ],
  };
  assert.equal(validateProject(project), true);
  assert.deepEqual(
    upgradeProject(JSON.parse(JSON.stringify(project))),
    project,
  );
  assert.deepEqual(applyPreset(project, "hero").models, [model]);
  assert.equal(validateProject({ ...project, models: [] }), false);
  for (const patch of [
    { screenSurface: "missing" },
    { screenAspect: 0 },
    { screenRotation: 32 },
    { screenFlipY: "yes" },
  ])
    assert.equal(
      validateProject({ ...project, devices: [{ ...device, ...patch }] }),
      false,
    );
  assert.equal(validateImportedModels([model, model]), false);
  for (const uri of [
    "https://example.com/image.png",
    "blob:stale",
    "data:image/svg+xml;base64,AAAA",
  ]) {
    const json = JSON.parse(model.document);
    json.images = [{ uri }];
    assert.throws(
      () => parseModelDocument(JSON.stringify(json)),
      /external resource/,
    );
    assert.equal(
      validateImportedModels([{ ...model, document: JSON.stringify(json) }]),
      false,
    );
  }
});
test("imported meshes are centered and scaled with original materials, UV ratios, and independent screen slots", async () => {
  const [first, second] = await Promise.all([
    loadCustomModel(fixture()),
    loadCustomModel(fixture()),
  ]);
  try {
    const box = new THREE.Box3().setFromObject(first.group, true),
      size = box.getSize(new THREE.Vector3());
    assert.ok(box.getCenter(new THREE.Vector3()).length() < 1e-6);
    assert.ok(Math.abs(Math.max(size.x, size.y, size.z) - 4) < 1e-6);
    const a = first.slots.find((s) => s.info.name.startsWith("Screen"))!,
      b = second.slots.find((s) => s.info.name.startsWith("Screen"))!;
    assert.equal(a.info.hasUV, true);
    assert.ok(Math.abs(a.info.aspect - 14 / 9) < 1e-6);
    const device = newCustomDevice(fixture());
    const position = a.mesh.geometry.getAttribute("position"),
      uv = a.mesh.geometry.getAttribute("uv");
    for (let i = 0; i < position.count; i++) {
      assert.equal(
        device.screenFlipX ? 1 - uv.getX(i) : uv.getX(i),
        position.getX(i) < 0 ? 0 : 1,
      );
      assert.equal(
        device.screenFlipY ? 1 - uv.getY(i) : uv.getY(i),
        position.getY(i) > 0 ? 0 : 1,
      );
    }
    const image = new THREE.MeshBasicMaterial({ color: "red" });
    setSurfaceMaterial(a, image);
    assert.equal(a.mesh.material, image);
    assert.equal(b.mesh.material, b.original);
    assert.notEqual(a.original, b.original);
    setSurfaceMaterial(a, a.original);
    assert.equal(
      (a.original as THREE.MeshStandardMaterial).color.getHex(),
      new THREE.Color().setRGB(0.05, 0.22, 0.17).getHex(),
    );
    image.dispose();
  } finally {
    disposeObjects(first.resources);
    disposeObjects(second.resources);
  }
});
