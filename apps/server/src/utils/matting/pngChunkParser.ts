export interface ParsedPngChunks {
  width: number;
  height: number;
  colorType: number;
  palette: Uint8Array | null;
  trns: Uint8Array | null;
  idat: Uint8Array;
}

export function verifyPngSignature(bytes: Uint8Array): void {
  if (bytes.length < 8) {
    throw new Error("Invalid PNG: file too short");
  }
  const isPng =
    bytes[0] === 137 &&
    bytes[1] === 80 &&
    bytes[2] === 78 &&
    bytes[3] === 71 &&
    bytes[4] === 13 &&
    bytes[5] === 10 &&
    bytes[6] === 26 &&
    bytes[7] === 10;

  if (!isPng) {
    throw new Error("Invalid PNG signature");
  }
}

export function parsePngChunks(bytes: Uint8Array): ParsedPngChunks {
  verifyPngSignature(bytes);

  let offset = 8;
  let width = 0;
  let height = 0;
  let colorType = 6;
  const idatParts: Uint8Array[] = [];
  let palette: Uint8Array | null = null;
  let trns: Uint8Array | null = null;

  while (offset < bytes.length) {
    if (offset + 8 > bytes.length) break;
    const view = new DataView(bytes.buffer, bytes.byteOffset + offset, 8);
    const length = view.getUint32(0, false);
    const type = String.fromCharCode(bytes[offset + 4], bytes[offset + 5], bytes[offset + 6], bytes[offset + 7]);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;

    if (type === "IHDR") {
      const ihdrView = new DataView(bytes.buffer, bytes.byteOffset + dataStart, 13);
      width = ihdrView.getUint32(0, false);
      height = ihdrView.getUint32(4, false);
      colorType = bytes[dataStart + 9];
    } else if (type === "PLTE") {
      palette = bytes.subarray(dataStart, dataEnd);
    } else if (type === "tRNS") {
      trns = bytes.subarray(dataStart, dataEnd);
    } else if (type === "IDAT") {
      idatParts.push(bytes.subarray(dataStart, dataEnd));
    } else if (type === "IEND") {
      break;
    }

    offset = dataEnd + 4; // Skip CRC
  }

  if (width === 0 || height === 0) {
    throw new Error("Invalid PNG: missing IHDR");
  }

  const totalIdatLen = idatParts.reduce((sum, p) => sum + p.length, 0);
  const compressed = new Uint8Array(totalIdatLen);
  let idatOff = 0;
  for (const part of idatParts) {
    compressed.set(part, idatOff);
    idatOff += part.length;
  }

  return { width, height, colorType, palette, trns, idat: compressed };
}
