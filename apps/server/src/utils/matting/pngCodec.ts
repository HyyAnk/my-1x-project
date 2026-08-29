import { deflateSync, inflateSync } from "node:zlib";
import { makePngChunk } from "../binary.js";

export type DecodedImage = {
  width: number;
  height: number;
  data: Uint8Array; // RGBA 4 bytes per pixel
};

export function paethPredictor(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

/**
 * Decodes standard PNG image bytes into a raw RGBA Uint8Array.
 */
export function decodePngToRgba(bytes: Uint8Array): DecodedImage {
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

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 8;
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
      bitDepth = bytes[dataStart + 8];
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

  // Concatenate IDAT
  const totalIdatLen = idatParts.reduce((sum, p) => sum + p.length, 0);
  const compressed = new Uint8Array(totalIdatLen);
  let idatOff = 0;
  for (const part of idatParts) {
    compressed.set(part, idatOff);
    idatOff += part.length;
  }

  const decompressed = new Uint8Array(inflateSync(compressed));

  // Determine bytes per pixel in scanline
  let bpp = 4;
  if (colorType === 0)
    bpp = 1; // Grayscale (8-bit)
  else if (colorType === 2)
    bpp = 3; // RGB (8-bit)
  else if (colorType === 3)
    bpp = 1; // Indexed
  else if (colorType === 4)
    bpp = 2; // Grayscale + Alpha
  else if (colorType === 6) bpp = 4; // RGBA (8-bit)

  const scanlineLen = 1 + width * bpp;
  const rawRgba = new Uint8Array(width * height * 4);
  const prevRow = new Uint8Array(width * bpp);
  const currentRow = new Uint8Array(width * bpp);

  for (let y = 0; y < height; y++) {
    const rowStart = y * scanlineLen;
    const filterType = decompressed[rowStart];

    for (let i = 0; i < width * bpp; i++) {
      const raw = decompressed[rowStart + 1 + i];
      const a = i >= bpp ? currentRow[i - bpp] : 0;
      const b = prevRow[i];
      const c = i >= bpp ? prevRow[i - bpp] : 0;

      let val = raw;
      if (filterType === 0) {
        val = raw;
      } else if (filterType === 1) {
        val = (raw + a) & 0xff;
      } else if (filterType === 2) {
        val = (raw + b) & 0xff;
      } else if (filterType === 3) {
        val = (raw + Math.floor((a + b) / 2)) & 0xff;
      } else if (filterType === 4) {
        val = (raw + paethPredictor(a, b, c)) & 0xff;
      }
      currentRow[i] = val;
    }

    // Convert currentRow to RGBA
    for (let x = 0; x < width; x++) {
      const outIdx = (y * width + x) * 4;
      if (colorType === 6) {
        // RGBA
        const inIdx = x * 4;
        rawRgba[outIdx] = currentRow[inIdx];
        rawRgba[outIdx + 1] = currentRow[inIdx + 1];
        rawRgba[outIdx + 2] = currentRow[inIdx + 2];
        rawRgba[outIdx + 3] = currentRow[inIdx + 3];
      } else if (colorType === 2) {
        // RGB
        const inIdx = x * 3;
        rawRgba[outIdx] = currentRow[inIdx];
        rawRgba[outIdx + 1] = currentRow[inIdx + 1];
        rawRgba[outIdx + 2] = currentRow[inIdx + 2];
        rawRgba[outIdx + 3] = 255;
      } else if (colorType === 3 && palette) {
        // Indexed Palette
        const palIdx = currentRow[x];
        rawRgba[outIdx] = palette[palIdx * 3] || 0;
        rawRgba[outIdx + 1] = palette[palIdx * 3 + 1] || 0;
        rawRgba[outIdx + 2] = palette[palIdx * 3 + 2] || 0;
        rawRgba[outIdx + 3] = trns && palIdx < trns.length ? trns[palIdx] : 255;
      } else if (colorType === 0) {
        // Grayscale
        const g = currentRow[x];
        rawRgba[outIdx] = g;
        rawRgba[outIdx + 1] = g;
        rawRgba[outIdx + 2] = g;
        rawRgba[outIdx + 3] = 255;
      } else if (colorType === 4) {
        // Grayscale + Alpha
        const inIdx = x * 2;
        const g = currentRow[inIdx];
        rawRgba[outIdx] = g;
        rawRgba[outIdx + 1] = g;
        rawRgba[outIdx + 2] = g;
        rawRgba[outIdx + 3] = currentRow[inIdx + 1];
      }
    }

    prevRow.set(currentRow);
  }

  return { width, height, data: rawRgba };
}

/**
 * Encodes raw RGBA image data into a valid 32-bit PNG.
 */
export function encodeRgbaToPng(image: DecodedImage): Uint8Array {
  const { width, height, data } = image;
  const scanlineLength = 1 + width * 4;
  const scanlines = new Uint8Array(height * scanlineLength);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * scanlineLength;
    scanlines[rowOffset] = 0; // Filter: None
    scanlines.set(data.subarray(y * width * 4, (y + 1) * width * 4), rowOffset + 1);
  }

  const idatData = deflateSync(scanlines);

  const ihdr = new Uint8Array(13);
  const ihdrView = new DataView(ihdr.buffer);
  ihdrView.setUint32(0, width, false);
  ihdrView.setUint32(4, height, false);
  ihdr[8] = 8; // Bit depth: 8
  ihdr[9] = 6; // Color type: RGBA (6)
  ihdr[10] = 0; // Compression: Deflate
  ihdr[11] = 0; // Filter method
  ihdr[12] = 0; // Interlace: None

  const pngSignature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrChunk = makePngChunk("IHDR", ihdr);
  const idatChunk = makePngChunk("IDAT", idatData);
  const iendChunk = makePngChunk("IEND", new Uint8Array(0));

  const totalLength = pngSignature.length + ihdrChunk.length + idatChunk.length + iendChunk.length;
  const png = new Uint8Array(totalLength);
  let offset = 0;
  png.set(pngSignature, offset);
  offset += pngSignature.length;
  png.set(ihdrChunk, offset);
  offset += ihdrChunk.length;
  png.set(idatChunk, offset);
  offset += idatChunk.length;
  png.set(iendChunk, offset);

  return png;
}
