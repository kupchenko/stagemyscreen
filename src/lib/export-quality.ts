export type ExportQuality = "high" | "ultra";
export const EXPORT_WIDTHS = [1920, 3840, 6000, 7680, 12000, 15360];
export const MAX_EXPORT_PIXELS = 134217728;
export const MAX_EXPORT_EDGE = 16384;

export function exportDimensions(width: number, ratio: number) {
  const height = Math.round(width / ratio);
  if (
    !Number.isInteger(width) ||
    width < 1 ||
    !Number.isFinite(ratio) ||
    ratio <= 0 ||
    height < 1 ||
    Math.max(width, height) > MAX_EXPORT_EDGE ||
    width * height > MAX_EXPORT_PIXELS
  )
    throw new Error(
      "This size exceeds the export limit for this aspect ratio. Choose a smaller resolution.",
    );
  return { width, height };
}

export function exportTiles(
  width: number,
  height: number,
  quality: ExportQuality,
  renderLimit = 2048,
) {
  const scale = quality === "ultra" ? 2 : 1;
  const gutter = 2;
  const size = Math.floor(Math.min(2048, renderLimit) / scale) - gutter * 2;
  if (size < 1)
    throw new Error("The graphics device cannot create an export surface.");
  const tiles = [];
  for (let y = 0; y < height; y += size) {
    for (let x = 0; x < width; x += size) {
      const w = Math.min(size, width - x),
        h = Math.min(size, height - y);
      const left = Math.max(0, x - gutter),
        top = Math.max(0, y - gutter);
      const right = Math.min(width, x + w + gutter),
        bottom = Math.min(height, y + h + gutter);
      tiles.push({
        x,
        y,
        width: w,
        height: h,
        left,
        top,
        renderWidth: (right - left) * scale,
        renderHeight: (bottom - top) * scale,
        scale,
      });
    }
  }
  return tiles;
}
