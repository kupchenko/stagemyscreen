import * as THREE from "three";
import { type Device, finishFor } from "./studio.ts";
import { MACBOOK_PRO_16_M4 } from "./device-specs.ts";
import {
  smartTerminal,
  keypadTerminal,
  countertopTerminal,
} from "./payment-models.ts";

import {
  type DeviceModel,
  roundedShape,
  extrude,
  shell,
  surface,
  put,
  metal,
  plastic,
  glass,
  disc,
  ring,
  cylinder,
  screen,
} from "./model-primitives.ts";
export type { DeviceModel } from "./model-primitives.ts";
type Material = THREE.Material;
const PI = Math.PI;

function frontLens(
  g: THREE.Group,
  x: number,
  y: number,
  z: number,
  radius: number,
) {
  put(g, disc(radius, metal("#26282b", 0.19)), x, y, z);
  put(g, disc(radius * 0.73, glass("#060a13")), x, y, z + 0.001);
  put(g, disc(radius * 0.34, metal("#152a44", 0.12)), x, y, z + 0.002);
  put(
    g,
    disc(radius * 0.13, plastic("#53647a", 0.1)),
    x - radius * 0.2,
    y + radius * 0.24,
    z + 0.003,
  );
}
function rearLens(
  g: THREE.Group,
  x: number,
  y: number,
  z: number,
  r: number,
  trim: Material,
) {
  const lens = new THREE.Group();
  lens.rotation.y = PI;
  put(g, lens, x, y, z);
  put(lens, cylinder(r, 0.037, trim));
  put(lens, ring(r * 0.98, r * 0.85, metal("#73777d", 0.17)), 0, 0, 0.021);
  put(lens, disc(r * 0.85, glass()), 0, 0, 0.022);
  for (let i = 0; i < 5; i++)
    put(
      lens,
      ring(
        r * (0.73 - i * 0.06),
        r * (0.71 - i * 0.06),
        metal(i % 2 ? "#1b2540" : "#161c26", 0.2),
      ),
      0,
      0,
      0.024 + i * 0.0003,
    );
  put(lens, disc(r * 0.43, glass("#080e18")), 0, 0, 0.026);
  put(lens, disc(r * 0.23, metal("#132846", 0.12)), 0, 0, 0.027);
  const glint = put(
    lens,
    disc(r * 0.1, metal("#535384", 0.14)),
    -r * 0.18,
    r * 0.23,
    0.028,
  );
  glint.scale.y = 0.4;
}
// Simple Icons Apple silhouette (CC0). Branding remains the owner's trademark.
const logoPath =
  "M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701";
function rearLogo(
  g: THREE.Group,
  size: number,
  y: number,
  z: number,
  color = "#6c7076",
) {
  if (typeof document === "undefined") return;
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "white";
  ctx.scale(512 / 24, 512 / 24);
  ctx.fill(new Path2D(logoPath));
  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshPhysicalMaterial({
      map,
      color,
      transparent: true,
      alphaTest: 0.05,
      metalness: 0.85,
      roughness: 0.18,
      depthWrite: false,
    }),
  );
  m.rotation.y = PI;
  put(g, m, 0, y, z);
}
function slot(
  g: THREE.Group,
  w: number,
  h: number,
  x: number,
  y: number,
  z: number,
  axis: "bottom" | "left" | "right" | "rear",
) {
  const rim = surface(w, h, h / 2, metal("#777a7f", 0.35));
  const hole = surface(w * 0.86, h * 0.72, h * 0.36, plastic("#08090b"));
  const part = new THREE.Group();
  part.add(rim);
  hole.position.z = 0.001;
  part.add(hole);
  if (axis === "bottom") part.rotation.x = PI / 2;
  if (axis === "left") part.rotation.y = -PI / 2;
  if (axis === "right") part.rotation.y = PI / 2;
  if (axis === "rear") part.rotation.y = PI;
  put(g, part, x, y, z);
  return part;
}

