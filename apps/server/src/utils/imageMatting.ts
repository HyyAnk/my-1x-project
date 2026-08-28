import { deflateSync, inflateSync } from "node:zlib";

export type MattingOptions = {
  /**
   * Color distance tolerance for background detection (0-255). Default is 25.
   */
  tolerance?: number;
  /**
   * Edge feathering width in distance space for smooth anti-aliasing. Default is 15.
   */
  feather?: number;
  /**
   * Target background color [R, G, B] to remove. If omitted, automatically sampled from borders.
   */
  targetColor?: [number, number, number];
  /**
   * Minimum alpha threshold below which a pixel is considered fully transparent. Default is 5.
   */
  alphaCutoff?: number;
  /**
   * Whether to prefer AI segmentation model (RMBG) over procedural flood fill. Default is true.
   */
  preferAi?: boolean;
};

const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[i] = c;
}

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type: string, data: Uint8Array): Uint8Array {
  const len = data.length;
  const chunk = new Uint8Array(12 + len);
  const view = new DataView(chunk.buffer, chunk.byteOffset, chunk.byteLength);
  view.setUint32(0, len, false);
  chunk[4] = type.charCodeAt(0);
  chunk[5] = type.charCodeAt(1);
  chunk[6] = type.charCodeAt(2);
  chunk[7] = type.charCodeAt(3);
  chunk.set(data, 8);
  const crc = crc32(chunk.subarray(4, 8 + len));
  view.setUint32(8 + len, crc, false);
  return chunk;
}

type DecodedImage = {
  width: number;
  height: number;
  data: Uint8Array; // RGBA 4 bytes per pixel
};

