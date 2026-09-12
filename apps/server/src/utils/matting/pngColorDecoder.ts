export function resolveBytesPerPixel(colorType: number): number {
  switch (colorType) {
    case 0:
      return 1; // Grayscale (8-bit)
    case 2:
      return 3; // RGB (8-bit)
    case 3:
      return 1; // Indexed
    case 4:
      return 2; // Grayscale + Alpha
    case 6:
    default:
      return 4; // RGBA (8-bit)
  }
}

function decodePixel(
  row: Uint8Array,
  x: number,
  colorType: number,
  palette: Uint8Array | null,
  trns: Uint8Array | null,
): [number, number, number, number] {
  if (colorType === 6) {
    const idx = x * 4;
    return [row[idx], row[idx + 1], row[idx + 2], row[idx + 3]];
  }
  if (colorType === 2) {
    const idx = x * 3;
    return [row[idx], row[idx + 1], row[idx + 2], 255];
  }
  if (colorType === 3 && palette) {
    const palIdx = row[x];
    const r = palette[palIdx * 3] || 0;
    const g = palette[palIdx * 3 + 1] || 0;
    const b = palette[palIdx * 3 + 2] || 0;
    const a = trns && palIdx < trns.length ? trns[palIdx] : 255;
    return [r, g, b, a];
  }
  if (colorType === 0) {
    const g = row[x];
    return [g, g, g, 255];
  }
  if (colorType === 4) {
    const idx = x * 2;
    const g = row[idx];
    return [g, g, g, row[idx + 1]];
  }
  return [0, 0, 0, 255];
}

export function convertScanlinesToRgba(
  rows: Uint8Array[],
  width: number,
  height: number,
  colorType: number,
  palette: Uint8Array | null,
  trns: Uint8Array | null,
): Uint8Array {
  const rawRgba = new Uint8Array(width * height * 4);

  for (let y = 0; y < height; y++) {
    const row = rows[y];
    for (let x = 0; x < width; x++) {
      const outIdx = (y * width + x) * 4;
      const [r, g, b, a] = decodePixel(row, x, colorType, palette, trns);
      rawRgba[outIdx] = r;
      rawRgba[outIdx + 1] = g;
      rawRgba[outIdx + 2] = b;
      rawRgba[outIdx + 3] = a;
    }
  }

  return rawRgba;
}
