// The 16-inch MacBook Pro sold throughout 2025 used the M4 Pro / M4 Max
// enclosure introduced in late 2024. Pin this model to Apple's dated specs,
// rather than the /macbook-pro/specs page, which tracks newer generations.
export const MACBOOK_PRO_16_M4 = {
  name: "MacBook Pro 16″",
  description: "16-inch · M4 Pro / Max · 2025 lineup",
  source: "https://support.apple.com/en-us/121554",
  widthMm: 355.7,
  depthMm: 248.1,
  closedHeightMm: 16.8,
  screenWidth: 3456,
  screenHeight: 2234,
  pixelsPerInch: 254,
} as const;