function iphone(d: Device): DeviceModel {
  const g = new THREE.Group(),
    finish = finishFor(d.kind, d.finish);
  // 71.5 × 149.6 × 7.95 mm. Screen: 1206 × 2622 pixels.
  const w = 1.44,
    h = (w * 149.6) / 71.5,
    depth = (w * 7.95) / 71.5;
  const frame = metal(finish.color, 0.31),
    polished = metal(finish.color, 0.17),
    black = glass();
  const back = new THREE.MeshPhysicalMaterial({
    color: finish.color,
    roughness: 0.36,
    metalness: 0.03,
    clearcoat: 0.65,
    clearcoatRoughness: 0.29,
  });
  put(g, shell(w, h, depth, 0.235, frame, 0.023));
  // Fine polished perimeter, gasket, and gently bevelled cover glass.
  put(
    g,
    shell(w - 0.014, h - 0.014, 0.026, 0.229, polished, 0.006),
    0,
    0,
    depth / 2 - 0.008,
  );
  put(
    g,
    shell(w - 0.029, h - 0.029, 0.018, 0.221, plastic("#17181a"), 0.004),
    0,
    0,
    depth / 2 + 0.004,
  );
  put(
    g,
    shell(w - 0.04, h - 0.04, 0.02, 0.215, black, 0.005),
    0,
    0,
    depth / 2 + 0.009,
  );
  put(
    g,
    shell(w - 0.032, h - 0.032, 0.021, 0.22, back, 0.007),
    0,
    0,
    -depth / 2 + 0.001,
  );
  const sw = 1.345,
    sh = (sw * 2622) / 1206;
  // Screenshots supply their own notch / Dynamic Island. Keep the display
  // unobstructed so the model never adds a second cutout over the uploaded UI.
  const display = screen(g, sw, sh, 0.181, 0, depth / 2 + 0.02);
  put(
    g,
    surface(0.26, 0.012, 0.006, plastic("#25272a")),
    0,
    h / 2 - 0.04,
    depth / 2 + 0.016,
  );
  // Antenna breaks wrap around the aluminum rail, not over the glass.
  for (const side of [-1, 1])
    for (const y of [-1.05, 1.04]) {
      put(
        g,
        shell(
          0.008,
          0.023,
          depth * 0.74,
          0.002,
          plastic(d.finish === "graphite" ? "#3e4247" : "#e3e4e7"),
          0.001,
        ),
        side * (w / 2 + 0.001),
        y,
      );
    }
  const button = (side: number, y: number, length: number) => {
    put(
      g,
      shell(0.016, length + 0.013, 0.092, 0.007, plastic("#414449"), 0.003),
      side * (w / 2),
      y,
    );
    put(
      g,
      shell(0.019, length, 0.078, 0.009, frame, 0.004),
      side * (w / 2 + 0.01),
      y,
    );
  };
  button(-1, 0.88, 0.13);
  button(-1, 0.55, 0.23);
  button(-1, 0.24, 0.23);
  button(1, 0.47, 0.37);
  const control = slot(g, 0.29, 0.071, w / 2 + 0.002, -0.72, 0, "right");
  control.rotation.z = PI / 2;
  slot(g, 0.19, 0.067, 0, -h / 2 - 0.001, 0, "bottom");
  for (const side of [-1, 1])
    for (let i = 0; i < 5; i++)
      slot(
        g,
        0.029,
        0.034,
        side * (0.3 + i * 0.054),
        -h / 2 - 0.001,
        0,
        "bottom",
      );
  for (const x of [-0.19, 0.19]) {
    const screw = put(
      g,
      disc(0.015, metal("#696d73", 0.35)),
      x,
      -h / 2 - 0.001,
      0,
    );
    screw.rotation.x = PI / 2;
  }
  // iPhone 17 has two vertically arranged cameras, rather than the Pro layout.
  put(
    g,
    shell(0.375, 0.72, 0.055, 0.187, frame, 0.012),
    0.434,
    1.055,
    -depth / 2 - 0.027,
  );
  put(
    g,
    shell(0.34, 0.682, 0.018, 0.17, back, 0.005),
    0.434,
    1.055,
    -depth / 2 - 0.063,
  );
  rearLens(g, 0.434, 1.224, -depth / 2 - 0.079, 0.146, polished);
  rearLens(g, 0.434, 0.885, -depth / 2 - 0.079, 0.146, polished);
  const flash = put(
    g,
    disc(0.052, plastic("#ece7d9", 0.22)),
    0.11,
    1.055,
    -depth / 2 - 0.012,
  );
  flash.rotation.y = PI;
  const mic = put(
    g,
    disc(0.011, plastic("#17191b")),
    0.11,
    0.938,
    -depth / 2 - 0.013,
  );
  mic.rotation.y = PI;
  rearLogo(
    g,
    0.35,
    0,
    -depth / 2 - 0.013,
    d.finish === "graphite" ? "#44474d" : "#9b9ea5",
  );
  g.name = "iPhone 17";
  return { group: g, screen: display, screenRatio: sw / sh };
}

function ipad(d: Device): DeviceModel {
  const g = new THREE.Group(),
    color = finishFor(d.kind, d.finish).color;
  // 281.6 × 215.5 × 5.1 mm, in landscape orientation.
  const w = 3.95,
    h = (w * 215.5) / 281.6,
    depth = (w * 5.1) / 281.6;
  const frame = metal(color, 0.31),
    edge = metal(color, 0.2),
    black = glass();
  put(g, shell(w, h, depth, 0.175, frame, 0.012));
  put(
    g,
    shell(w - 0.012, h - 0.012, 0.014, 0.171, edge, 0.004),
    0,
    0,
    depth / 2 - 0.002,
  );
  put(
    g,
    shell(w - 0.03, h - 0.03, 0.014, 0.162, plastic("#222328"), 0.003),
    0,
    0,
    depth / 2 + 0.001,
  );
  put(
    g,
    shell(w - 0.046, h - 0.046, 0.012, 0.155, black, 0.003),
    0,
    0,
    depth / 2 + 0.009,
  );
  const sw = 3.676,
    sh = (sw * 2064) / 2752;
  const display = screen(g, sw, sh, 0.11, 0, depth / 2 + 0.016);
  frontLens(g, 0, h / 2 - 0.076, depth / 2 + 0.018, 0.024);
  put(
    g,
    surface(0.057, 0.02, 0.01, glass("#13151b")),
    -0.13,
    h / 2 - 0.075,
    depth / 2 + 0.018,
  );
  for (const side of [-1, 1]) {
    for (const region of [-1, 1])
      for (let i = 0; i < 11; i++) {
        const hole = slot(
          g,
          0.022,
          0.026,
          side * (w / 2 + 0.001),
          region * (0.79 + i * 0.044),
          0,
          side < 0 ? "left" : "right",
        );
        hole.rotation.z = PI / 2;
      }
  }
  const usb = slot(g, 0.135, 0.043, w / 2 + 0.001, 0, 0, "right");
  usb.rotation.z = PI / 2;
  put(g, shell(0.015, 0.24, 0.043, 0.007, frame, 0.003), -w / 2 - 0.006, 1.02);
  for (const x of [-1.16, -0.84])
    put(g, shell(0.2, 0.014, 0.04, 0.006, frame, 0.003), x, h / 2 + 0.006);
  const pencil = surface(
    0.97,
    0.042,
    0.021,
    plastic(d.finish === "graphite" ? "#35373a" : "#c3c5c8"),
  );
  pencil.rotation.x = -PI / 2;
  put(g, pencil, 0.3, h / 2 + 0.001, 0);
  put(
    g,
    shell(0.48, 0.48, 0.035, 0.11, edge, 0.008),
    -1.62,
    1.17,
    -depth / 2 - 0.016,
  );
  put(
    g,
    shell(0.452, 0.452, 0.013, 0.1, glass("#16171a"), 0.003),
    -1.62,
    1.17,
    -depth / 2 - 0.038,
  );
  rearLens(g, -1.7, 1.23, -depth / 2 - 0.058, 0.126, edge);
  const sensor = put(g, disc(0.057, glass()), -1.51, 1.09, -depth / 2 - 0.047);
  sensor.rotation.y = PI;
  const flash = put(
    g,
    disc(0.038, plastic("#ede8da")),
    -1.51,
    1.28,
    -depth / 2 - 0.047,
  );
  flash.rotation.y = PI;
  for (const y of [-0.09, 0, 0.09]) {
    const pin = put(
      g,
      disc(0.029, metal("#ada08a", 0.23)),
      1.65,
      y,
      -depth / 2 - 0.001,
    );
    pin.rotation.y = PI;
  }
  rearLogo(
    g,
    0.54,
    0,
    -depth / 2 - 0.001,
    d.finish === "graphite" ? "#101114" : "#6b6e73",
  );
  g.name = "iPad Pro 13-inch";
  return { group: g, screen: display, screenRatio: sw / sh };
}