function paethPredictor(a: number, b: number, c: number): number {
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
  if (colorType === 0) bpp = 1; // Grayscale (8-bit)
  else if (colorType === 2) bpp = 3; // RGB (8-bit)
  else if (colorType === 3) bpp = 1; // Indexed
  else if (colorType === 4) bpp = 2; // Grayscale + Alpha
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
  const ihdrChunk = makeChunk("IHDR", ihdr);
  const idatChunk = makeChunk("IDAT", idatData);
  const iendChunk = makeChunk("IEND", new Uint8Array(0));

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

/**
 * Computes Euclidean color distance in RGB space.
 */
function colorDistance(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/**
 * Samples background color from border pixels if not explicitly provided.
 */
function sampleBorderBackgroundColor(data: Uint8Array, width: number, height: number): [number, number, number] {
  let totalR = 0;
  let totalG = 0;
  let totalB = 0;
  let count = 0;

  // Sample the 4 outer corner regions
  const samplePoints: [number, number][] = [
    [0, 0],
    [1, 0],
    [0, 1],
    [width - 1, 0],
    [width - 2, 0],
    [width - 1, 1],
    [0, height - 1],
    [1, height - 1],
    [0, height - 2],
    [width - 1, height - 1],
    [width - 2, height - 1],
    [width - 1, height - 2],
    // Center of top and bottom edges
    [Math.floor(width / 2), 0],
    [Math.floor(width / 2), height - 1],
    [0, Math.floor(height / 2)],
    [width - 1, Math.floor(height / 2)],
  ];

  for (const [x, y] of samplePoints) {
    if (x >= 0 && x < width && y >= 0 && y < height) {
      const idx = (y * width + x) * 4;
      totalR += data[idx];
      totalG += data[idx + 1];
      totalB += data[idx + 2];
      count++;
    }
  }

  if (count === 0) return [255, 255, 255];
  return [Math.round(totalR / count), Math.round(totalG / count), Math.round(totalB / count)];
}

/**
 * Smart Alpha Matting & Background Removal.
 * Uses BFS Flood-Fill starting strictly from outer boundaries to remove solid/near-solid backgrounds
 * while strictly preserving all white or light details inside the character body.
 */
export function removeImageBackgroundRgba(
  image: DecodedImage,
  options: MattingOptions = {},
): DecodedImage {
  const { width, height, data } = image;
  const tolerance = options.tolerance ?? 28;
  const feather = options.feather ?? 16;
  const alphaCutoff = options.alphaCutoff ?? 5;

  const targetBg = options.targetColor ?? sampleBorderBackgroundColor(data, width, height);
  const [bgR, bgG, bgB] = targetBg;

  // Track visited pixels to prevent duplicate queue items
  const visited = new Uint8Array(width * height);
  const queue: number[] = [];

  // 1. Seed boundary pixels into flood fill queue
  for (let x = 0; x < width; x++) {
    // Top border
    queue.push(0 * width + x);
    visited[0 * width + x] = 1;
    // Bottom border
    const btmIdx = (height - 1) * width + x;
    queue.push(btmIdx);
    visited[btmIdx] = 1;
  }
  for (let y = 1; y < height - 1; y++) {
    // Left border
    queue.push(y * width + 0);
    visited[y * width + 0] = 1;
    // Right border
    const rgtIdx = y * width + (width - 1);
    queue.push(rgtIdx);
    visited[rgtIdx] = 1;
  }

  // 2. BFS Flood Fill from borders inward
  let head = 0;
  while (head < queue.length) {
    const pixelIndex = queue[head++];
    const px = pixelIndex % width;
    const py = Math.floor(pixelIndex / width);
    const dataIdx = pixelIndex * 4;

    const r = data[dataIdx];
    const g = data[dataIdx + 1];
    const b = data[dataIdx + 2];
    const a = data[dataIdx + 3];

    // If already transparent, skip
    if (a < alphaCutoff) continue;

    const dist = colorDistance(r, g, b, bgR, bgG, bgB);

    if (dist <= tolerance) {
      // Pixel is definitely background -> 100% transparent
      data[dataIdx + 3] = 0;

      // Expand to 4-connected neighbors
      const neighbors: [number, number][] = [
        [px + 1, py],
        [px - 1, py],
        [px, py + 1],
        [px, py - 1],
      ];

      for (const [nx, ny] of neighbors) {
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const nIdx = ny * width + nx;
          if (!visited[nIdx]) {
            visited[nIdx] = 1;
            queue.push(nIdx);
          }
        }
      }
    } else if (dist <= tolerance + feather) {
      // Feathered transition boundary pixel
      const factor = (dist - tolerance) / feather;
      const newAlpha = Math.round(Math.min(255, Math.max(0, factor * a)));
      data[dataIdx + 3] = newAlpha;
      // Do not expand beyond feathered boundary
    }
  }

  return { width, height, data };
}

type AiPipelineBundle = {
  model: any;
  processor: any;
  RawImage: any;
};

let aiPipelinePromise: Promise<AiPipelineBundle> | null = null;

/**
 * Returns a cached singleton of the RMBG-1.4 AI background removal pipeline.
 */
export async function getAiMattingPipeline(): Promise<AiPipelineBundle> {
  if (!aiPipelinePromise) {
    aiPipelinePromise = (async () => {
      const { AutoModel, AutoProcessor, RawImage } = await import("@huggingface/transformers");
      const model = await AutoModel.from_pretrained("briaai/RMBG-1.4");
      const processor = await AutoProcessor.from_pretrained("briaai/RMBG-1.4");
      return { model, processor, RawImage };
    })();
  }
  return aiPipelinePromise;
}

/**
 * Detects if an image already contains genuine alpha transparency (e.g. from GPTi2 with background: "transparent").
 */
export function hasNativeTransparency(image: DecodedImage, thresholdRatio = 0.10): boolean {
  const { width, height, data } = image;
  const totalPixels = width * height;
  if (totalPixels === 0) return false;

  let transparentPixels = 0;
  for (let i = 0; i < totalPixels; i++) {
    if (data[i * 4 + 3] < 20) {
      transparentPixels++;
    }
  }

  // Also check borders
  let borderTransparent = 0;
  let borderTotal = 0;
  for (let x = 0; x < width; x++) {
    if (data[(0 * width + x) * 4 + 3] < 20) borderTransparent++;
    if (data[((height - 1) * width + x) * 4 + 3] < 20) borderTransparent++;
    borderTotal += 2;
  }
  for (let y = 1; y < height - 1; y++) {
    if (data[(y * width + 0) * 4 + 3] < 20) borderTransparent++;
    if (data[(y * width + (width - 1)) * 4 + 3] < 20) borderTransparent++;
    borderTotal += 2;
  }

  return (transparentPixels / totalPixels) >= thresholdRatio && (borderTransparent / borderTotal) >= 0.3;
}

/**
 * Cleans up isolated stray noise specks on an already transparent PNG without eroding soft antialiased edges.
 */
export function cleanupTransparentImage(image: DecodedImage): DecodedImage {
  const { width, height, data } = image;
  const out = new Uint8Array(data.length);
  out.set(data);

  // Eliminate near-zero alpha noise (e.g. compression artifacts with alpha < 5)
  for (let i = 0; i < width * height; i++) {
    const a = out[i * 4 + 3];
    if (a < 5) {
      out[i * 4 + 3] = 0;
    }
  }
  return { width, height, data: out };
}

/**
 * Removes background using Deep Learning (briaai/RMBG-1.4 via ONNX Runtime in Node.js).
 * State-of-the-art accuracy for fur strands, fine details, transparent objects, and floor contact shadows.
 */
export async function removeImageBackgroundAi(
  image: DecodedImage,
  options: MattingOptions = {},
): Promise<DecodedImage> {
  const { width, height, data } = image;
  const { model, processor, RawImage } = await getAiMattingPipeline();

  // Convert RGBA to RGB 3-channel buffer for model input, compositing against light neutral gray instead of pitch black
  const rgbData = new Uint8Array(width * height * 3);
  for (let i = 0; i < width * height; i++) {
    const a = data[i * 4 + 3] / 255;
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    rgbData[i * 3] = Math.round(r * a + 240 * (1 - a));
    rgbData[i * 3 + 1] = Math.round(g * a + 240 * (1 - a));
    rgbData[i * 3 + 2] = Math.round(b * a + 240 * (1 - a));
  }

  const inputImage = new RawImage(rgbData, width, height, 3);
  const { pixel_values } = await processor(inputImage);
  const { output } = await model({ input: pixel_values });

  const maskData: Float32Array = output.data;
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < maskData.length; i++) {
    const val = maskData[i];
    if (val < min) min = val;
    if (val > max) max = val;
  }

  const range = max - min || 1;
  const maskBytes = new Uint8Array(1024 * 1024);
  for (let i = 0; i < maskData.length; i++) {
    const norm = (maskData[i] - min) / range;
    maskBytes[i] = Math.round(norm * 255);
  }

  const maskRaw = new RawImage(maskBytes, 1024, 1024, 1);
  const resizedMask = await maskRaw.resize(width, height);

  const alphaCutoff = options.alphaCutoff ?? 5;
  const outRgba = new Uint8Array(data.length);
  outRgba.set(data);

  for (let i = 0; i < width * height; i++) {
    const a = resizedMask.data[i];
    outRgba[i * 4 + 3] = a < alphaCutoff ? 0 : a;
  }

  return { width, height, data: outRgba };
}

