import {
  DEFAULT_LIGHTING,
  validateLighting,
  type SceneLighting,
} from "./scene-lighting.ts";
import {
  defaultScreenOrientation,
  validateImportedModels,
  validateModelBinding,
  type ImportedModel,
} from "./imported-model.ts";
import { MACBOOK_PRO_16_M4 } from "./device-specs.ts";
import { automaticScreen } from "./model-screen.ts";

export type DeviceKind =
  | "phone"
  | "tablet"
  | "laptop"
  | "monitor"
  | "studio-display"
  | "studio-display-xdr"
  | "smart-terminal"
  | "card-reader"
  | "countertop-pos"
  | "custom";
export type BuiltinDeviceKind = Exclude<DeviceKind, "custom">;
export type Fit = "cover" | "contain" | "stretch";
export type Finish =
  "silver" | "graphite" | "sand" | "blue" | "green" | "lavender";
export interface Device {
  id: string;
  kind: DeviceKind;
  name: string;
  finish: Finish;
  x: number;
  y: number;
  z: number;
  rx: number;
  ry: number;
  rz: number;
  scale: number;
  screenshot: string;
  fit: Fit;
  visible: boolean;
  modelId?: string;
  screenSurface?: string;
  screenSelection?: "auto" | "manual";
  screenAspect?: number;
  screenRotation?: number;
  screenFlipX?: boolean;
  screenFlipY?: boolean;
}
export interface Asset {
  id: string;
  name: string;
  src: string;
  width: number;
  height: number;
}
export interface Project {
  version: 1;
  name: string;
  devices: Device[];
  assets: Asset[];
  models?: ImportedModel[];
  background: "transparent" | "light" | "dark" | "mint";
  ratio: "16:9" | "4:3" | "1:1" | "9:16";
  shadows: boolean;
  lighting: SceneLighting;
  zoom: number;
}
export const CATALOG: {
  kind: BuiltinDeviceKind;
  name: string;
  description: string;
  screen: string;
  thumbnail?: string;
}[] = [
  {
    kind: "phone",
    name: "iPhone 17",
    description: "6.3-inch · Aluminum",
    screen: "1206 × 2622",
  },
  {
    kind: "tablet",
    name: "iPad Pro",
    description: "13-inch · Ultra Retina XDR",
    screen: "2752 × 2064",
  },
  {
    kind: "laptop",
    name: MACBOOK_PRO_16_M4.name,
    thumbnail: "/models/macbook-pro-16-m4-2025.webp",
    description: MACBOOK_PRO_16_M4.description,
    screen: `${MACBOOK_PRO_16_M4.screenWidth} × ${MACBOOK_PRO_16_M4.screenHeight}`,
  },
  {
    kind: "monitor",
    name: "iMac",
    description: "24-inch · Retina 4.5K",
    screen: "4480 × 2520",
  },
  {
    kind: "studio-display",
    name: "Studio Display",
    description: "27-inch · Retina 5K",
    screen: "5120 × 2880",
  },
  {
    kind: "studio-display-xdr",
    name: "Studio Display XDR",
    description: "27-inch · Retina 5K XDR",
    screen: "5120 × 2880",
  },
  {
    kind: "smart-terminal",
    name: "Square Terminal",
    description: "5.5-inch · Built-in receipt printer",
    screen: "720 × 1280",
    thumbnail: "/models/square-terminal.webp",
  },
  {
    kind: "card-reader",
    name: "Card Reader",
    description: "Portable · Physical PIN pad",
    screen: "640 × 480",
    thumbnail: "/models/card-reader.webp",
  },
  {
    kind: "countertop-pos",
    name: "Countertop POS",
    description: "Countertop · Landscape touchscreen",
    screen: "1280 × 800",
    thumbnail: "/models/countertop-pos.webp",
  },
];
export function isPaymentDevice(kind: DeviceKind) {
  return (
    kind === "smart-terminal" ||
    kind === "card-reader" ||
    kind === "countertop-pos"
  );
}
type FinishInfo = { name: string; color: string };
export const FINISHES: Record<Finish, FinishInfo> = {
  silver: { name: "Silver", color: "#c7c9cd" },
  graphite: { name: "Space Black", color: "#37383b" },
  sand: { name: "Natural", color: "#bfb3a1" },
  blue: { name: "Blue", color: "#a9bccf" },
  green: { name: "Green", color: "#adbdac" },
  lavender: { name: "Lavender", color: "#c6bfdc" },
};
export function finishesFor(
  kind: DeviceKind,
): Partial<Record<Finish, FinishInfo>> {
  if (kind === "custom")
    return { silver: { name: "Original materials", color: "#99aba2" } };
  if (kind === "smart-terminal")
    return { silver: { name: "White", color: "#e7eaea" } };
  if (isPaymentDevice(kind))
    return {
      silver: { name: "White", color: "#e1e5e5" },
      graphite: { name: "Graphite", color: "#293239" },
    };
  if (kind === "phone")
    return {
      silver: { name: "White", color: "#e6e6e3" },
      graphite: { name: "Black", color: "#333437" },
      blue: { name: "Mist Blue", color: "#c2ccdb" },
      green: { name: "Sage", color: "#b6bca9" },
      lavender: FINISHES.lavender,
    };
  if (kind === "monitor")
    return {
      silver: FINISHES.silver,
      graphite: { name: "Space Gray", color: "#62666d" },
      blue: { name: "Blue", color: "#8caac3" },
      green: { name: "Green", color: "#a5b7a6" },
    };
  if (kind === "studio-display" || kind === "studio-display-xdr")
    return { silver: FINISHES.silver };
  return { silver: FINISHES.silver, graphite: FINISHES.graphite };
}
export function finishFor(kind: DeviceKind, finish: Finish): FinishInfo {
  return finishesFor(kind)[finish] || finishesFor(kind).silver!;
}
// Upgrade earlier generic library labels while preserving custom device names,
// screenshots, placement, and all other project data.
export function upgradeProject(project: Project): Project {
  const oldNames: Partial<Record<DeviceKind, string[]>> = {
    phone: ["Phone Pro"],
    tablet: ["Tablet Pro"],
    monitor: ["Studio Display"],
    laptop: ["Laptop Pro", "MacBook Pro"],
    "smart-terminal": ["Smart Terminal"],
  };
  return {
    ...project,
    lighting: { ...DEFAULT_LIGHTING, ...project.lighting },
    devices: project.devices.map((d) => {
      if (d.kind === "custom") {
        if (d.screenSelection === "manual") return d;
        const model = project.models?.find((m) => m.id === d.modelId);
        const screen = model && automaticScreen(model);
        if (!model || !screen) return d;
        // Keep existing crop/orientation adjustments when the same screen is bound.
        return {
          ...d,
          ...(d.screenSurface === screen.id
            ? {}
            : defaultScreenOrientation(model)),
          screenSelection: "auto",
          screenSurface: screen.id,
          screenAspect:
            d.screenSurface === screen.id
              ? (d.screenAspect ?? screen.aspect)
              : screen.aspect,
        };
      }
      const catalog = CATALOG.find((c) => c.kind === d.kind)!;
      const oldName = oldNames[d.kind]?.find(
        (name) =>
          d.name === name ||
          (d.name.startsWith(name + " ") &&
            /^ \d+$/.test(d.name.slice(name.length))),
      );
      return {
        ...d,
        name: oldName ? d.name.replace(oldName, catalog.name) : d.name,
        finish: finishesFor(d.kind)[d.finish] ? d.finish : "silver",
      };
    }),
  };
}
export const BACKGROUNDS = {
  transparent: null,
  light: "#f3f2ee",
  dark: "#23262b",
  mint: "#dce9dc",
};
export const uid = () => crypto.randomUUID();
export const aspect = (ratio: Project["ratio"]) => {
  const [w, h] = ratio.split(":").map(Number);
  return w / h;
};
export function newDevice(kind: DeviceKind, id = uid()): Device {
  return {
    id,
    kind,
    name: CATALOG.find((d) => d.kind === kind)?.name || "Imported model",
    finish: kind === "card-reader" ? "graphite" : "silver",
    x: 0,
    y: ["studio-display", "studio-display-xdr", "laptop"].includes(kind)
      ? 0.5
      : 0,
    z: 0,
    rx:
      kind === "laptop"
        ? 8
        : kind === "smart-terminal"
          ? 35
          : kind === "card-reader"
            ? -8
            : 0,
    ry: -12,
    rz: 0,
    scale: kind === "laptop" ? 0.85 : 1,
    screenshot: isPaymentDevice(kind)
      ? `/screens/${kind}.svg`
      : kind === "phone"
        ? "/screens/mobile.svg"
        : kind === "laptop"
          ? "/screens/laptop.svg"
          : "/screens/dashboard.svg",
    fit: "cover",
    visible: true,
  };
}
export function newCustomDevice(model: ImportedModel): Device {
  const screen = automaticScreen(model);
  return {
    ...newDevice("custom"),
    ...defaultScreenOrientation(model),
    name: model.name,
    modelId: model.id,
    screenSelection: "auto",
    ...(screen
      ? { screenSurface: screen.id, screenAspect: screen.aspect }
      : {}),
    ry: 0,
  };
}
export const DEFAULT_PROJECT: Project = {
  version: 1,
  name: "Product showcase",
  background: "transparent",
  ratio: "16:9",
  shadows: true,
  lighting: { ...DEFAULT_LIGHTING },
  zoom: 1,
  assets: [
    {
      id: "demo-desktop",
      name: "Overview · Desktop",
      src: "/screens/dashboard.svg",
      width: 4480,
      height: 2520,
    },
    {
      id: "demo-mobile",
      name: "Overview · Mobile",
      src: "/screens/mobile.svg",
      width: 1206,
      height: 2622,
    },
    {
      id: "demo-tablet",
      name: "Analytics · Tablet",
      src: "/screens/analytics.svg",
      width: 2752,
      height: 2064,
    },
  ],
  devices: [
    {
      ...newDevice("monitor", "display-1"),
      x: -0.55,
      y: 0.7,
      z: -0.65,
      ry: -10,
      rx: 1,
      scale: 0.92,
    },
    {
      ...newDevice("tablet", "tablet-1"),
      x: 1.62,
      y: -0.7,
      z: 1.1,
      ry: -15,
      rx: -6,
      rz: -5,
      scale: 0.78,
      screenshot: "/screens/analytics.svg",
    },
    {
      ...newDevice("phone", "phone-1"),
      x: -2.6,
      y: -0.75,
      z: 2,
      ry: -12,
      rz: 5,
      scale: 0.9,
      finish: "graphite",
    },
  ],
};
export function blankProject(): Project {
  return {
    version: 1,
    name: "Untitled",
    background: DEFAULT_PROJECT.background,
    ratio: DEFAULT_PROJECT.ratio,
    shadows: DEFAULT_PROJECT.shadows,
    lighting: { ...DEFAULT_LIGHTING },
    zoom: 1,
    assets: [],
    devices: [],
    models: [],
  };
}
export type Preset = "showcase" | "duo" | "floating" | "hero";

