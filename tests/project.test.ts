import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_PROJECT,
  validateProject,
  applyPreset,
  aspect,
  newDevice,
  type Project,
} from "../src/lib/studio.ts";

test("a portable project round-trips without losing per-device images and transforms", () => {
  const project = structuredClone(DEFAULT_PROJECT);
  project.devices[0].screenshot = "data:image/png;base64,aGVsbG8=";
  project.devices[0].ry = 42;
  const restored = JSON.parse(JSON.stringify(project));
  assert.equal(validateProject(restored), true);
  assert.equal(restored.devices[0].screenshot, project.devices[0].screenshot);
  assert.equal(restored.devices[0].ry, 42);
  assert.notEqual(
    restored.devices[0].screenshot,
    restored.devices[1].screenshot,
  );
});
test("untrusted project files cannot load remote images, executable URLs, or SVG data", () => {
  for (const screenshot of [
    "https://tracker.invalid/image.png",
    "javascript:alert(1)",
    "data:image/svg+xml;base64,AAAA",
    "/untrusted.svg",
  ]) {
    const project = structuredClone(DEFAULT_PROJECT);
    project.devices[0].screenshot = screenshot;
    assert.equal(validateProject(project), false, screenshot);
  }
});
test("reject invalid or excessive scene data before rendering", () => {
  for (const mutate of [
    (p: Project) => (p.devices[0].scale = Infinity),
    (p: Project) => (p.devices[0].x = 21),
    (p: Project) => (p.devices[0].rx = NaN),
    (p: Project) => Object.assign(p.devices[0], { kind: "unknown" }),
    (p: Project) => p.devices.push(p.devices[0]),
    (p: Project) => Object.assign(p, { background: "url(remote)" }),
    (p: Project) => Object.assign(p, { ratio: "0:0" }),
    (p: Project) => (p.assets[0].src = "https://tracker.invalid"),
    (p: Project) => (p.devices = Array(31).fill(p.devices[0])),
  ]) {
    const project = structuredClone(DEFAULT_PROJECT);
    mutate(project);
    assert.equal(validateProject(project), false);
  }
  for (const invalid of [null, 42, {}, [], { version: 1 }])
    assert.equal(validateProject(invalid), false);
});
test("presets preserve compatible uploaded screenshots and generate independent devices", () => {
  const original = structuredClone(DEFAULT_PROJECT);
  original.devices.find((d) => d.kind === "phone")!.screenshot =
    "data:image/png;base64,aGVsbG8=";
  for (const preset of ["showcase", "duo", "floating", "hero"] as const) {
    const next = applyPreset(original, preset);
    assert.equal(validateProject(next), true);
    assert.ok(
      next.devices
        .filter((d) => d.kind === "phone")
        .every((d) => d.screenshot === "data:image/png;base64,aGVsbG8="),
    );
    assert.equal(
      new Set(next.devices.map((d) => d.id)).size,
      next.devices.length,
    );
    assert.equal(original.devices.length, 3);
  }
});
test("export aspect ratios calculate the correct landscape, square, and portrait sizes", () => {
  assert.equal(Math.round(3840 / aspect("16:9")), 2160);
  assert.equal(Math.round(3840 / aspect("4:3")), 2880);
  assert.equal(Math.round(3840 / aspect("1:1")), 3840);
  assert.equal(Math.round(1920 / aspect("9:16")), 3413);
});

test("the first layout restores the reference placement and keeps each screen and fit", () => {
  const original = structuredClone(DEFAULT_PROJECT);
  original.ratio = "1:1";
  original.zoom = 1.6;
  for (const [i, device] of original.devices.entries()) {
    device.screenshot = `data:image/png;base64,${["AAAA", "BBBB", "CCCC"][i]}`;
    device.fit = "contain";
  }
  const before = structuredClone(original);
  const next = applyPreset(original, "showcase");
  assert.equal(validateProject(next), true);
  assert.equal(next.ratio, "16:9");
  assert.equal(next.zoom, 1);
  assert.deepEqual(
    next.devices.map((d) => d.kind),
    ["studio-display", "phone", "tablet"],
  );
  const [display, phone, tablet] = next.devices;
  assert.ok(phone.x < display.x && display.x < tablet.x);
  assert.ok(display.y > phone.y && display.y > tablet.y);
  assert.ok(display.z < phone.z && display.z < tablet.z);
  assert.equal(display.screenshot, original.devices[0].screenshot);
  assert.equal(phone.screenshot, original.devices[2].screenshot);
  assert.equal(tablet.screenshot, original.devices[1].screenshot);
  assert.ok(next.devices.every((d) => d.fit === "contain"));
  assert.deepEqual(original, before);
  assert.deepEqual(next.assets, original.assets);
  assert.deepEqual(next.lighting, original.lighting);
});

test("the first layout prefers the Studio Display screenshot when multiple desktops exist", () => {
  const original = structuredClone(DEFAULT_PROJECT);
  const display = newDevice("studio-display");
  display.screenshot = "data:image/png;base64,AAAA";
  original.devices.push(display);
  const next = applyPreset(original, "showcase");
  assert.equal(next.devices[0].screenshot, display.screenshot);
});

test("payment terminals save and restore independent screenshots, finishes, fitting, and transforms", () => {
  const project = structuredClone(DEFAULT_PROJECT);
  project.devices = ["smart-terminal", "card-reader", "countertop-pos"].map(
    (kind) => newDevice(kind as Project["devices"][number]["kind"]),
  );
  assert.equal(
    validateProject(project),
    true,
    "bundled payment demo screens are allowed",
  );
  project.devices.forEach((d, i) =>
    Object.assign(d, {
      screenshot: `data:image/png;base64,${["AAAA", "BBBB", "CCCC"][i]}`,
      finish: i === 1 ? "silver" : "graphite",
      fit: ["cover", "contain", "stretch"][i],
      x: i - 1,
      y: 0.35,
      z: i * 0.1,
      ry: 35 + i * 10,
    }),
  );
  const restored = JSON.parse(JSON.stringify(project));
  assert.equal(validateProject(restored), true);
  assert.deepEqual(restored, project);
});
