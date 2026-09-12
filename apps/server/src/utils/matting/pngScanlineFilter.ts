export function paethPredictor(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function unfilterByte(filterType: number, raw: number, a: number, b: number, c: number): number {
  if (filterType === 0) return raw;
  if (filterType === 1) return (raw + a) & 0xff;
  if (filterType === 2) return (raw + b) & 0xff;
  if (filterType === 3) return (raw + Math.floor((a + b) / 2)) & 0xff;
  if (filterType === 4) return (raw + paethPredictor(a, b, c)) & 0xff;
  return raw;
}

export function unfilterScanlines(
  decompressed: Uint8Array,
  width: number,
  height: number,
  bpp: number,
): Uint8Array[] {
  const scanlineLen = 1 + width * bpp;
  const prevRow = new Uint8Array(width * bpp);
  const rows: Uint8Array[] = [];

  for (let y = 0; y < height; y++) {
    const rowStart = y * scanlineLen;
    const filterType = decompressed[rowStart];
    const currentRow = new Uint8Array(width * bpp);

    for (let i = 0; i < width * bpp; i++) {
      const raw = decompressed[rowStart + 1 + i];
      const a = i >= bpp ? currentRow[i - bpp] : 0;
      const b = prevRow[i];
      const c = i >= bpp ? prevRow[i - bpp] : 0;
      currentRow[i] = unfilterByte(filterType, raw, a, b, c);
    }

    prevRow.set(currentRow);
    rows.push(currentRow);
  }

  return rows;
}
