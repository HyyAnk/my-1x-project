import { deflateSync, inflateSync } from "node:zlib";
import { makePngChunk } from "../binary.js";
import { parsePngChunks } from "./pngChunkParser.js";
import { unfilterScanlines, paethPredictor } from "./pngScanlineFilter.js";
import { convertScanlinesToRgba, resolveBytesPerPixel } from "./pngColorDecoder.js";

export type DecodedImage = {
  width: number;
  height: number;
  data: Uint8Array; // RGBA 4 bytes per pixel
};

export { paethPredictor };

/**
 * Decodes standard PNG image bytes into a raw RGBA Uint8Array.
 */
export function decodePngToRgba(bytes: Uint8Array): DecodedImage {
  const { width, height, colorType, palette, trns, idat } = parsePngChunks(bytes);
  const decompressed = new Uint8Array(inflateSync(idat));
  const bpp = resolveBytesPerPixel(colorType);
  const unfilteredRows = unfilterScanlines(decompressed, width, height, bpp);
  const data = convertScanlinesToRgba(unfilteredRows, width, height, colorType, palette, trns);
  return { width, height, data };
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