// The first layout matches the saved reference: a display behind a smaller
// phone on the left and a landscape iPad on the right, framed at 16:9.
const DEVICE_FAMILY_LAYOUT: Device[] = [
  {
    ...newDevice("studio-display", "family-display"),
    x: -0.54,
    y: 0.52,
    z: -0.65,
    rx: -1,
    ry: -2,
    rz: 0,
    scale: 0.88,
  },
  {
    ...newDevice("phone", "family-phone"),
    x: -2.88,
    y: -1.2,
    z: 1.5,
    rx: -5,
    ry: 24,
    rz: 3,
    scale: 0.64,
    finish: "graphite",
  },
  {
    ...newDevice("tablet", "family-tablet"),
    x: 2.06,
    y: -1.21,
    z: 1.1,
    rx: -10,
    ry: -27,
    rz: -2,
    scale: 0.73,
    screenshot: "/screens/analytics.svg",
  },
];

export function applyPreset(project: Project, preset: Preset): Project {
  const old = project.devices;
  const take = (kind: DeviceKind, i: number) => ({
    ...newDevice(kind),
    screenshot:
      old.find((d) => d.kind === kind)?.screenshot ||
      newDevice(kind).screenshot,
    id: uid(),
    name: `${CATALOG.find((d) => d.kind === kind)!.name}${i ? ` ${i + 1}` : ""}`,
  });
  let devices: Device[];
  if (preset === "showcase")
    devices = DEVICE_FAMILY_LAYOUT.map((d) => {
      const existing =
        old.find((o) => o.kind === d.kind) ||
        (d.kind === "studio-display"
          ? old.find((o) => ["monitor", "studio-display-xdr"].includes(o.kind))
          : undefined);
      return {
        ...d,
        id: uid(),
        name: existing?.kind === d.kind ? existing.name : d.name,
        screenshot: existing?.screenshot || d.screenshot,
        fit: existing?.fit || d.fit,
        finish:
          existing && finishesFor(d.kind)[existing.finish]
            ? existing.finish
            : d.finish,
      };
    });
  else if (preset === "duo")
    devices = [
      { ...take("laptop", 0), x: -0.6, y: 0.55, ry: -15, rx: 4, scale: 0.85 },
      { ...take("phone", 0), x: 2.25, y: -0.4, z: 2, ry: -18, rz: 4 },
    ];
  else if (preset === "floating")
    devices = [
      {
        ...take("phone", 0),
        x: -1.15,
        y: 0.3,
        ry: -25,
        rx: 12,
        rz: -16,
        scale: 1.25,
      },
      {
        ...take("phone", 1),
        x: 1.25,
        y: -0.2,
        z: -0.3,
        ry: 22,
        rx: -10,
        rz: -16,
        scale: 1.25,
      },
    ];
  else
    devices = [{ ...take("phone", 0), rx: -6, ry: -24, rz: -9, scale: 1.55 }];
  return {
    ...project,
    devices,
    ratio: preset === "showcase" ? "16:9" : project.ratio,
    zoom: 1,
  };
}
export function validateProject(value: unknown): value is Project {
  if (!value || typeof value !== "object") return false;
  const p = value as Project;
  const safeImage = (s: unknown) =>
    typeof s === "string" &&
    ([
      "/screens/dashboard.svg",
      "/screens/laptop.svg",
      "/screens/mobile.svg",
      "/screens/analytics.svg",
      "/screens/smart-terminal.svg",
      "/screens/card-reader.svg",
      "/screens/countertop-pos.svg",
    ].includes(s) ||
      /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(s));
  return (
    p.version === 1 &&
    typeof p.name === "string" &&
    p.name.length <= 100 &&
    Object.keys(BACKGROUNDS).includes(p.background) &&
    ["16:9", "4:3", "1:1", "9:16"].includes(p.ratio) &&
    typeof p.shadows === "boolean" &&
    (p.lighting === undefined || validateLighting(p.lighting)) &&
    Number.isFinite(p.zoom) &&
    p.zoom >= 0.4 &&
    p.zoom <= 2 &&
    Array.isArray(p.assets) &&
    p.assets.length <= 100 &&
    p.assets.every(
      (a) =>
        a &&
        typeof a.id === "string" &&
        typeof a.name === "string" &&
        safeImage(a.src) &&
        Number.isFinite(a.width) &&
        Number.isFinite(a.height) &&
        a.width > 0 &&
        a.height > 0,
    ) &&
    (p.models === undefined || validateImportedModels(p.models)) &&
    Array.isArray(p.devices) &&
    p.devices.length <= 30 &&
    new Set(p.devices.map((d) => d?.id)).size === p.devices.length &&
    p.devices.every(
      (d) =>
        d &&
        typeof d.id === "string" &&
        typeof d.name === "string" &&
        (d.kind === "custom"
          ? validateModelBinding(d, p.models || [])
          : CATALOG.some((c) => c.kind === d.kind)) &&
        Object.keys(FINISHES).includes(d.finish) &&
        ["cover", "contain", "stretch"].includes(d.fit) &&
        safeImage(d.screenshot) &&
        typeof d.visible === "boolean" &&
        ["x", "y", "z", "rx", "ry", "rz", "scale"].every((k) =>
          Number.isFinite(d[k as keyof Device]),
        ) &&
        Math.abs(d.x) <= 20 &&
        Math.abs(d.y) <= 20 &&
        Math.abs(d.z) <= 10 &&
        [d.rx, d.ry, d.rz].every((v) => Math.abs(v) <= 360) &&
        d.scale >= 0.2 &&
        d.scale <= 3,
    )
  );
}
