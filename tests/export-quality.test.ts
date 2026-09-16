import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { exportDimensions, exportTiles } from "../src/lib/export-quality.ts";
import { screenTextureMatrix } from "../src/lib/screen-texture.ts";

test("export sizes include actual 8K and 16K pixels with bounded portrait memory", () => {
  assert.deepEqual(exportDimensions(7680, 16 / 9), {
    width: 7680,
    height: 4320,
  });
  assert.deepEqual(exportDimensions(15360, 16 / 9), {
    width: 15360,
    height: 8640,
  });
  assert.deepEqual(exportDimensions(7680, 9 / 16), {
    width: 7680,
    height: 13653,
  });
  for (const [w, r] of [
    [15360, 9 / 16],
    [15360, 1],
    [NaN, 1],
    [3840, 0],
    [2.5, 1],
  ])
    assert.throws(() => exportDimensions(w, r), /export limit/);
});

test("supersampled tiles cover the image exactly, with bounded GPU buffers and seam gutters", () => {
  for (const [width, height] of [
    [3840, 2160],
    [7680, 4320],
    [7680, 13653],
    [15360, 8640],
    [513, 319],
  ]) {
    const tiles = exportTiles(width, height, "ultra");
    assert.equal(
      tiles.reduce((n, t) => n + t.width * t.height, 0),
      width * height,
    );
    let x = 0,
      y = 0;
    for (const t of tiles) {
      assert.equal(t.x, x);
      assert.equal(t.y, y);
      assert.equal(t.scale, 2);
      assert.ok(t.renderWidth <= 2048 && t.renderHeight <= 2048);
      assert.ok(t.left <= t.x && t.top <= t.y);
      assert.ok(t.left + t.renderWidth / 2 >= t.x + t.width);
      assert.ok(t.top + t.renderHeight / 2 >= t.y + t.height);
      if (t.x > 0) assert.equal(t.x - t.left, 2);
      if (t.y > 0) assert.equal(t.y - t.top, 2);
      x += t.width;
      if (x === width) {
        x = 0;
        y += t.height;
      }
    }
    assert.equal(y, height);
  }
});

test("tile cameras preserve perspective, zoom, and exact scene placement", () => {
  const width = 3840,
    height = 2160;
  const full = new THREE.PerspectiveCamera(27, width / height, 0.1, 100);
  full.position.set(0, 0.5, 12);
  full.lookAt(0, 0, 0);
  full.zoom = 1.23;
  full.updateProjectionMatrix();
  full.updateMatrixWorld();
  for (const t of exportTiles(width, height, "ultra")) {
    const camera = full.clone();
    camera.setViewOffset(
      width * 2,
      height * 2,
      t.left * 2,
      t.top * 2,
      t.renderWidth,
      t.renderHeight,
    );
    for (const point of [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(2, -1, 1),
    ]) {
      const global = point.clone().project(full),
        local = point.clone().project(camera);
      assert.ok(
        Math.abs(
          ((global.x + 1) * width) / 2 -
            (t.left + ((local.x + 1) * t.renderWidth) / 4),
        ) < 1e-8,
      );
      assert.ok(
        Math.abs(
          ((1 - global.y) * height) / 2 -
            (t.top + ((1 - local.y) * t.renderHeight) / 4),
        ) < 1e-8,
      );
    }
  }
});

const mapped = (m: THREE.Matrix3, u: number, v: number) =>
  new THREE.Vector2(u, v)
    .applyMatrix3(m)
    .toArray()
    .map((n) => Math.round(n * 1e6) / 1e6 || 0);
test("native screenshot sampling keeps corners, center crops, letterboxes and USDZ orientation", () => {
  const unchanged = screenTextureMatrix(4480, 2520, 16 / 9, "cover");
  assert.deepEqual(mapped(unchanged, 0, 0), [0, 0]);
  assert.deepEqual(mapped(unchanged, 1, 1), [1, 1]);
  const crop = screenTextureMatrix(200, 100, 1, "cover");
  assert.deepEqual(mapped(crop, 0, 0), [0.25, 0]);
  assert.deepEqual(mapped(crop, 1, 1), [0.75, 1]);
  const contain = screenTextureMatrix(200, 100, 1, "contain");
  assert.deepEqual(mapped(contain, 0, 0), [0, -0.5]);
  assert.deepEqual(mapped(contain, 1, 1), [1, 1.5]);
  const usdz = screenTextureMatrix(100, 200, 0.5, "cover", 0, false, true);
  assert.deepEqual(mapped(usdz, 0, 0), [0, 1]);
  assert.deepEqual(mapped(usdz, 1, 1), [1, 0]);
  const rotated = screenTextureMatrix(100, 200, 2, "cover", 90);
  assert.deepEqual(mapped(rotated, 0, 0), [0, 1]);
  assert.deepEqual(mapped(rotated, 1, 0), [0, 0]);
  assert.deepEqual(mapped(rotated, 1, 1), [1, 0]);
  const flipped = screenTextureMatrix(100, 200, 2, "stretch", 90, true, true);
  assert.deepEqual(mapped(flipped, 0, 0), [1, 0]);
  assert.deepEqual(mapped(flipped, 1, 1), [0, 1]);
});
