import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { buildDeviceModel } from "../src/lib/device-models.ts";
import {
  newDevice,
  DEFAULT_PROJECT,
  upgradeProject,
  validateProject,
  CATALOG,
  finishesFor,
} from "../src/lib/studio.ts";

test("detailed hardware has finite geometry, normalized normals, and exact screen aspect ratios", () => {
  const expected = {
    phone: 1206 / 2622,
    tablet: 2752 / 2064,
    monitor: 16 / 9,
    laptop: 3456 / 2234,
    "studio-display": 16 / 9,
    "studio-display-xdr": 16 / 9,
    "smart-terminal": 720 / 1280,
    "card-reader": 4 / 3,
    "countertop-pos": 16 / 10,
  };
  for (const { kind } of CATALOG) {
    const model = buildDeviceModel(newDevice(kind));
    assert.ok(Math.abs(model.screenRatio - expected[kind]) < 1e-8);
    let triangles = 0;
    model.group.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      const positions = o.geometry.attributes.position;
      assert.ok(
        [...positions.array].every(Number.isFinite),
        `${kind}: finite positions`,
      );
      const normals = o.geometry.attributes.normal;
      for (let i = 0; i < normals.count; i++) {
        const length = Math.hypot(
          normals.getX(i),
          normals.getY(i),
          normals.getZ(i),
        );
        assert.ok(
          Math.abs(length - 1) < 0.001,
          `${kind}: valid surface normal`,
        );
      }
      triangles += (o.geometry.index?.count || positions.count) / 3;
    });
    assert.ok(
      triangles > 10000,
      `${kind}: curved hardware remains tessellated for large exports`,
    );
    const bounds = new THREE.Box3().setFromObject(model.group);
    assert.ok(!bounds.isEmpty());
  }
});
test("existing projects upgrade model labels and finishes without altering screenshots or placement", () => {
  const p = structuredClone(DEFAULT_PROJECT);
  p.devices[0].name = "Studio Display 2";
  p.devices[1].name = "My sales dashboard";
  p.devices[1].finish = "sand";
  p.devices[2].name = "Phone Pro";
  p.devices.push({
    ...newDevice("laptop"),
    name: "Laptop Pro 2",
    rx: 24,
    ry: -31,
  });
  const upgraded = upgradeProject(p);
  assert.equal(upgraded.devices[0].name, "iMac 2");
  assert.equal(upgraded.devices[1].name, "My sales dashboard");
  assert.equal(upgraded.devices[1].finish, "silver");
  assert.equal(upgraded.devices[2].name, "iPhone 17");
  assert.equal(upgraded.devices[3].name, "MacBook Pro 16″ 2");
  upgraded.devices.forEach((d, i) => {
    assert.equal(d.screenshot, p.devices[i].screenshot);
    for (const prop of ["x", "y", "z", "rx", "ry", "rz", "scale"] as const)
      assert.equal(d[prop], p.devices[i][prop]);
  });
  assert.equal(p.devices[0].name, "Studio Display 2");
});

test("Studio Display projects preserve their distinct model identities across save and upgrade", () => {
  const project = structuredClone(DEFAULT_PROJECT);
  project.devices = [
    newDevice("studio-display"),
    newDevice("studio-display-xdr"),
  ];
  project.devices[0].screenshot = "data:image/png;base64,aGVsbG8=";
  project.devices[1].screenshot = "/screens/analytics.svg";
  project.devices[1].ry = 128;
  const restored = upgradeProject(JSON.parse(JSON.stringify(project)));
  assert.equal(validateProject(restored), true);
  assert.deepEqual(restored.devices, project.devices);
  assert.equal(restored.devices[0].name, "Studio Display");
  assert.equal(restored.devices[1].name, "Studio Display XDR");
  const standard = buildDeviceModel(restored.devices[0]);
  const xdr = buildDeviceModel(restored.devices[1]);
  assert.ok(standard.group.getObjectByName("Tilt stand with cable aperture"));
  assert.ok(xdr.group.getObjectByName("Counterbalance arm"));
});