/**
 * High-level helper: removes background from PNG image bytes and returns transparent PNG bytes.
 * Defaults to AI Matting (RMBG) for high fidelity, with transparent fallback to procedural matting.
 * If input is already cleanly transparent, preserves original alpha without destructive re-matting.
 */
export async function removeImageBackground(
  imageBytes: Uint8Array,
  options: MattingOptions = {},
): Promise<Uint8Array> {
  try {
    // Check if PNG
    if (
      imageBytes.length >= 8 &&
      imageBytes[0] === 137 &&
      imageBytes[1] === 80 &&
      imageBytes[2] === 78 &&
      imageBytes[3] === 71
    ) {
      const decoded = decodePngToRgba(imageBytes);

      // 1. If image already has genuine native alpha transparency (e.g. from GPTi2 transparent PNG),
      // preserve the pristine AI edges directly instead of destructive re-matting!
      if (hasNativeTransparency(decoded)) {
        const cleaned = cleanupTransparentImage(decoded);
        return encodeRgbaToPng(cleaned);
      }

      // 2. If image is opaque, run AI matting model (briaai/RMBG-1.4) via ONNX Runtime
      if (options.preferAi !== false && decoded.width >= 64 && decoded.height >= 64) {
        try {
          const aiMatted = await removeImageBackgroundAi(decoded, options);
          return encodeRgbaToPng(aiMatted);
        } catch {
          // Graceful fallback to procedural BFS flood-fill if AI model fails
        }
      }

      // 3. Procedural flood-fill fallback for opaque images
      const matted = removeImageBackgroundRgba(decoded, options);
      return encodeRgbaToPng(matted);
    }
  } catch {
    // Return original if decoding fails
  }
  return imageBytes;
}

