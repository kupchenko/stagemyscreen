import * as THREE from "three";
import { type Device, finishFor } from "./studio.ts";
import {
  type DeviceModel,
  extrude,
  shell,
  surface,
  put,
  plastic,
  metal,
  glass,
  disc,
  ring,
} from "./model-primitives.ts";

// Dimension-referenced Square Terminal and two original generic payment models.
const PI = Math.PI;
function materials(d: Device) {
  return {
    body: plastic(finishFor(d.kind, d.finish).color, 0.42),
    seam: plastic("#181c20", 0.58),
    trim: metal(d.finish === "graphite" ? "#444a50" : "#b8bec1", 0.34),
    rubber: plastic("#151a1d", 0.85),
    glass: glass("#050a0e"),
  };
}
function label(
  g: THREE.Group,
  w: number,
  h: number,
  x: number,
  y: number,
  z: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
) {
  if (typeof document === "undefined") return;
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = Math.round((1024 * h) / w);
  const ctx = canvas.getContext("2d")!;
  draw(ctx, canvas.width, canvas.height);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  const mesh = surface(
    w,
    h,
    0.005,
    new THREE.MeshBasicMaterial({
      map,
      transparent: true,
      alphaTest: 0.02,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  put(g, mesh, x, y, z);
  return mesh;
}
function contactless(
  g: THREE.Group,
  x: number,
  y: number,
  z: number,
  size: number,
  color = "#a9b7bb",
) {
  const mark = label(g, size, size, x, y, z, (ctx, w, h) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = w * 0.048;
    ctx.lineCap = "round";
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(w * 0.19, h / 2, w * (0.18 + i * 0.17), -PI / 3, PI / 3);
      ctx.stroke();
    }
  });
  if (mark) mark.name = "Contactless payment mark";
}
function paymentScreen(
  g: THREE.Group,
  w: number,
  h: number,
  y: number,
  z: number,
) {
  put(
    g,
    surface(w + 0.095, h + 0.095, 0.066, glass("#040809")),
    0,
    y,
    z - 0.002,
  );
  const display = surface(
    w,
    h,
    0.036,
    new THREE.MeshBasicMaterial({ color: "white", toneMapped: false }),
  );
  display.name = "Screenshot";
  put(g, display, 0, y, z);
  return display;
}
function readerSlot(
  g: THREE.Group,
  y: number,
  z: number,
  width: number,
  bottom = false,
) {
  const part = new THREE.Group();
  part.name = "Chip card insertion slot";
  part.add(surface(width + 0.055, 0.099, 0.031, plastic("#41494f")));
  put(part, surface(width, 0.046, 0.017, plastic("#010405")), 0, 0, 0.002);
  for (let i = 0; i < 6; i++)
    put(
      part,
      surface(0.025, 0.007, 0.002, metal("#b9a675", 0.38)),
      (i - 2.5) * 0.036,
      0.004,
      0.003,
    );
  if (bottom) part.rotation.x = PI / 2;
  put(g, part, 0, y, z);
}
function rearDetails(
  g: THREE.Group,
  y: number,
  z: number,
  w: number,
  h: number,
) {
  const back = new THREE.Group();
  back.rotation.y = PI;
  put(g, back, 0, y, z);
  put(back, shell(w, h, 0.025, 0.105, plastic("#252c31"), 0.006));
  back.name = "Removable battery cover";
  for (const x of [-w * 0.4, w * 0.4])
    for (const sy of [-h * 0.42, h * 0.42]) {
      put(back, disc(0.028, metal("#656f76", 0.4)), x, sy, 0.014);
      put(back, surface(0.029, 0.006, 0.002, plastic("#0e1418")), x, sy, 0.015);
    }
  for (let i = 0; i < 5; i++)
    put(
      back,
      surface(0.36, 0.021, 0.01, plastic("#080d10")),
      0,
      -h * 0.27 + i * 0.06,
      0.014,
    );
  label(back, w * 0.62, 0.34, 0, 0.06, 0.015, (ctx, width, height) => {
    ctx.fillStyle = "#abb3b6";
    ctx.font = `${height * 0.2}px Arial`;
    ctx.textAlign = "center";
    ctx.fillText("PAYMENT TERMINAL", width / 2, height * 0.23);
    for (let i = 0; i < 56; i++) {
      const line = ((i * 13 + 7) % 4) + 1;
      ctx.fillRect(
        width * (0.06 + i * 0.016),
        height * 0.42,
        (line * width) / 500,
        height * 0.4,
      );
    }
  });
}
function sidePort(g: THREE.Group, x: number, y: number, z: number) {
  const port = new THREE.Group();
  port.name = "Recessed USB-C port";
  port.rotation.y = x > 0 ? PI / 2 : -PI / 2;
  put(g, port, x, y, z);
  port.add(surface(0.19, 0.07, 0.035, metal("#818c93", 0.35)));
  put(port, surface(0.16, 0.048, 0.024, plastic("#080b0e")), 0, 0, 0.002);
  put(port, surface(0.106, 0.009, 0.002, plastic("#768089")), 0, 0, 0.003);
}

export function smartTerminal(d: Device): DeviceModel {
  const g = new THREE.Group(),
    m = materials(d);
  g.name = "Square Terminal";
  // Square's published 86.4 × 142.2 × 63.5 mm envelope. The touch surface
  // slopes toward the customer; the taller rear houses the 57 mm paper roll.
  const w = 2.1,
    mm = w / 86.4,
    length = 142.2 * mm,
    height = 63.5 * mm,
    frontH = 0.42,
    floor = -0.78;
  const roof = (x: number) =>
    frontH + ((x + length / 2) / length) * (height - frontH) - 0.055;
  const profile = new THREE.Shape();
  profile.moveTo(-length / 2 + 0.13, 0.055);
  profile.lineTo(length / 2 - 0.13, 0.055);
  profile.quadraticCurveTo(length / 2 - 0.04, 0.055, length / 2 - 0.04, 0.15);
  profile.lineTo(length / 2 - 0.04, height - 0.15);
  profile.quadraticCurveTo(
    length / 2 - 0.04,
    roof(length / 2 - 0.14),
    length / 2 - 0.14,
    roof(length / 2 - 0.14),
  );
  profile.lineTo(-length / 2 + 0.13, roof(-length / 2 + 0.13));
  profile.quadraticCurveTo(
    -length / 2 + 0.04,
    frontH - 0.06,
    -length / 2 + 0.04,
    frontH - 0.145,
  );
  profile.lineTo(-length / 2 + 0.04, 0.15);
  profile.quadraticCurveTo(
    -length / 2 + 0.04,
    0.055,
    -length / 2 + 0.13,
    0.055,
  );
  profile.closePath();
  const body = extrude(profile, w, 0.041, m.body);
  body.rotation.y = PI / 2;
  body.name = "Rounded wedge enclosure";
  put(g, body, 0, floor, 0);
  const underside = shell(
    w - 0.12,
    length - 0.1,
    0.055,
    0.18,
    plastic("#c4c9cb"),
    0.015,
  );
  underside.rotation.x = -PI / 2;
  underside.name = "Bottom service plate";
  put(g, underside, 0, floor + 0.026, 0);
  for (const x of [-0.76, 0.76])
    for (const z of [-1.39, 1.37]) {
      const foot = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.115, 0.033, 48),
        m.rubber,
      );
      put(g, foot, x, floor - 0.01, z);
    }
  const mount = new THREE.Group();
  mount.rotation.x = PI / 2;
  mount.name = "Quarter-inch mounting socket";
  mount.add(ring(0.083, 0.05, m.trim), disc(0.05, m.seam));
  put(g, mount, 0, floor - 0.005, -0.17);
  const panel = new THREE.Group();
  panel.name = "Sloped 5.5-inch touchscreen";
  panel.rotation.x = -Math.atan2(length, height - frontH);
  put(g, panel, 0, floor + (height + frontH) / 2 + 0.006, 0);
  const deckLength = Math.hypot(length - 0.08, height - frontH);
  put(panel, shell(w - 0.025, deckLength, 0.04, 0.17, m.body, 0.01));
  put(
    panel,
    surface(w - 0.14, deckLength - 0.19, 0.135, glass("#070a0b")),
    0,
    -0.048,
    0.024,
  );
  // 5.5-inch portrait, 16:9 active area. The sample UI is replaceable.
  const sw = (mm * 139.7 * 9) / Math.hypot(9, 16),
    sh = (sw * 16) / 9;
  const display = paymentScreen(panel, sw, sh, -0.072, 0.027);
  const outletY = deckLength / 2 - 0.065;
  const outlet = put(
    panel,
    surface(mm * 60, 0.044, 0.015, plastic("#343b3e")),
    0,
    outletY,
    0.026,
  );
  outlet.name = "Receipt printer outlet";
  put(panel, surface(mm * 57, 0.008, 0.002, m.trim), 0, outletY - 0.021, 0.028);
  for (let i = 0; i < 48; i++) {
    const tooth = new THREE.Mesh(new THREE.CircleGeometry(0.006, 3), m.trim);
    put(panel, tooth, mm * 57 * (i / 47 - 0.5), outletY - 0.019, 0.029);
  }
  // Deep front chip-card mouth, with a white molded lip and dark inner guides.
  readerSlot(g, floor + 0.245, length / 2 + 0.003, mm * 57);
  const lip = shell(mm * 60, 0.035, 0.085, 0.015, m.body, 0.006);
  put(g, lip, 0, floor + 0.299, length / 2 - 0.008);
  // Card swipe channel runs down the right side of the sloping glass.
  const swipe = put(
    panel,
    surface(0.047, deckLength - 0.48, 0.015, plastic("#161d21")),
    w / 2 - 0.04,
    -0.04,
    0.029,
  );
  swipe.name = "Magnetic stripe channel";
  sidePort(g, -w / 2 - 0.002, floor + 0.16, -1.18);
  const power = shell(0.26, 0.12, 0.018, 0.047, m.body, 0.005);
  power.rotation.y = -PI / 2;
  power.name = "Power button";
  put(g, power, -w / 2 - 0.002, floor + 0.24, 1.18);
  // Printer-door seam on the rear, and Square's geometric mark.
  const rear = new THREE.Group();
  rear.rotation.y = PI;
  put(g, rear, 0, floor + 0.8, -length / 2 + 0.035);
  put(
    rear,
    surface(w - 0.19, 0.023, 0.008, plastic("#b8c0c3")),
    0,
    -0.43,
    0.007,
  );
  label(rear, 0.29, 0.29, 0, 0.035, 0.009, (ctx, width) => {
    ctx.strokeStyle = "#8d979b";
    ctx.lineWidth = width * 0.115;
    ctx.beginPath();
    ctx.roundRect(
      width * 0.12,
      width * 0.12,
      width * 0.76,
      width * 0.76,
      width * 0.15,
    );
    ctx.stroke();
    ctx.fillStyle = "#8d979b";
    ctx.beginPath();
    ctx.roundRect(
      width * 0.38,
      width * 0.38,
      width * 0.24,
      width * 0.24,
      width * 0.04,
    );
    ctx.fill();
  });
  return { group: g, screen: display, screenRatio: 9 / 16 };
}