function imac(d: Device): DeviceModel {
  const g = new THREE.Group(),
    finish = finishFor(d.kind, d.finish),
    spaceGray = d.finish === "graphite";
  // 547 mm wide, 11.5 mm thin, 23.5-inch 16:9 display. Screen center is
  // raised within the enclosure to make room for the characteristic chin.
  const w = 6.1,
    h = 4.03,
    depth = (6.1 * 11.5) / 547;
  const frame = metal(finish.color, 0.33),
    edge = metal(finish.color, 0.2);
  const chin = spaceGray
    ? metal(finish.color, 0.4)
    : plastic(
        new THREE.Color(finish.color).lerp(new THREE.Color("#ffffff"), 0.18),
        0.32,
      );
  put(g, shell(w, h, depth, 0.088, frame, 0.014));
  put(
    g,
    shell(w - 0.011, h - 0.011, 0.025, 0.081, edge, 0.005),
    0,
    0,
    depth / 2 - 0.007,
  );
  put(g, surface(w - 0.034, h - 0.034, 0.071, chin), 0, 0, depth / 2 + 0.007);
  // Space Gray pairs a dark glass bezel with the anodized aluminum chin.
  put(
    g,
    surface(
      w - 0.046,
      3.53,
      0.065,
      new THREE.MeshPhysicalMaterial({
        color: spaceGray ? "#0b0c0f" : "#eeeef0",
        roughness: 0.24,
        clearcoat: 0.8,
      }),
    ),
    0,
    0.236,
    depth / 2 + 0.009,
  );
  put(
    g,
    surface(
      w - 0.045,
      0.006,
      0.002,
      plastic(spaceGray ? "#393c42" : "#a2a4a9"),
    ),
    0,
    -1.532,
    depth / 2 + 0.01,
  );
  const sw = 5.797,
    sh = (sw * 9) / 16;
  put(
    g,
    surface(sw + 0.012, sh + 0.012, 0.01, plastic("#15171b")),
    0,
    0.236,
    depth / 2 + 0.01,
  );
  const display = screen(g, sw, sh, 0.007, 0.236, depth / 2 + 0.012);
  frontLens(g, 0, 1.94, depth / 2 + 0.012, 0.031);
  put(g, disc(0.008, plastic("#91969a")), 0.1, 1.94, depth / 2 + 0.013);
  // Tapered, bent aluminum stand with a real cable-routing aperture.
  const shape = new THREE.Shape();
  shape.moveTo(-0.36, -0.65);
  shape.lineTo(0.36, -0.65);
  shape.lineTo(0.665, -2.55);
  shape.quadraticCurveTo(0.69, -2.65, 0.62, -2.68);
  shape.lineTo(-0.62, -2.68);
  shape.quadraticCurveTo(-0.69, -2.65, -0.665, -2.55);
  shape.closePath();
  const cable = new THREE.Path();
  cable.absarc(0, -1.54, 0.18, 0, PI * 2, true);
  shape.holes.push(cable);
  const stand = extrude(shape, 0.067, 0.012, frame);
  const pos = stand.geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i),
      t = THREE.MathUtils.clamp((-y - 0.65) / 2.02, 0, 1);
    pos.setZ(i, pos.getZ(i) - 0.14 - 0.55 * t);
  }
  stand.geometry.computeVertexNormals();
  put(g, stand);
  const foot = shell(1.45, 1.6, 0.06, 0.105, frame, 0.014);
  foot.rotation.x = -PI / 2;
  put(g, foot, 0, -2.68, 0.03);
  const bend = new THREE.Shape();
  bend.moveTo(0.64, -2.53);
  bend.quadraticCurveTo(0.71, -2.65, 0.51, -2.65);
  bend.lineTo(0.35, -2.65);
  bend.lineTo(0.35, -2.71);
  bend.lineTo(0.54, -2.71);
  bend.quadraticCurveTo(0.8, -2.71, 0.71, -2.53);
  bend.closePath();
  const heel = extrude(bend, 1.29, 0.007, frame);
  heel.rotation.y = PI / 2;
  put(g, heel);
  const rubber = shell(1.25, 1.34, 0.02, 0.09, plastic("#33363a"), 0.005);
  rubber.rotation.x = -PI / 2;
  put(g, rubber, 0, -2.719, 0.025);
  put(g, cylinder(0.33, 0.12, frame), 0, -0.64, -depth / 2 - 0.065);
  // Rear panel, polished logo, recessed I/O, power and speaker grilles.
  rearLogo(
    g,
    0.63,
    0.39,
    -depth / 2 - 0.001,
    spaceGray ? "#202228" : "#777a80",
  );
  for (let i = 0; i < 4; i++)
    slot(g, 0.106, 0.047, -2.27 + i * 0.17, -1.67, -depth / 2 - 0.001, "rear");
  const power = put(
    g,
    disc(0.049, metal(finish.color, 0.46)),
    2.65,
    -1.67,
    -depth / 2 - 0.002,
  );
  power.rotation.y = PI;
  const powerRing = put(
    g,
    ring(0.05, 0.046, plastic("#787b80")),
    2.65,
    -1.67,
    -depth / 2 - 0.003,
  );
  powerRing.rotation.y = PI;
  for (const side of [-1, 1])
    for (let i = 0; i < 38; i++)
      slot(
        g,
        0.024,
        0.018,
        side * (0.82 + i * 0.047),
        -h / 2 - 0.001,
        0,
        "bottom",
      );
  g.name = "iMac 24-inch";
  return { group: g, screen: display, screenRatio: 16 / 9 };
}

