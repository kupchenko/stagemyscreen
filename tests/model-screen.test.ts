import test from "node:test";
import assert from "node:assert/strict";
import { automaticScreen } from "../src/lib/model-screen.ts";
import type { ImportedModel, ModelSurface } from "../src/lib/imported-model.ts";
import {
  DEFAULT_PROJECT,
  newCustomDevice,
  upgradeProject,
  validateProject,
} from "../src/lib/studio.ts";

const surface = (id: string, name: string, hasUV = true): ModelSurface => ({
  id,
  name,
  hasUV,
  aspect: 4 / 3,
});
function asset(
  surfaces: ModelSurface[],
  document = {},
  format: ImportedModel["format"] = "GLB",
): ImportedModel {
  return {
    id: "model",
    name: "Imported device",
    format,
    bytes: 1000,
    surfaces,
    document: JSON.stringify({
      asset: { version: "2.0" },
      scenes: [],
      ...document,
    }),
  };
}

test("Apple iPad and iPhone screen meshes are selected instead of hardware parts", () => {
  for (const name of ["wPdYmPhFqWNsgiI", "eXcdWRctfHqyWLU"]) {
    const model = asset(
      [surface("10:0", "pUEXwCmVrelMaEF"), surface("18:0", name)],
      {},
      "USDZ",
    );
    const device = newCustomDevice(model);
    assert.equal(device.screenSurface, "18:0");
    assert.equal(device.screenAspect, 4 / 3);
    assert.equal(device.screenSelection, "auto");
    assert.equal(device.screenFlipY, true);
  }
});

test("obfuscated names are detected from the display's emissive texture", () => {
  const model = asset([surface("0:0", "abc"), surface("1:0", "xyz")], {
    nodes: [
      { name: "abc", mesh: 0 },
      { name: "xyz", mesh: 1 },
    ],
    meshes: [
      { primitives: [{ material: 0 }] },
      { primitives: [{ material: 1 }] },
    ],
    materials: [
      {},
      { emissiveTexture: { index: 0 }, emissiveFactor: [1, 1, 1] },
    ],
  });
  assert.equal(automaticScreen(model)?.id, "1:0");
  // Texture metadata alone doesn't make a surface emissive.
  const dark = JSON.parse(model.document);
  dark.materials[1].emissiveFactor = [0, 0, 0];
  assert.equal(
    automaticScreen({ ...model, document: JSON.stringify(dark) }),
    undefined,
  );
});

test("named screens work while ambiguous, UV-less, and non-screen models require an override", () => {
  assert.equal(
    automaticScreen(
      asset([surface("0:0", "DisplayStand"), surface("1:0", "Screen · Glass")]),
    )?.id,
    "1:0",
  );
  for (const surfaces of [
    [surface("0:0", "Screen", false)],
    [surface("0:0", "Screen"), surface("1:0", "Display")],
    [surface("0:0", "Enclosure"), surface("1:0", "Camera")],
  ])
    assert.equal(automaticScreen(asset(surfaces)), undefined);
});

test("migration corrects legacy iPad selections without changing composition or screenshots", () => {
  const model = asset(
    [surface("10:0", "pUEXwCmVrelMaEF"), surface("18:0", "wPdYmPhFqWNsgiI")],
    {},
    "USDZ",
  );
  const legacy = {
    ...newCustomDevice(model),
    screenSelection: undefined,
    screenSurface: "10:0",
    screenAspect: 1,
    screenRotation: 180,
    x: 3,
    y: 2,
    screenshot: "/screens/analytics.svg",
  };
  const project = {
    ...structuredClone(DEFAULT_PROJECT),
    models: [model],
    devices: [legacy],
  };
  const upgraded = upgradeProject(project);
  assert.equal(upgraded.devices[0].screenSurface, "18:0");
  assert.equal(upgraded.devices[0].screenRotation, 0);
  assert.equal(upgraded.devices[0].screenshot, legacy.screenshot);
  assert.equal(upgraded.devices[0].x, 3);
  assert.equal(upgraded.devices[0].y, 2);
  assert.equal(validateProject(upgraded), true);
  assert.deepEqual(upgradeProject(upgraded), upgraded);
});

test("manual surface and original-material overrides survive saving and reloading", () => {
  const model = asset([surface("0:0", "Case"), surface("1:0", "Screen")]);
  for (const screenSurface of ["0:0", ""]) {
    const device = {
      ...newCustomDevice(model),
      screenSelection: "manual" as const,
      screenSurface,
      screenRotation: 90,
      screenFlipX: true,
    };
    const project = {
      ...structuredClone(DEFAULT_PROJECT),
      models: [model],
      devices: [device],
    };
    const reloaded = JSON.parse(JSON.stringify(project));
    assert.equal(validateProject(reloaded), true);
    assert.deepEqual(upgradeProject(reloaded), project);
  }
  const project = {
    ...structuredClone(DEFAULT_PROJECT),
    models: [model],
    devices: [{ ...newCustomDevice(model), screenSelection: "invalid" }],
  };
  assert.equal(validateProject(project), false);
});