export function keypadTerminal(d: Device): DeviceModel {
  const g = new THREE.Group(),
    m = materials(d);
  g.name = "Card Reader · physical PIN pad";
  put(g, shell(1.64, 3.48, 0.56, 0.235, m.body, 0.065));
  put(g, shell(1.57, 3.36, 0.05, 0.21, m.seam, 0.012), 0, 0, 0.244);
  put(g, shell(1.53, 3.32, 0.055, 0.19, m.body, 0.013), 0, 0, 0.283);
  put(g, shell(1.43, 1.86, 0.035, 0.13, m.seam, 0.008), 0, -0.68, 0.319);
  const display = paymentScreen(g, 1.29, (1.29 * 3) / 4, 0.73, 0.319);
  contactless(
    g,
    0,
    1.47,
    0.317,
    0.25,
    d.finish === "graphite" ? "#d0dadc" : "#5b686f",
  );
  const keys = new THREE.Group();
  keys.name = "Raised PIN keypad";
  g.add(keys);
  const symbols = [
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "*",
    "0",
    "#",
    "×",
    "←",
    "✓",
  ];
  for (let i = 0; i < 15; i++) {
    const row = Math.floor(i / 3),
      x = ((i % 3) - 1) * 0.455,
      y = -0.12 - row * 0.306;
    const color =
      i < 12
        ? d.finish === "graphite"
          ? "#3b454c"
          : "#e7eaeb"
        : ["#a54c4a", "#c39e50", "#387d67"][i - 12];
    const key = put(
      keys,
      shell(0.376, 0.236, 0.074, 0.059, plastic(color, 0.52), 0.018),
      x,
      y,
      0.365,
    );
    key.name = `PIN key ${symbols[i]}`;
    if (i === 4)
      put(keys, disc(0.009, plastic("#adb9bc")), x, y - 0.081, 0.404);
  }
  label(g, 1.31, 1.5, 0, -0.732, 0.405, (ctx, w, h) => {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    symbols.forEach((s, i) => {
      ctx.fillStyle =
        i >= 12 || d.finish === "graphite" ? "#f5f7f8" : "#27343c";
      ctx.font = `${w * (i < 12 ? 0.09 : 0.12)}px Arial`;
      const x = w * (0.5 + (((i % 3) - 1) * 0.455) / 1.31),
        y = h * (0.5 + ((Math.floor(i / 3) - 2) * 0.306) / 1.5);
      ctx.fillText(s, x, y);
    });
  });
  readerSlot(g, -1.737, 0.02, 1.19, true);
  sidePort(g, -0.818, 0.48, -0.075);
  rearDetails(g, -0.12, -0.288, 1.31, 2.5);
  // Protective side rails and a shallow magnetic-stripe channel.
  for (const side of [-1, 1])
    put(
      g,
      shell(0.095, 2.38, 0.08, 0.045, m.rubber, 0.018),
      side * 0.792,
      -0.23,
      -0.13,
    );
  return { group: g, screen: display, screenRatio: 4 / 3 };
}