type LaptopKey = {
  x: number;
  z: number;
  w: number;
  h: number;
  label: string;
  small?: string;
};
function laptopKeys(): LaptopKey[] {
  const keys: LaptopKey[] = [],
    unit = 4.34 / 15,
    gap = 0.031;
  const row = (z: number, entries: [string, number, string?][]) => {
    let x = -4.34 / 2;
    for (const [label, units, small] of entries) {
      keys.push({
        x: x + (unit * units) / 2,
        z,
        w: unit * units - gap,
        h: 0.252,
        label,
        small,
      });
      x += unit * units;
    }
  };
  row(0.47, [
    ["esc", 1.5],
    ...Array.from({ length: 12 }, (_, i): [string, number, string?] => [
      ["☀", "☀", "▦", "⌕", "◉", "☾", "◀◀", "▶Ⅱ", "▶▶", "⌁", "−", "+"][i],
      1,
      `F${i + 1}`,
    ]),
    ["", 1.5],
  ]);
  row(0.769, [
    ["~", 1, "`"],
    ["!", 1, "1"],
    ["@", 1, "2"],
    ["#", 1, "3"],
    ["$", 1, "4"],
    ["%", 1, "5"],
    ["^", 1, "6"],
    ["&", 1, "7"],
    ["*", 1, "8"],
    ["(", 1, "9"],
    [")", 1, "0"],
    ["_", 1, "−"],
    ["+", 1, "="],
    ["delete", 2],
  ]);
  row(1.068, [
    ["tab", 1.5],
    ...[..."QWERTYUIOP"].map((s): [string, number] => [s, 1]),
    ["{", 1, "["],
    ["}", 1, "]"],
    ["|", 1.5, "\\"],
  ]);
  row(1.367, [
    ["caps lock", 1.75],
    ...[..."ASDFGHJKL"].map((s): [string, number] => [s, 1]),
    [":", 1, ";"],
    ['"', 1, "'"],
    ["return", 2.25],
  ]);
  row(1.666, [
    ["shift", 2.25],
    ...[..."ZXCVBNM"].map((s): [string, number] => [s, 1]),
    ["<", 1, ","],
    [">", 1, "."],
    ["?", 1, "/"],
    ["shift", 2.75],
  ]);
  row(1.965, [
    ["fn", 1],
    ["control", 1],
    ["option", 1],
    ["command", 1.25],
    ["", 5.5],
    ["command", 1.25],
    ["option", 1],
    ["◀", 1],
    ["arrows", 1],
    ["▶", 1],
  ]);
  const arrows = keys.find((k) => k.label === "arrows")!;
  arrows.label = "▲";
  arrows.h = 0.112;
  arrows.z -= 0.07;
  keys.push({ ...arrows, label: "▼", z: arrows.z + 0.14 });
  // M4's Magic Keyboard has a true inverted-T cluster: the left and right
  // arrows share the lower half-height row, with empty space above them.
  for (const key of keys.filter((k) => k.label === "◀" || k.label === "▶")) {
    key.h = arrows.h;
    key.z += 0.07;
  }
  return keys;
}

