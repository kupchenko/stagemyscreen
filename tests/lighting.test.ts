import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  DEFAULT_PROJECT,
  applyPreset,
  upgradeProject,
  validateProject,
} from "../src/lib/studio.ts";
import {
  DEFAULT_LIGHTING,
  LIGHTING_PRESETS,
} from "../src/lib/scene-lighting.ts";
import {
  LightingRig,
  createLightingEnvironment,
} from "../src/lib/lighting-rig.ts";

test("older projects acquire the original soft studio setup without changing the scene", () => {
  const old = JSON.parse(JSON.stringify(DEFAULT_PROJECT));
  delete old.lighting;
  assert.equal(validateProject(old), true);
  const upgraded = upgradeProject(old);
  assert.deepEqual(upgraded.lighting, DEFAULT_LIGHTING);
  assert.deepEqual(upgraded.devices, old.devices);
  assert.equal(upgraded.background, old.background);
  assert.equal(upgraded.shadows, old.shadows);
  assert.equal(old.lighting, undefined);
});

test("custom lighting survives portable projects, migrations, and layout changes", () => {
  const project = structuredClone(DEFAULT_PROJECT);
  project.lighting = {
    mode: "neon-duo",
    brightness: 124,
    direction: -73,
    warmth: 42,
    reflections: 68,
    shadowStrength: 54,
    shadowSoftness: 81,
  };
  const restored = upgradeProject(JSON.parse(JSON.stringify(project)));
  assert.equal(validateProject(restored), true);
  assert.deepEqual(restored.lighting, project.lighting);
  assert.deepEqual(applyPreset(restored, "duo").lighting, project.lighting);
});

test("project import rejects malformed lighting instead of passing it to the renderer", () => {
  for (const lighting of [
    null,
    {},
    "soft-studio",
    { ...DEFAULT_LIGHTING, mode: "unknown" },
    { ...DEFAULT_LIGHTING, brightness: Infinity },
    { ...DEFAULT_LIGHTING, brightness: -1 },
    { ...DEFAULT_LIGHTING, direction: 181 },
    { ...DEFAULT_LIGHTING, warmth: -101 },
    { ...DEFAULT_LIGHTING, reflections: 201 },
    { ...DEFAULT_LIGHTING, shadowStrength: "50" },
    { ...DEFAULT_LIGHTING, shadowSoftness: NaN },
  ]) {
    assert.equal(validateProject({ ...DEFAULT_PROJECT, lighting }), false);
  }
});

test("all twelve presets configure distinct actual lights and reflection environments", () => {
  const scene = new THREE.Scene();
  const rig = new LightingRig();
  scene.add(rig.group);
  const signatures = new Set<string>();
  for (const preset of LIGHTING_PRESETS) {
    const settings = { ...DEFAULT_LIGHTING, mode: preset.id };
    assert.equal(
      validateProject({ ...DEFAULT_PROJECT, lighting: settings }),
      true,
    );
    rig.apply(scene, settings);
    const room = createLightingEnvironment(settings);
    const sources: unknown[] = [];
    room.traverse((o) => {
      if (o instanceof THREE.Light)
        sources.push([o.color.toArray(), o.intensity]);
      if (
        o instanceof THREE.Mesh &&
        o.material instanceof THREE.MeshLambertMaterial
      )
        sources.push([
          o.material.emissive.toArray(),
          o.material.emissiveIntensity,
        ]);
      if (o instanceof THREE.InstancedMesh) o.dispose();
    });
    signatures.add(
      JSON.stringify([
        rig.key.color.toArray(),
        rig.key.position.toArray(),
        rig.key.intensity,
        rig.fill.color.toArray(),
        rig.fill.intensity,
        rig.rim.intensity,
        scene.environmentIntensity,
        scene.environmentRotation.y,
        sources,
      ]),
    );
    room.dispose();
  }
  assert.equal(signatures.size, 12);
  assert.equal(rig.group.children.length, 4, "switching presets reuses lights");
  rig.dispose();
});

test("brightness, direction, reflections, and warmth affect the light rig independently", () => {
  const scene = new THREE.Scene();
  const rig = new LightingRig();
  scene.add(rig.group);
  rig.apply(scene, DEFAULT_LIGHTING);
  const originalKey = rig.key.intensity;
  const originalEnvironment = scene.environmentIntensity;
  rig.apply(scene, {
    ...DEFAULT_LIGHTING,
    brightness: 50,
    reflections: 40,
    direction: 90,
  });
  assert.equal(rig.key.intensity, originalKey / 2);
  assert.ok(
    Math.abs(scene.environmentIntensity - originalEnvironment * 0.2) < 1e-10,
  );
  assert.equal(rig.group.rotation.y, Math.PI / 2);
  assert.equal(scene.environmentRotation.y, Math.PI / 2);
  rig.apply(scene, { ...DEFAULT_LIGHTING, warmth: 100 });
  const warm = rig.key.color.clone();
  rig.apply(scene, { ...DEFAULT_LIGHTING, warmth: -100 });
  const cool = rig.key.color;
  assert.ok(warm.r / warm.b > cool.r / cool.b);
  rig.apply(scene, { ...DEFAULT_LIGHTING, brightness: 0 });
  assert.equal(
    rig.key.intensity +
      rig.fill.intensity +
      rig.rim.intensity +
      rig.ambient.intensity,
    0,
  );
  assert.equal(scene.environmentIntensity, 0);
  rig.dispose();
});