export function countertopTerminal(d: Device): DeviceModel {
  const g = new THREE.Group(),
    m = materials(d);
  g.name = "Countertop POS · landscape touchscreen";
  const panel = new THREE.Group();
  panel.name = "Tilted touchscreen assembly";
  panel.rotation.x = (-12 * PI) / 180;
  put(g, panel, 0, 0.49, 0.04);
  put(panel, shell(4.78, 3.11, 0.32, 0.2, m.body, 0.045));
  put(panel, shell(4.7, 3.04, 0.025, 0.17, m.seam, 0.006), 0, 0, 0.153);
  put(panel, surface(4.66, 2.99, 0.15, m.glass), 0, 0, 0.17);
  const display = paymentScreen(panel, 4.34, (4.34 * 10) / 16, 0.054, 0.178);
  contactless(panel, 0, -1.405, 0.179, 0.14);
  put(panel, disc(0.015, plastic("#92c8a7")), 2.13, -1.405, 0.179);
  for (let i = 0; i < 7; i++)
    put(
      panel,
      surface(0.1, 0.019, 0.009, plastic("#45525b")),
      -2.17 + i * 0.12,
      -1.405,
      0.179,
    );
  // Broad curved support, with a separate tilt hinge and weighted nonslip base.
  const stand = shell(1.03, 2.22, 0.2, 0.14, m.body, 0.038);
  stand.rotation.x = (-15 * PI) / 180;
  put(g, stand, 0, -0.98, -0.59);
  stand.name = "Countertop pedestal";
  const hinge = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.18, 1.08, 64),
    m.trim,
  );
  hinge.rotation.z = PI / 2;
  put(g, hinge, 0, -0.02, -0.53);
  const base = shell(3.05, 2.1, 0.18, 0.32, m.body, 0.045);
  base.rotation.x = -PI / 2;
  put(g, base, 0, -2.03, -0.12);
  const rubber = shell(2.9, 1.95, 0.025, 0.29, m.rubber, 0.006);
  rubber.rotation.x = -PI / 2;
  put(g, rubber, 0, -2.135, -0.12);
  // The reader sits at the front of the base; its slot stays visible from desk height.
  readerSlot(g, -2.021, 0.938, 1.34);
  const back = new THREE.Group();
  back.rotation.y = PI;
  put(g, back, 0, -1.945, -1.178);
  put(back, surface(1.65, 0.105, 0.03, m.seam));
  for (const x of [-0.5, -0.2, 0.12]) {
    const socket = put(
      back,
      surface(0.2, 0.072, 0.015, plastic("#030709")),
      x,
      0,
      0.002,
    );
    socket.name = "Recessed base I/O";
  }
  put(back, ring(0.043, 0.022, m.trim), 0.57, 0, 0.003);
  const grille = new THREE.InstancedMesh(
    new THREE.CircleGeometry(0.009, 12),
    m.seam,
    240,
  );
  const transform = new THREE.Object3D();
  transform.rotation.y = PI;
  for (let i = 0; i < 240; i++) {
    transform.position.set(
      ((i % 40) - 19.5) * 0.077,
      -0.82 + Math.floor(i / 40) * 0.047,
      -0.163,
    );
    transform.updateMatrix();
    grille.setMatrixAt(i, transform.matrix);
  }
  grille.instanceMatrix.needsUpdate = true;
  grille.name = "Rear ventilation grille";
  panel.add(grille);
  return { group: g, screen: display, screenRatio: 16 / 10 };
}