function laptopKeyboard(g: THREE.Group, deckY: number) {
  const keys = laptopKeys();
  const keyMaterial = new THREE.MeshPhysicalMaterial({
    color: "#08090b",
    roughness: 0.58,
    metalness: 0,
    specularIntensity: 0.12,
    clearcoat: 0,
  });
  // Every key has its own width, stagger, and bevel. Identical keys share geometry.
  const geometries = new Map<string, THREE.BufferGeometry>();
  const keyboard = new THREE.Group();
  keyboard.name = "78-key ANSI keyboard";
  for (const key of keys) {
    const id = `${key.w}:${key.h}`;
    let geometry = geometries.get(id);
    if (!geometry) {
      geometry = shell(key.w, key.h, 0.025, 0.036, keyMaterial, 0.007).geometry;
      geometries.set(id, geometry);
    }
    const cap = new THREE.Mesh(geometry, keyMaterial);
    cap.rotation.x = -PI / 2;
    cap.name = `Key ${key.label || "space / Touch ID"}`;
    put(keyboard, cap, key.x, deckY + 0.002, key.z);
  }
  g.add(keyboard);
  const touch = keys[13];
  const ringMesh = ring(0.087, 0.081, metal("#36393f", 0.4));
  ringMesh.rotation.x = -PI / 2;
  put(g, ringMesh, touch.x, deckY + 0.015, touch.z);
  const sensor = disc(0.079, plastic("#050608", 0.45));
  sensor.rotation.x = -PI / 2;
  put(g, sensor, touch.x, deckY + 0.0155, touch.z);
  // A single transparent atlas keeps legends sharp without one texture per key.
  if (typeof document !== "undefined") {
    const width = 4.4,
      depth = 1.87,
      centerZ = 1.2175;
    const canvas = document.createElement("canvas");
    canvas.width = 3072;
    canvas.height = 1306;
    const ctx = canvas.getContext("2d")!;
    const sx = canvas.width / width,
      sz = canvas.height / depth;
    ctx.fillStyle = "#c2c5ca";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const key of keys) {
      const x = (key.x / width + 0.5) * canvas.width;
      const y = ((key.z - centerZ) / depth + 0.5) * canvas.height;
      if (key.small) {
        ctx.font = `${0.058 * sx}px Arial, sans-serif`;
        ctx.fillText(key.label, x, y - 0.045 * sz);
        ctx.font = `${0.043 * sx}px Arial, sans-serif`;
        ctx.fillText(key.small, x, y + 0.051 * sz);
      } else {
        ctx.font = `${(key.label.length > 2 ? 0.043 : 0.071) * sx}px Arial, sans-serif`;
        ctx.fillText(key.label, x, y);
      }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    const legends = surface(
      width,
      depth,
      0.02,
      new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        alphaTest: 0.04,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    legends.rotation.x = -PI / 2;
    legends.name = "Keyboard legends";
    put(g, legends, 0, deckY + 0.015, centerZ);
  }
}

function laptopSpeakerGrilles(g: THREE.Group, y: number) {
  const cols = 18,
    rows = 83;
  const holes = new THREE.InstancedMesh(
    new THREE.CircleGeometry(0.0048, 12),
    plastic("#17191c", 0.82),
    cols * rows * 2,
  );
  holes.name = "Perforated stereo speaker grilles";
  const transform = new THREE.Object3D();
  transform.rotation.x = -PI / 2;
  let index = 0;
  for (const side of [-1, 1])
    for (let row = 0; row < rows; row++)
      for (let col = 0; col < cols; col++) {
        transform.position.set(
          side * 2.49 + (col - (cols - 1) / 2) * 0.019,
          y,
          0.44 + row * 0.0205,
        );
        transform.updateMatrix();
        holes.setMatrixAt(index++, transform.matrix);
      }
  holes.instanceMatrix.needsUpdate = true;
  g.add(holes);
}

function laptopDeckOutline(w: number, h: number, r: number) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2 + r, -h / 2);
  s.lineTo(-0.5, -h / 2);
  s.bezierCurveTo(-0.4, -h / 2, -0.4, -h / 2 + 0.062, -0.3, -h / 2 + 0.062);
  s.lineTo(0.3, -h / 2 + 0.062);
  s.bezierCurveTo(0.4, -h / 2 + 0.062, 0.4, -h / 2, 0.5, -h / 2);
  s.lineTo(w / 2 - r, -h / 2);
  s.absarc(w / 2 - r, -h / 2 + r, r, -PI / 2, 0, false);
  s.lineTo(w / 2, h / 2 - r);
  s.absarc(w / 2 - r, h / 2 - r, r, 0, PI / 2, false);
  s.lineTo(-w / 2 + r, h / 2);
  s.absarc(-w / 2 + r, h / 2 - r, r, PI / 2, PI, false);
  s.lineTo(-w / 2, -h / 2 + r);
  s.absarc(-w / 2 + r, -h / 2 + r, r, PI, 1.5 * PI, false);
  s.closePath();
  return s;
}

