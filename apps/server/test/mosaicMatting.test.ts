import { describe, expect, it } from "vitest";
import {
  decodePngToRgba,
  encodeRgbaToPng,
  createMosaicPixelateRgba,
  createMosaicImagePng,
} from "../src/utils/imageMatting.js";

describe("Mosaic Pixelate Matting Engine", () => {
  it("creates block-averaged mosaic while preserving alpha channel transparency and dimensions", () => {
    const width = 16;
    const height = 16;
    const data = new Uint8Array(width * height * 4);

    // Set top-left 8x8 block with varying colors and alpha = 255
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const idx = (y * width + x) * 4;
        data[idx] = x * 20; // R
        data[idx + 1] = y * 20; // G
        data[idx + 2] = 100; // B
        data[idx + 3] = 255; // Alpha
      }
    }

    // Set bottom-right 8x8 block with alpha = 0 (transparent)
    for (let y = 8; y < 16; y++) {
      for (let x = 8; x < 16; x++) {
        const idx = (y * width + x) * 4;
        data[idx] = 255;
        data[idx + 1] = 255;
        data[idx + 2] = 255;
        data[idx + 3] = 0; // Transparent
      }
    }

    const decoded = { width, height, data };
    const mosaic = createMosaicPixelateRgba(decoded, 4);

    expect(mosaic.width).toBe(16);
    expect(mosaic.height).toBe(16);

    // Within each 4x4 block inside the top-left area, colors should now be uniform
    const p0 = (0 * width + 0) * 4;
    const p1 = (1 * width + 1) * 4;
    expect(mosaic.data[p0]).toBe(mosaic.data[p1]);
    expect(mosaic.data[p0 + 1]).toBe(mosaic.data[p1 + 1]);
    expect(mosaic.data[p0 + 2]).toBe(mosaic.data[p1 + 2]);
    expect(mosaic.data[p0 + 3]).toBe(255);

    // Transparent areas must remain strictly alpha = 0
    const pTrans = (10 * width + 10) * 4;
    expect(mosaic.data[pTrans + 3]).toBe(0);
  });

  it("processes PNG bytes into a valid mosaic PNG round-trip", () => {
    const width = 8;
    const height = 8;
    const data = new Uint8Array(width * height * 4);
    for (let i = 0; i < width * height; i++) {
      data[i * 4] = 200;
      data[i * 4 + 1] = 50;
      data[i * 4 + 2] = 50;
      data[i * 4 + 3] = 255;
    }

    const originalPng = encodeRgbaToPng({ width, height, data });
    const mosaicPng = createMosaicImagePng(originalPng, 4);

    expect(mosaicPng[0]).toBe(137); // Valid PNG signature
    const decoded = decodePngToRgba(mosaicPng);
    expect(decoded.width).toBe(8);
    expect(decoded.height).toBe(8);
  });
});
