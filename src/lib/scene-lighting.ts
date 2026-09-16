export type LightingMode =
  | "soft-studio"
  | "bright-studio"
  | "window-light"
  | "overcast"
  | "golden-hour"
  | "cool-daylight"
  | "dramatic"
  | "rim-light"
  | "top-light"
  | "warm-softbox"
  | "neon-duo"
  | "sunset";

export interface SceneLighting {
  mode: LightingMode;
  brightness: number;
  direction: number;
  warmth: number;
  reflections: number;
  shadowStrength: number;
  shadowSoftness: number;
}

export interface LightSource {
  color: string;
  intensity: number;
  position: [number, number, number];
}
export interface LightingPreset {
  id: LightingMode;
  name: string;
  description: string;
  key: LightSource;
  fill: LightSource;
  rim: LightSource;
  ambient: number;
  environment: number;
  environmentRotation: number;
  environmentTint: string;
  exposure: number;
  swatch: [string, string, string];
}
const light = (
  color: string,
  intensity: number,
  position: LightSource["position"],
): LightSource => ({ color, intensity, position });

export const LIGHTING_PRESETS: LightingPreset[] = [
  {
    id: "soft-studio",
    name: "Soft studio",
    description: "Balanced light and natural reflections.",
    key: light("#fffaf4", 2.6, [-4, 8, 7]),
    fill: light("#e4ecff", 1.2, [5, 2, 4]),
    rim: light("#ffffff", 2.4, [-3, 3, -5]),
    ambient: 0.35,
    environment: 1,
    environmentRotation: 0,
    environmentTint: "#ffffff",
    exposure: 1.1,
    swatch: ["#ffffff", "#b7c1bc", "#525e5b"],
  },
  {
    id: "bright-studio",
    name: "Bright studio",
    description: "Airy, even light for a clean product shot.",
    key: light("#ffffff", 3.8, [-3, 5, 8]),
    fill: light("#f1f5ff", 2.2, [5, 4, 6]),
    rim: light("#ffffff", 2.7, [0, 5, -5]),
    ambient: 0.65,
    environment: 1.4,
    environmentRotation: 20,
    environmentTint: "#ffffff",
    exposure: 1.2,
    swatch: ["#ffffff", "#e5e9ea", "#9ca9b0"],
  },
  {
    id: "window-light",
    name: "Window light",
    description: "A broad side light with gentle contrast.",
    key: light("#fff1de", 5, [-8, 5, 4]),
    fill: light("#cbdfff", 0.35, [5, 1, 3]),
    rim: light("#ffffff", 1, [-4, 4, -5]),
    ambient: 0.18,
    environment: 0.65,
    environmentRotation: -55,
    environmentTint: "#eee7da",
    exposure: 1.05,
    swatch: ["#fff7e9", "#b3b8c0", "#3d4c62"],
  },
  {
    id: "overcast",
    name: "Overcast",
    description: "Diffuse daylight with soft, subtle highlights.",
    key: light("#edf3ff", 1.1, [-4, 9, 4]),
    fill: light("#e5efff", 1.3, [5, 5, 5]),
    rim: light("#f4f7ff", 0.7, [2, 5, -5]),
    ambient: 0.9,
    environment: 1.3,
    environmentRotation: 75,
    environmentTint: "#d6e4f4",
    exposure: 1.1,
    swatch: ["#eff5fc", "#b7c6d8", "#748398"],
  },
  {
    id: "golden-hour",
    name: "Golden hour",
    description: "Low amber light and a cool, soft fill.",
    key: light("#ffb55e", 4.8, [-7, 2, 5]),
    fill: light("#b6c9ff", 0.5, [5, 3, 4]),
    rim: light("#ffd7a2", 2.4, [-4, 2, -5]),
    ambient: 0.15,
    environment: 0.65,
    environmentRotation: -35,
    environmentTint: "#e6b47f",
    exposure: 1.15,
    swatch: ["#fff0c5", "#db9750", "#694b6f"],
  },
  {
    id: "cool-daylight",
    name: "Cool daylight",
    description: "Crisp blue light for clean metallic edges.",
    key: light("#bad7ff", 3.5, [-4, 6, 6]),
    fill: light("#b8f2ff", 1.8, [5, 1, 5]),
    rim: light("#daeaff", 3, [3, 4, -5]),
    ambient: 0.3,
    environment: 0.85,
    environmentRotation: 35,
    environmentTint: "#a8c8f7",
    exposure: 1.1,
    swatch: ["#e5faff", "#7ca7da", "#264875"],
  },
  {
    id: "dramatic",
    name: "Dramatic",
    description: "A strong side light with deep contrast.",
    key: light("#fff0de", 4.8, [-6, 4, 5]),
    fill: light("#b1c5f2", 0.1, [6, 1, 2]),
    rim: light("#d6e4ff", 2.6, [4, 3, -5]),
    ambient: 0.05,
    environment: 0.2,
    environmentRotation: -65,
    environmentTint: "#a7aebe",
    exposure: 0.95,
    swatch: ["#f4e7d6", "#586078", "#131b2c"],
  },
  {
    id: "rim-light",
    name: "Rim light",
    description: "Bright rear highlights that define the silhouette.",
    key: light("#e7eeff", 0.5, [-3, 3, 6]),
    fill: light("#c6d9ff", 0.25, [5, 1, 3]),
    rim: light("#e5f6ff", 6, [-3, 4, -6]),
    ambient: 0.08,
    environment: 0.28,
    environmentRotation: 160,
    environmentTint: "#adbdd6",
    exposure: 1.05,
    swatch: ["#dff4ff", "#364256", "#121922"],
  },
  {
    id: "top-light",
    name: "Top light",
    description: "An overhead source with sculpted lower edges.",
    key: light("#fff8ec", 5.8, [0, 10, 1]),
    fill: light("#d5e0f5", 0.4, [2, 0, 6]),
    rim: light("#ffffff", 1.4, [-4, 4, -5]),
    ambient: 0.15,
    environment: 0.5,
    environmentRotation: 90,
    environmentTint: "#dadde3",
    exposure: 1.05,
    swatch: ["#fff8e7", "#a4a9b0", "#353c4a"],
  },
  {
    id: "warm-softbox",
    name: "Warm softbox",
    description: "Soft champagne reflections and warm neutrals.",
    key: light("#ffdbb3", 3.8, [-4, 6, 7]),
    fill: light("#ffe7ca", 1, [5, 2, 5]),
    rim: light("#fff0dd", 2, [1, 4, -5]),
    ambient: 0.35,
    environment: 0.8,
    environmentRotation: 15,
    environmentTint: "#ecd3b5",
    exposure: 1.1,
    swatch: ["#fff2df", "#d1b393", "#796b66"],
  },
  {
    id: "neon-duo",
    name: "Neon duo",
    description: "Magenta and cyan lights with vivid colored edges.",
    key: light("#ff45bb", 6, [-5, 3, 5]),
    fill: light("#42deff", 5, [5, 2, 4]),
    rim: light("#8d63ff", 4, [0, 4, -5]),
    ambient: 0.1,
    environment: 0.75,
    environmentRotation: -20,
    environmentTint: "#9773d4",
    exposure: 1.1,
    swatch: ["#ff88de", "#8b46b8", "#41d9f1"],
  },
  {
    id: "sunset",
    name: "Sunset",
    description: "Coral highlights, violet fill, and an amber rim.",
    key: light("#ff936e", 5, [-6, 3, 6]),
    fill: light("#ae8cff", 2, [5, 2, 3]),
    rim: light("#ffc66c", 3, [1, 3, -5]),
    ambient: 0.18,
    environment: 0.65,
    environmentRotation: 50,
    environmentTint: "#d18eaa",
    exposure: 1.1,
    swatch: ["#ffd0a0", "#d78294", "#7159a4"],
  },
];

export const DEFAULT_LIGHTING: SceneLighting = {
  mode: "soft-studio",
  brightness: 100,
  direction: 0,
  warmth: 0,
  reflections: 100,
  shadowStrength: 35,
  shadowSoftness: 50,
};
export const LIGHTING_LIMITS = {
  brightness: [0, 200],
  direction: [-180, 180],
  warmth: [-100, 100],
  reflections: [0, 200],
  shadowStrength: [0, 100],
  shadowSoftness: [0, 100],
} as const;
export function lightingPreset(mode: LightingMode): LightingPreset {
  return LIGHTING_PRESETS.find((p) => p.id === mode) || LIGHTING_PRESETS[0];
}
export function validateLighting(value: unknown): value is SceneLighting {
  if (!value || typeof value !== "object") return false;
  const lighting = value as SceneLighting;
  return (
    LIGHTING_PRESETS.some((p) => p.id === lighting.mode) &&
    Object.entries(LIGHTING_LIMITS).every(([key, [min, max]]) => {
      const n = lighting[key as keyof typeof LIGHTING_LIMITS];
      return (
        typeof n === "number" && Number.isFinite(n) && n >= min && n <= max
      );
    })
  );
}