function laptop(d: Device): DeviceModel {
  const g = new THREE.Group(),
    dark = d.finish === "graphite";
  // M4 Pro / M4 Max 16-inch chassis from the 2025 lineup.
  const w = 5.54,
    mm = w / MACBOOK_PRO_16_M4.widthMm,
    depth = mm * MACBOOK_PRO_16_M4.depthMm,
    baseY = -1.82,
    baseZ = depth / 2 - 0.1,
    deckY = -1.718;
  const color = dark ? "#373940" : "#c8cbd0";
  const frame = metal(color, 0.33),
    edge = metal(dark ? "#555860" : "#e0e3e7", 0.22);
  const black = new THREE.MeshPhysicalMaterial({
    color: "#020304",
    roughness: 0.75,
    metalness: 0,
    specularIntensity: 0.05,
  });
  const base = shell(w, depth, 0.135, 0.16, frame, 0.028);
  base.rotation.x = -PI / 2;
  base.name = "Rounded unibody chassis";
  put(g, base, 0, baseY - 0.0225, baseZ);

  // The upper case has real keyboard/trackpad recesses and a curved finger scoop.
  const deckOutline = laptopDeckOutline(w - 0.018, depth - 0.018, 0.154);
  const keyboardHole = new THREE.Path(
    roundedShape(4.43, 1.905, 0.082)
      .getPoints(40)
      .map((p) => new THREE.Vector2(p.x, p.y + baseZ - 1.2175)),
  );
  deckOutline.holes.push(keyboardHole);
  const trackpadHole = new THREE.Path(
    roundedShape(2.58, 1.39, 0.083)
      .getPoints(40)
      .map((p) => new THREE.Vector2(p.x, p.y + baseZ - 2.975)),
  );
  deckOutline.holes.push(trackpadHole);
  const deck = extrude(deckOutline, 0.057, 0.007, frame);
  deck.rotation.x = -PI / 2;
  deck.name = "Machined keyboard and trackpad deck";
  put(g, deck, 0, deckY - 0.0285, baseZ);
  const well = surface(4.425, 1.9, 0.08, black);
  well.rotation.x = -PI / 2;
  put(g, well, 0, deckY - 0.009, 1.2175);
  laptopKeyboard(g, deckY);
  laptopSpeakerGrilles(g, deckY + 0.0007);

  const padBorder = surface(
    2.579,
    1.389,
    0.082,
    metal(dark ? "#202228" : "#8a8e94", 0.45),
  );
  padBorder.rotation.x = -PI / 2;
  put(g, padBorder, 0, deckY - 0.003, 2.975);
  const pad = surface(
    2.559,
    1.369,
    0.074,
    new THREE.MeshPhysicalMaterial({
      color: dark ? "#35373d" : "#c5c8cd",
      metalness: 0.45,
      roughness: 0.44,
    }),
  );
  pad.rotation.x = -PI / 2;
  pad.name = "Force Touch trackpad";
  put(g, pad, 0, deckY - 0.001, 2.975);

  const hinge = new THREE.Mesh(
    new THREE.CylinderGeometry(0.079, 0.079, 4.1, 64),
    black,
  );
  hinge.rotation.z = PI / 2;
  hinge.name = "Continuous display hinge";
  put(g, hinge, 0, -1.662, -0.019);
  for (const side of [-1, 1]) {
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.082, 0.082, 0.36, 64),
      frame,
    );
    cap.rotation.z = PI / 2;
    put(g, cap, side * 2.13, -1.662, -0.019);
    const vent = surface(1.32, 0.04, 0.017, black);
    put(g, vent, side * 1.75, -1.8, -0.102);
    vent.rotation.y = PI;
  }

  const lid = new THREE.Group();
  lid.name = "Display lid · 108 degrees";
  lid.rotation.x = (-18 * PI) / 180;
  put(g, lid, 0, -1.662, -0.019);
  const lidH = depth - 0.15,
    lidCenter = lidH / 2 + 0.012;
  put(lid, shell(w - 0.012, lidH, 0.066, 0.135, frame, 0.011), 0, lidCenter, 0);
  put(
    lid,
    shell(w - 0.04, lidH - 0.027, 0.008, 0.122, edge, 0.002),
    0,
    lidCenter,
    0.031,
  );
  put(
    lid,
    surface(w - 0.053, lidH - 0.042, 0.116, plastic("#030405", 0.3)),
    0,
    lidCenter,
    0.036,
  );
  put(
    lid,
    surface(w - 0.073, lidH - 0.063, 0.11, glass("#050608")),
    0,
    lidCenter,
    0.038,
  );
  const screenRatio =
    MACBOOK_PRO_16_M4.screenWidth / MACBOOK_PRO_16_M4.screenHeight;
  const sw =
      mm *
      (MACBOOK_PRO_16_M4.screenWidth / MACBOOK_PRO_16_M4.pixelsPerInch) *
      25.4,
    sh = sw / screenRatio;
  const screenY = 0.012 + lidH - 0.062 - sh / 2;
  const display = screen(lid, sw, sh, 0.078, screenY, 0.0395);
  // MacBook's camera housing is part of the display assembly, unlike the iPhone overlay.
  const notchTop = screenY + sh / 2 + 0.008;
  put(
    lid,
    surface(
      0.565,
      0.118,
      0.029,
      new THREE.MeshBasicMaterial({ color: "#010203" }),
    ),
    0,
    notchTop - 0.047,
    0.0405,
  );
  const camera = new THREE.Group();
  camera.name = "12MP Center Stage camera";
  lid.add(camera);
  frontLens(camera, 0, notchTop - 0.04, 0.041, 0.017);
  rearLogo(lid, 0.65, lidCenter + 0.04, -0.0335, dark ? "#101217" : "#34363a");

  const usb = (side: -1 | 1, z: number) => {
    const port = slot(
      g,
      0.148,
      0.061,
      side * (w / 2 + 0.001),
      baseY + 0.014,
      z,
      side < 0 ? "left" : "right",
    );
    port.name = "Thunderbolt 5 USB-C port";
    put(port, surface(0.095, 0.011, 0.003, plastic("#63646a")), 0, 0, 0.002);
  };
  usb(-1, 0.63);
  usb(-1, 1.0);
  usb(1, 0.76);
  const charge = slot(
    g,
    0.239,
    0.052,
    -w / 2 - 0.001,
    baseY + 0.014,
    0.21,
    "left",
  );
  charge.name = "MagSafe 3 charge port";
  for (let i = 0; i < 5; i++)
    put(charge, disc(0.006, metal("#bdb69b", 0.35)), (i - 2) * 0.033, 0, 0.002);
  const headphone = new THREE.Group();
  headphone.name = "3.5 mm headphone jack";
  headphone.rotation.y = -PI / 2;
  headphone.add(ring(0.031, 0.023, edge), disc(0.023, black));
  put(g, headphone, -w / 2 - 0.001, baseY + 0.008, 1.41);
  const sd = slot(g, 0.37, 0.031, w / 2 + 0.001, baseY + 0.014, 1.31, "right");
  sd.name = "SDXC card slot";
  const hdmi = new THREE.Group();
  const hdmiShape = new THREE.Shape();
  hdmiShape.moveTo(-0.119, 0.035);
  hdmiShape.lineTo(0.119, 0.035);
  hdmiShape.lineTo(0.119, -0.009);
  hdmiShape.lineTo(0.085, -0.035);
  hdmiShape.lineTo(-0.085, -0.035);
  hdmiShape.lineTo(-0.119, -0.009);
  hdmiShape.closePath();
  const hdmiRim = new THREE.Mesh(new THREE.ShapeGeometry(hdmiShape), edge);
  const hdmiHole = new THREE.Mesh(hdmiRim.geometry, black);
  hdmiHole.scale.set(0.85, 0.75, 1);
  hdmiHole.position.z = 0.001;
  hdmi.add(hdmiRim, hdmiHole);
  hdmi.rotation.y = PI / 2;
  hdmi.name = "HDMI port";
  put(g, hdmi, w / 2 + 0.001, baseY + 0.01, 0.24);

  const bottom = shell(
    w - 0.052,
    depth - 0.052,
    0.01,
    0.14,
    metal(dark ? "#303238" : "#b6b9bd", 0.42),
    0.002,
  );
  bottom.rotation.x = -PI / 2;
  bottom.name = "Bottom case seam";
  put(g, bottom, 0, baseY - 0.091, baseZ);
  for (const x of [-2.3, 2.3])
    for (const z of [0.32, depth - 0.47]) {
      const foot = new THREE.Mesh(
        new THREE.CylinderGeometry(0.139, 0.13, 0.026, 64),
        plastic("#121416", 0.8),
      );
      put(g, foot, x, baseY - 0.105, z);
    }
  for (const x of [-2.5, -1.25, 1.25, 2.5])
    for (const z of [0.13, depth - 0.31]) {
      const screw = disc(0.019, metal(dark ? "#4b4c51" : "#8c8e93", 0.3));
      screw.rotation.x = PI / 2;
      put(g, screw, x, baseY - 0.097, z);
      const socket = surface(0.017, 0.004, 0.001, black);
      socket.rotation.x = PI / 2;
      put(g, socket, x, baseY - 0.098, z);
    }
  g.name = "MacBook Pro 16-inch · M4 Pro / M4 Max · 2025 lineup";
  return { group: g, screen: display, screenRatio };
}

