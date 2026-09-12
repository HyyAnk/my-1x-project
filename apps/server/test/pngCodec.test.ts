import { describe, expect, it } from "vitest";
import { decodePngToRgba, encodeRgbaToPng, paethPredictor } from "../src/utils/matting/pngCodec.js";

describe("pngCodec", () => {
  it("computes paeth predictor correctly", () => {
    expect(paethPredictor(10, 20, 15)).toBe(15);
    expect(paethPredictor(20, 10, 15)).toBe(15);
    expect(paethPredictor(10, 20, 10)).toBe(20);
  });

  it("encodes and decodes RGBA PNG", () => {
    const width = 2;
    const height = 2;
    const data = new Uint8Array([
      255, 0, 0, 255,   // Red
      0, 255, 0, 255,   // Green
      0, 0, 255, 255,   // Blue
      255, 255, 0, 128, // Yellow semi-transparent
    ]);

    const pngBytes = encodeRgbaToPng({ width, height, data });
    expect(pngBytes.length).toBeGreaterThan(0);

    const decoded = decodePngToRgba(pngBytes);
    expect(decoded.width).toBe(width);
    expect(decoded.height).toBe(height);
    expect(Array.from(decoded.data)).toEqual(Array.from(data));
  });

  it("throws on invalid PNG signature", () => {
    expect(() => decodePngToRgba(new Uint8Array([1, 2, 3, 4]))).toThrow("Invalid PNG: file too short");
    expect(() => decodePngToRgba(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]))).toThrow("Invalid PNG signature");
  });
});
