import { describe, expect, it } from "vitest";
import { decodePngToRgba, encodeRgbaToPng, removeImageBackground } from "../src/utils/imageMatting.js";

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
    const transparentPng = await removeImageBackground(originalPng, {
      tolerance: 10,
      feather: 5,
      preferAi: false,
      removeEnclosedCavities: false,
    });

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

  it("handles AI background removal on image >= 64x64 cleanly", async () => {
    const width = 64;
    const height = 64;
    const data = new Uint8Array(width * height * 4);
    // Fill with light gray #E8E8E8
    for (let i = 0; i < width * height; i++) {
      data[i * 4] = 232;
      data[i * 4 + 1] = 232;
      data[i * 4 + 2] = 232;
      data[i * 4 + 3] = 255;
    }
    // Draw character in center
    for (let y = 16; y < 48; y++) {
      for (let x = 16; x < 48; x++) {
        const idx = (y * width + x) * 4;
        data[idx] = 255;
        data[idx + 1] = 100;
        data[idx + 2] = 0;
        data[idx + 3] = 255;
      }
    }
    const originalPng = encodeRgbaToPng({ width, height, data });
    const transparentPng = await removeImageBackground(originalPng);
    expect(transparentPng.length).toBeGreaterThan(50);
    const decoded = decodePngToRgba(transparentPng);
    expect(decoded.width).toBe(64);
    expect(decoded.height).toBe(64);
  }, 20000);

  it("detects and preserves native alpha transparency without destructive re-matting", async () => {
    const { hasNativeTransparency } = await import("../src/utils/imageMatting.js");
    const width = 32;
    const height = 32;
    const data = new Uint8Array(width * height * 4);

    // Create a native transparent PNG where borders are alpha = 0 and center is character
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        if (x >= 10 && x <= 22 && y >= 10 && y <= 22) {
          data[idx] = 16;
          data[idx + 1] = 185;
          data[idx + 2] = 129;
          data[idx + 3] = 255;
        } else {
          data[idx] = 0;
          data[idx + 1] = 0;
          data[idx + 2] = 0;
          data[idx + 3] = 0;
        }
      }
    }

    const decoded = { width, height, data };
    expect(hasNativeTransparency(decoded)).toBe(true);

    const originalPng = encodeRgbaToPng(decoded);
    const resultPng = await removeImageBackground(originalPng);
    const resultDecoded = decodePngToRgba(resultPng);

    // Verify center character is preserved
    const centerIdx = (16 * width + 16) * 4;
    expect(resultDecoded.data[centerIdx]).toBe(16);
    expect(resultDecoded.data[centerIdx + 3]).toBe(255);

    // Verify border is transparent
    const borderIdx = (0 * width + 0) * 4;
    expect(resultDecoded.data[borderIdx + 3]).toBe(0);
  });

  it("removes green chroma key background, extracts enclosed cavities, and applies despill", async () => {
    const { removeImageBackgroundRgba } = await import("../src/utils/imageMatting.js");
    const width = 64;
    const height = 64;
    const data = new Uint8Array(width * height * 4);

    // 1. Fill entire image with green chroma key [10, 240, 20]
    for (let i = 0; i < width * height; i++) {
      data[i * 4] = 10;
      data[i * 4 + 1] = 240;
      data[i * 4 + 2] = 20;
      data[i * 4 + 3] = 255;
    }

    // 2. Draw an orange character body (e.g. orange dragon [240, 120, 20])
    for (let y = 10; y < 54; y++) {
      for (let x = 10; x < 54; x++) {
        const idx = (y * width + x) * 4;
        data[idx] = 240;
        data[idx + 1] = 120;
        data[idx + 2] = 20;
        data[idx + 3] = 255;
      }
    }

    // 3. Draw an enclosed cavity inside the character filled with green background
    // (e.g. gap between wing and neck at x: 20-30, y: 35-45)
    for (let y = 35; y < 45; y++) {
      for (let x = 20; x < 30; x++) {
        const idx = (y * width + x) * 4;
        data[idx] = 10;
        data[idx + 1] = 238;
        data[idx + 2] = 22;
        data[idx + 3] = 255;
      }
    }

    // 4. Draw white eye sclera and dark pupil inside character
    for (let y = 18; y < 26; y++) {
      for (let x = 20; x < 28; x++) {
        const idx = (y * width + x) * 4;
        data[idx] = 255; // White eye sclera
        data[idx + 1] = 255;
        data[idx + 2] = 255;
        data[idx + 3] = 255;
      }
    }
    // Pupil
    const pupilIdx = (22 * width + 24) * 4;
    data[pupilIdx] = 10;
    data[pupilIdx + 1] = 10;
    data[pupilIdx + 2] = 10;

    // 5. Run removeImageBackgroundRgba without manually passing removeEnclosedCavities
    const matted = removeImageBackgroundRgba({ width, height, data });

    // Border background should be fully transparent
    expect(matted.data[0 + 3]).toBe(0);

    // Enclosed cavity should be fully transparent
    const cavityIdx = (40 * width + 25) * 4;
    expect(matted.data[cavityIdx + 3]).toBe(0);

    // Eye sclera should be fully preserved (255 alpha, white color)
    const scleraIdx = (20 * width + 22) * 4;
    expect(matted.data[scleraIdx + 3]).toBe(255);
    expect(matted.data[scleraIdx]).toBe(255);
    expect(matted.data[scleraIdx + 1]).toBe(255);
    expect(matted.data[scleraIdx + 2]).toBe(255);

    // Orange body should be fully preserved
    const bodyIdx = (30 * width + 40) * 4;
    expect(matted.data[bodyIdx + 3]).toBe(255);
    expect(matted.data[bodyIdx]).toBe(240);
  });

  it("handles non-PNG data gracefully without throwing", async () => {
    const fakeSvg = Buffer.from("<svg></svg>", "utf8");
    const result = await removeImageBackground(fakeSvg);
    expect(result).toEqual(fakeSvg);
  });
});