/** Dense edge perforations use instances to keep the detailed models responsive. */
function displayGrilles(g: THREE.Group, w: number, h: number) {
  const columns = 70,
    rows = 3;
  const geometry = new THREE.CircleGeometry(0.008, 20);
  const material = plastic("#303236", 0.55);
  const transform = new THREE.Object3D();
  for (const edge of [-1, 1]) {
    const mesh = new THREE.InstancedMesh(
      geometry,
      material,
      columns * rows * 2,
    );
    mesh.name = edge > 0 ? "Top ventilation grille" : "Bottom speaker grille";
    let index = 0;
    for (const side of [-1, 1])
      for (let row = 0; row < rows; row++)
        for (let col = 0; col < columns; col++) {
          transform.position.set(
            side * (0.48 + (col * (w / 2 - 0.68)) / columns),
            edge * (h / 2 + 0.0005),
            -0.058 + row * 0.046,
          );
          transform.rotation.set((-edge * PI) / 2, 0, 0);
          transform.updateMatrix();
          mesh.setMatrixAt(index++, transform.matrix);
        }
    mesh.instanceMatrix.needsUpdate = true;
    g.add(mesh);
  }
}

function displayFoot(
  g: THREE.Group,
  frame: Material,
  depth: number,
  centerZ: number,
) {
  const foot = shell(1.52, depth, 0.064, 0.052, frame, 0.015);
  foot.rotation.x = -PI / 2;
  put(g, foot, 0, -2.928, centerZ);
  foot.name = "Aluminum base";
  for (const x of [-0.63, 0.63]) {
    const pad = shell(
      0.15,
      depth - 0.17,
      0.018,
      0.026,
      plastic("#34363a", 0.75),
      0.004,
    );
    pad.rotation.x = -PI / 2;
    put(g, pad, x, -2.969, centerZ);
  }
}

function standardDisplayStand(
  g: THREE.Group,
  frame: Material,
  edge: Material,
  depth: number,
) {
  // The circular cable route is a cutout through the stand, visible below the panel.
  const shape = roundedShape(1.5, 2.0, 0.055);
  const hole = new THREE.Path();
  hole.absarc(0, 0.05, 0.205, 0, PI * 2, true);
  shape.holes.push(hole);
  const leg = extrude(shape, 0.055, 0.008, frame);
  const positions = leg.geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const y = positions.getY(i) - 1.89;
    const t = THREE.MathUtils.clamp((-y - 0.89) / 2, 0, 1);
    positions.setY(i, y);
    positions.setZ(i, positions.getZ(i) - depth / 2 - 0.1 - t * 0.66);
  }
  leg.geometry.computeVertexNormals();
  leg.name = "Tilt stand with cable aperture";
  g.add(leg);
  // Broad barrel hinge and end caps, on a horizontal axis behind the screen.
  const hinge = cylinder(0.083, 1.3, frame);
  hinge.rotation.set(0, 0, PI / 2);
  put(g, hinge, 0, -0.89, -depth / 2 - 0.07);
  for (const side of [-1, 1]) {
    const cap = disc(0.06, edge);
    cap.rotation.y = (side * PI) / 2;
    put(g, cap, side * 0.651, -0.89, -depth / 2 - 0.07);
  }
  // A rounded bend joins the tilted sheet to the base without a boxy seam.
  const curve = new THREE.Shape();
  curve.moveTo(0.88, -2.79);
  curve.quadraticCurveTo(0.92, -2.896, 0.74, -2.896);
  curve.lineTo(0.65, -2.896);
  curve.lineTo(0.65, -2.953);
  curve.lineTo(0.76, -2.953);
  curve.quadraticCurveTo(1.005, -2.953, 0.936, -2.79);
  curve.closePath();
  const heel = extrude(curve, 1.47, 0.008, frame);
  heel.rotation.y = PI / 2;
  g.add(heel);
  displayFoot(g, frame, 1.68, -0.14);
}

