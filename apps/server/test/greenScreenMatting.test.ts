import { describe, expect, it } from "vitest";
import {
  cleanupTransparentImage,
  decodePngToRgba,
  encodeRgbaToPng,
  inferResidualGreenKeyColor,
  removeImageBackground,
} from "../src/utils/imageMatting.js";

type Rgba = readonly [number, number, number, number];

function createTransparentImage(width: number, height: number): Uint8Array {
  return new Uint8Array(width * height * 4);
}

function fillRect(data: Uint8Array, width: number, x1: number, y1: number, x2: number, y2: number, color: Rgba): void {
  for (let y = y1; y < y2; y++) {
    for (let x = x1; x < x2; x++) {
      const idx = (y * width + x) * 4;
      data.set(color, idx);
    }
  }
}

function alphaAt(data: Uint8Array, width: number, x: number, y: number): number {
  return data[(y * width + x) * 4 + 3];
}

describe("green-screen matting regression", () => {
  it("removes an opaque green screen without relying on AI segmentation", async () => {
    const width = 96;
    const height = 96;
    const data = createTransparentImage(width, height);
    fillRect(data, width, 0, 0, width, height, [0, 255, 0, 255]);
    fillRect(data, width, 18, 10, 78, 88, [244, 112, 28, 255]);
    fillRect(data, width, 40, 38, 56, 58, [4, 248, 3, 255]);

    const result = await removeImageBackground(encodeRgbaToPng({ width, height, data }));
    const decoded = decodePngToRgba(result);

    expect(alphaAt(decoded.data, width, 2, 2)).toBe(0);
    expect(alphaAt(decoded.data, width, 48, 48)).toBe(0);
    expect(alphaAt(decoded.data, width, 70, 50)).toBe(255);
  });

  it("removes flat green remnants from an already transparent PNG", async () => {
    const width = 96;
    const height = 96;
    const data = createTransparentImage(width, height);
    fillRect(data, width, 18, 10, 78, 88, [244, 112, 28, 255]);
    fillRect(data, width, 3, 28, 24, 72, [8, 242, 5, 255]);
    fillRect(data, width, 37, 40, 58, 62, [10, 240, 8, 255]);
    fillRect(data, width, 2, 27, 25, 28, [15, 238, 12, 128]);
    fillRect(data, width, 30, 18, 36, 24, [18, 205, 236, 255]);

    const inferredKey = inferResidualGreenKeyColor(data, width, height);
    expect(inferredKey).not.toBeNull();

    const result = await removeImageBackground(encodeRgbaToPng({ width, height, data }));
    const decoded = decodePngToRgba(result);

    expect(alphaAt(decoded.data, width, 8, 40)).toBe(0);
    expect(alphaAt(decoded.data, width, 45, 50)).toBe(0);
    expect(alphaAt(decoded.data, width, 70, 50)).toBe(255);
    expect(alphaAt(decoded.data, width, 32, 20)).toBe(255);
  });

  it("preserves a small bright-green subject detail", async () => {
    const width = 64;
    const height = 64;
    const data = createTransparentImage(width, height);
    fillRect(data, width, 10, 8, 54, 58, [235, 102, 24, 255]);
    fillRect(data, width, 28, 26, 32, 30, [0, 255, 0, 255]);

    expect(inferResidualGreenKeyColor(data, width, height)).toBeNull();
    const result = await removeImageBackground(encodeRgbaToPng({ width, height, data }));
    const decoded = decodePngToRgba(result);

    expect(alphaAt(decoded.data, width, 29, 27)).toBe(255);
  });

  it("clears hidden RGB data when alpha is effectively transparent", () => {
    const data = new Uint8Array([0, 255, 0, 3, 10, 20, 30, 255]);
    const cleaned = cleanupTransparentImage({ width: 2, height: 1, data });

    expect(Array.from(cleaned.data.slice(0, 4))).toEqual([0, 0, 0, 0]);
    expect(Array.from(cleaned.data.slice(4, 8))).toEqual([10, 20, 30, 255]);
  });
});
