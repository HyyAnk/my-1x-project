import { describe, expect, it } from "vitest";
import { decodePngToRgba, encodeRgbaToPng, removeImageBackground, removeImageBackgroundRgba } from "../src/utils/imageMatting.js";

describe("Image Matting & Background Removal Engine", () => {
  it("encodes and decodes PNG to and from RGBA correctly", () => {
    const width = 10;
    const height = 10;
    const data = new Uint8Array(width * height * 4);

    // Fill with red
    for (let i = 0; i < width * height; i++) {
      data[i * 4] = 255;
      data[i * 4 + 1] = 0;
      data[i * 4 + 2] = 0;
      data[i * 4 + 3] = 255;
    }

    const png = encodeRgbaToPng({ width, height, data });
    expect(png.length).toBeGreaterThan(50);
    expect(png[0]).toBe(137); // PNG signature

    const decoded = decodePngToRgba(png);
    expect(decoded.width).toBe(10);
    expect(decoded.height).toBe(10);
    expect(decoded.data[0]).toBe(255);
    expect(decoded.data[1]).toBe(0);
    expect(decoded.data[2]).toBe(0);
    expect(decoded.data[3]).toBe(255);
  });

  it("removes outer solid white background while preserving internal white details", async () => {
    // Create a 20x20 test image:
    // Outer border: White (255, 255, 255)
    // Ring: Blue (0, 100, 255) from (4,4) to (16,16)
    // Center: White (255, 255, 255) from (8,8) to (12,12) inside the ring
    const width = 20;
    const height = 20;
    const data = new Uint8Array(width * height * 4);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const inCenter = x >= 8 && x <= 12 && y >= 8 && y <= 12;
        const inRing = x >= 4 && x <= 16 && y >= 4 && y <= 16;

        if (inCenter) {
          // Internal white detail (e.g. eye sparkle or white belly)
          data[idx] = 255;
          data[idx + 1] = 255;
          data[idx + 2] = 255;
          data[idx + 3] = 255;
        } else if (inRing) {
          // Character body
          data[idx] = 0;
          data[idx + 1] = 100;
          data[idx + 2] = 255;
          data[idx + 3] = 255;
        } else {
          // Outer background
          data[idx] = 255;
          data[idx + 1] = 255;
          data[idx + 2] = 255;
          data[idx + 3] = 255;
        }
      }
    }

    const originalPng = encodeRgbaToPng({ width, height, data });
    const transparentPng = await removeImageBackground(originalPng, { tolerance: 10, feather: 5 });

    const decoded = decodePngToRgba(transparentPng);

    // 1. Verify outer corner pixel (0,0) is 100% transparent (alpha = 0)
    const cornerIdx = (0 * width + 0) * 4;
    expect(decoded.data[cornerIdx + 3]).toBe(0);

    // 2. Verify outer edge pixel (2,2) is 100% transparent (alpha = 0)
    const edgeIdx = (2 * width + 2) * 4;
    expect(decoded.data[edgeIdx + 3]).toBe(0);

    // 3. Verify character body pixel (5,5) is fully opaque (alpha = 255)
    const bodyIdx = (5 * width + 5) * 4;
    expect(decoded.data[bodyIdx]).toBe(0);
    expect(decoded.data[bodyIdx + 1]).toBe(100);
    expect(decoded.data[bodyIdx + 2]).toBe(255);
    expect(decoded.data[bodyIdx + 3]).toBe(255);

    // 4. CRITICAL: Verify INTERNAL white detail pixel (10,10) is PRESERVED (alpha = 255)
    const centerIdx = (10 * width + 10) * 4;
    expect(decoded.data[centerIdx]).toBe(255);
    expect(decoded.data[centerIdx + 1]).toBe(255);
    expect(decoded.data[centerIdx + 2]).toBe(255);
    expect(decoded.data[centerIdx + 3]).toBe(255);
  });

  it("handles non-PNG data gracefully without throwing", async () => {
    const fakeSvg = Buffer.from("<svg></svg>", "utf8");
    const result = await removeImageBackground(fakeSvg);
    expect(result).toEqual(fakeSvg);
  });
});