function xdrDisplayStand(g: THREE.Group, frame: Material, edge: Material) {
  // Upright sheet with an actual elongated cable opening, and a separate
  // counterbalance arm. This models the supplied stand in its lower position.
  const upright = roundedShape(1.5, 2.56, 0.07);
  const cable = roundedShape(0.43, 0.84, 0.215);
  // The stand is centered at y=-1.6; the opening remains behind the display.
  const opening = new THREE.Path();
  const points = cable.getPoints(48);
  opening.setFromPoints(points.map((p) => new THREE.Vector2(p.x, p.y + 0.5)));
  upright.holes.push(opening);
  const leg = extrude(upright, 0.065, 0.012, frame);
  put(g, leg, 0, -1.6, -1.37);
  leg.name = "Height stand with cable aperture";
  const rearPivot = new THREE.Vector3(0, -0.64, -1.28),
    frontPivot = new THREE.Vector3(0, -1.2, -0.23);
  const along = new THREE.Vector3()
    .subVectors(frontPivot, rearPivot)
    .normalize();
  const across = new THREE.Vector3(1, 0, 0);
  const up = new THREE.Vector3().crossVectors(across, along).normalize();
  const arm = shell(
    rearPivot.distanceTo(frontPivot) + 0.25,
    0.25,
    1.27,
    0.125,
    frame,
    0.015,
  );
  arm.quaternion.setFromRotationMatrix(
    new THREE.Matrix4().makeBasis(along, up, across),
  );
  arm.position.copy(rearPivot).add(frontPivot).multiplyScalar(0.5);
  arm.name = "Counterbalance arm";
  g.add(arm);
  for (const pivot of [rearPivot, frontPivot])
    for (const side of [-1, 1]) {
      const washer = disc(0.076, edge);
      washer.rotation.y = (side * PI) / 2;
      put(g, washer, side * 0.644, pivot.y, pivot.z);
      const seam = ring(0.049, 0.043, plastic("#696c71"));
      seam.rotation.y = (side * PI) / 2;
      put(g, seam, side * 0.645, pivot.y, pivot.z);
      const screw = new THREE.Mesh(
        new THREE.CircleGeometry(0.021, 6),
        metal("#83868c", 0.25),
      );
      screw.rotation.y = (side * PI) / 2;
      put(g, screw, side * 0.646, pivot.y, pivot.z);
    }
  const hinge = cylinder(0.105, 1.29, frame);
  hinge.rotation.set(0, 0, PI / 2);
  put(g, hinge, 0, frontPivot.y, frontPivot.z);
  const bend = new THREE.Shape();
  bend.moveTo(1.333, -2.78);
  bend.quadraticCurveTo(1.333, -2.896, 1.2, -2.896);
  bend.lineTo(1.13, -2.896);
  bend.lineTo(1.13, -2.954);
  bend.lineTo(1.25, -2.954);
  bend.quadraticCurveTo(1.405, -2.954, 1.405, -2.78);
  bend.closePath();
  const heel = extrude(bend, 1.47, 0.008, frame);
  heel.rotation.y = PI / 2;
  g.add(heel);
  displayFoot(g, frame, 2.14, -0.4);
}

function studioDisplay(d: Device, xdr: boolean): DeviceModel {
  const g = new THREE.Group();
  // Apple specifications: 623 × 362 mm enclosure, 31 / 33 mm deep,
  // and a 27-inch 5120 × 2880 display. The screen is centered, with no chin.
  const w = 6.23,
    h = 3.62,
    depth = xdr ? 0.33 : 0.31;
  const frame = metal(finishFor(d.kind, d.finish).color, 0.3);
  const edge = metal("#d0d2d5", 0.19),
    black = glass("#060708");
  const enclosure = shell(w, h, depth, 0.058, frame, 0.018);
  enclosure.name = "Machined aluminum enclosure";
  g.add(enclosure);
  const back = shell(w - 0.042, h - 0.042, 0.016, 0.045, frame, 0.004);
  put(g, back, 0, 0, -depth / 2 - 0.003);
  // A fine polished lip and black gasket separate the full glass front from metal.
  put(
    g,
    shell(w - 0.01, h - 0.01, 0.017, 0.052, edge, 0.004),
    0,
    0,
    depth / 2 - 0.006,
  );
  put(
    g,
    shell(w - 0.025, h - 0.025, 0.011, 0.047, plastic("#191a1c"), 0.003),
    0,
    0,
    depth / 2 + 0.003,
  );
  put(
    g,
    shell(w - 0.035, h - 0.035, 0.016, 0.044, black, 0.004),
    0,
    0,
    depth / 2 + 0.009,
  );
  const sw = 5.978,
    sh = (sw * 9) / 16;
  put(
    g,
    surface(sw + 0.008, sh + 0.008, 0.006, plastic("#010203")),
    0,
    0,
    depth / 2 + 0.018,
  );
  const display = screen(g, sw, sh, 0.004, 0, depth / 2 + 0.02);
  frontLens(g, 0, 1.746, depth / 2 + 0.019, 0.026);
  put(g, disc(0.006, glass("#23332c")), 0.087, 1.746, depth / 2 + 0.02);
  rearLogo(g, 0.75, 0.42, -depth / 2 - 0.012, "#222429");
  for (let i = 0; i < 4; i++) {
    const port = slot(
      g,
      0.1,
      0.041,
      1.71 + i * 0.165,
      -1.5,
      -depth / 2 - 0.013,
      "rear",
    );
    port.rotation.z = PI / 2;
    put(port, surface(0.069, 0.008, 0.003, plastic("#62656b")), 0, 0, 0.002);
  }
  const grommet = cylinder(0.085, 0.04, plastic("#25272a", 0.65));
  put(g, grommet, 0, -1.5, -depth / 2 - 0.025);
  displayGrilles(g, w, h);
  if (xdr) xdrDisplayStand(g, frame, edge);
  else standardDisplayStand(g, frame, edge, depth);
  g.name = xdr ? "Studio Display XDR" : "Studio Display";
  return { group: g, screen: display, screenRatio: 16 / 9 };
}

export function buildDeviceModel(d: Device): DeviceModel {
  if (d.kind === "custom")
    throw new Error("Imported models load asynchronously.");
  const builders = {
    phone: iphone,
    tablet: ipad,
    laptop,
    monitor: imac,
    "studio-display": (device: Device) => studioDisplay(device, false),
    "studio-display-xdr": (device: Device) => studioDisplay(device, true),
    "smart-terminal": smartTerminal,
    "card-reader": keypadTerminal,
    "countertop-pos": countertopTerminal,
  } satisfies Record<
    Exclude<Device["kind"], "custom">,
    (device: Device) => DeviceModel
  >;
  const result = builders[d.kind](d);
  result.group.traverse((o) => {
    o.userData.deviceId = d.id;
  });
  return result;
}