test("MacBook keeps its screen on the angled lid with a complete ANSI keyboard", () => {
  const model = buildDeviceModel(newDevice("laptop"));
  assert.equal(model.screenRatio, 3456 / 2234);
  const keyboard = model.group.getObjectByName("78-key ANSI keyboard")!;
  assert.equal(keyboard.children.length, 78);
  const up = keyboard.getObjectByName("Key ▲")!;
  const down = keyboard.getObjectByName("Key ▼")!;
  for (const label of ["◀", "▶"]) {
    const side = keyboard.getObjectByName(`Key ${label}`)!;
    assert.equal(side.position.z, down.position.z);
    const sideBounds = new THREE.Box3().setFromObject(side);
    const upBounds = new THREE.Box3().setFromObject(up);
    assert.ok(
      Math.abs(
        sideBounds.getSize(new THREE.Vector3()).z -
          upBounds.getSize(new THREE.Vector3()).z,
      ) < 1e-6,
    );
  }
  const lid = model.screen.parent!;
  assert.ok(lid.rotation.x < 0, "the lid leans back from its hinge");
  assert.ok(Math.abs((lid.rotation.x * 180) / Math.PI + 18) < 1e-6);
  model.group.updateMatrixWorld(true);
  const screenBounds = new THREE.Box3().setFromObject(model.screen);
  const keyboardBounds = new THREE.Box3().setFromObject(keyboard);
  assert.ok(screenBounds.min.y > keyboardBounds.max.y);
  const grille = model.group.getObjectByName(
    "Perforated stereo speaker grilles",
  );
  assert.ok(grille instanceof THREE.InstancedMesh);
  assert.ok(grille.count > 2000, "fine grille details use a single draw call");
  const ports = model.group.children.filter(
    (o) => o.name === "Thunderbolt 5 USB-C port",
  );
  assert.equal(ports.filter((p) => p.position.x < 0).length, 2);
  assert.equal(ports.filter((p) => p.position.x > 0).length, 1);
  assert.ok(model.group.getObjectByName("12MP Center Stage camera"));
  assert.ok(model.group.getObjectByName("MagSafe 3 charge port"));
});

test("MacBook generation labels migrate while preserving custom names, screens, and placement", () => {
  const project = structuredClone(DEFAULT_PROJECT);
  project.devices = [
    "MacBook Pro",
    "MacBook Pro 2",
    "MacBook Pro sales demo",
  ].map((name) => ({
    ...newDevice("laptop"),
    name,
    x: 1.23,
    ry: 37,
    screenshot: "data:image/png;base64,AAAA",
  }));
  const upgraded = upgradeProject(project);
  assert.deepEqual(
    upgraded.devices.map((d) => d.name),
    ["MacBook Pro 16″", "MacBook Pro 16″ 2", "MacBook Pro sales demo"],
  );
  upgraded.devices.forEach((d, i) =>
    assert.deepEqual(
      { ...d, name: project.devices[i].name },
      project.devices[i],
    ),
  );
});

test("payment hardware has independent display surfaces and recognizable physical controls", () => {
  for (const kind of [
    "smart-terminal",
    "card-reader",
    "countertop-pos",
  ] as const) {
    for (const finish of (kind === "smart-terminal"
      ? ["silver"]
      : ["silver", "graphite"]) as ("silver" | "graphite")[]) {
      const device = { ...newDevice(kind), finish };
      const model = buildDeviceModel(device);
      assert.ok(finishesFor(kind)[finish]);
      assert.equal(model.screen.material.toneMapped, false);
      assert.equal(model.screen.userData.deviceId, device.id);
      assert.ok(model.group.getObjectByName("Chip card insertion slot"));
      if (kind === "smart-terminal") {
        assert.ok(model.group.getObjectByName("Receipt printer outlet"));
        assert.ok(model.group.getObjectByName("Rounded wedge enclosure"));
        assert.ok(model.group.getObjectByName("Magnetic stripe channel"));
        assert.ok(model.group.getObjectByName("Quarter-inch mounting socket"));
      } else if (kind === "card-reader") {
        assert.equal(
          model.group
            .getObjectByName("Raised PIN keypad")!
            .children.filter((o) => o.name.startsWith("PIN key ")).length,
          15,
        );
      } else {
        assert.ok(model.group.getObjectByName("Countertop pedestal"));
        assert.equal(model.screen.parent!.name, "Tilted touchscreen assembly");
      }
    }
  }
});

test("Square Terminal's sloped housing does not occlude its screenshot", () => {
  const model = buildDeviceModel(newDevice("smart-terminal"));
  model.group.updateMatrixWorld(true);
  model.screen.geometry.computeBoundingBox();
  const size = model.screen.geometry.boundingBox!.getSize(new THREE.Vector3());
  const normal = new THREE.Vector3(0, 0, 1).transformDirection(
    model.screen.matrixWorld,
  );
  for (const x of [-0.4, 0, 0.4])
    for (const y of [-0.4, 0, 0.4]) {
      const point = model.screen.localToWorld(
        new THREE.Vector3(x * size.x, y * size.y, 0),
      );
      const ray = new THREE.Raycaster(
        point.clone().addScaledVector(normal, 0.4),
        normal.clone().negate(),
      );
      assert.equal(
        ray.intersectObject(model.group, true)[0]?.object,
        model.screen,
      );
    }
});
