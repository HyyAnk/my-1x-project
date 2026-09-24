import { describe, expect, it } from "vitest";
import sharp from "sharp";
import {
  decodePngToRgba,
  detectNativeTransparency,
  encodeRgbaToPng,
  isChromaGreenPixel,
  resolveComposition,
  validateGreenScreen,
  validateGreenScreenNormalized,
  type DecodedImage,
} from "../src/utils/imageMatting.js";

type Rgba = readonly [number, number, number, number];

function createDecodedImage(width: number, height: number, fillColor: Rgba = [0, 0, 0, 0]): DecodedImage {
  const data = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    data.set(fillColor, i * 4);
  }
  return { width, height, data };
}

function fillRect(
  data: Uint8Array,
  width: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: Rgba,
): void {
  for (let y = y1; y < y2; y++) {
    for (let x = x1; x < x2; x++) {
      const idx = (y * width + x) * 4;
      data.set(color, idx);
    }
  }
}

describe("greenScreenValidator", () => {
  describe("isChromaGreenPixel", () => {
    it("identifies authentic chroma key green colors", () => {
      // Pure green #00FF00
      expect(isChromaGreenPixel(0, 255, 0, 255)).toBe(true);
      // Realistic chroma green with slight camera noise
      expect(isChromaGreenPixel(15, 230, 20, 255)).toBe(true);
      // Minimum brightness boundary (g >= 120, g - r > 35, g - b > 35)
      expect(isChromaGreenPixel(50, 120, 50, 255)).toBe(true);
    });

    it("rejects non-green, dark, desaturated, or transparent pixels", () => {
      // White, gray, black
      expect(isChromaGreenPixel(255, 255, 255, 255)).toBe(false);
      expect(isChromaGreenPixel(128, 128, 128, 255)).toBe(false);
      expect(isChromaGreenPixel(0, 0, 0, 255)).toBe(false);

      // Murky dark green below minimum brightness (g < 120)
      expect(isChromaGreenPixel(10, 80, 10, 255)).toBe(false);

      // Yellow / lime without green dominance
      expect(isChromaGreenPixel(220, 230, 20, 255)).toBe(false);

      // Cyan / turquoise
      expect(isChromaGreenPixel(10, 200, 190, 255)).toBe(false);

      // Transparent green (alpha < 200)
      expect(isChromaGreenPixel(0, 255, 0, 100)).toBe(false);
      expect(isChromaGreenPixel(0, 255, 0, 0)).toBe(false);
    });
  });

  describe("resolveComposition", () => {
    it("resolves composition correctly based on aspect ratio and overrides", () => {
      expect(resolveComposition(1280, 720)).toBe("16:9");
      expect(resolveComposition(160, 90)).toBe("16:9");
      expect(resolveComposition(1024, 1024)).toBe("1:1");
      expect(resolveComposition(64, 64)).toBe("1:1");

      // Explicit overrides
      expect(resolveComposition(1280, 720, "1:1")).toBe("1:1");
      expect(resolveComposition(1024, 1024, "16:9")).toBe("16:9");
    });
  });

  describe("detectNativeTransparency", () => {
    it("detects genuine native transparency", () => {
      const img = createDecodedImage(40, 40, [0, 0, 0, 0]);
      // Center subject
      fillRect(img.data, 40, 10, 10, 30, 30, [255, 120, 0, 255]);
      expect(detectNativeTransparency(img)).toBe(true);
    });

    it("returns false for solid opaque images", () => {
      const img = createDecodedImage(40, 40, [0, 255, 0, 255]);
      expect(detectNativeTransparency(img)).toBe(false);
    });
  });

  describe("validateGreenScreen - Core Acceptance Scenarios", () => {
    it("validates a pure green screen opaque image", () => {
      const width = 64;
      const height = 64;
      const img = createDecodedImage(width, height, [0, 255, 0, 255]);

      const result = validateGreenScreen(img);

      expect(result.isValid).toBe(true);
      expect(result.reason).toBeUndefined();
      expect(result.greenRatio).toBe(1);
      expect(result.isTransparent).toBe(false);
      expect(result.sampledPoints).toBeGreaterThan(0);
      expect(result.greenPoints).toBe(result.sampledPoints);
    });

    it("validates a pure green screen image from raw encoded PNG bytes", () => {
      const width = 48;
      const height = 48;
      const img = createDecodedImage(width, height, [10, 245, 15, 255]);
      const pngBytes = encodeRgbaToPng(img);

      const result = validateGreenScreen(pngBytes);

      expect(result.isValid).toBe(true);
      expect(result.greenRatio).toBe(1);
      expect(result.isTransparent).toBe(false);
    });

    it("rejects transparent PNG due to native transparency", () => {
      const width = 64;
      const height = 64;
      const img = createDecodedImage(width, height, [0, 0, 0, 0]);
      // Draw character in center
      fillRect(img.data, width, 16, 16, 48, 48, [240, 100, 10, 255]);

      const result = validateGreenScreen(img);

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe("native_transparency");
      expect(result.isTransparent).toBe(true);
      expect(result.greenRatio).toBe(0);
    });

    it("rejects white, gray, and black opaque images due to insufficient green chroma", () => {
      const width = 64;
      const height = 64;

      // Solid White
      const whiteImg = createDecodedImage(width, height, [255, 255, 255, 255]);
      const whiteResult = validateGreenScreen(whiteImg);
      expect(whiteResult.isValid).toBe(false);
      expect(whiteResult.reason).toBe("insufficient_green_chroma");
      expect(whiteResult.isTransparent).toBe(false);
      expect(whiteResult.greenRatio).toBe(0);

      // Solid Gray
      const grayImg = createDecodedImage(width, height, [128, 128, 128, 255]);
      const grayResult = validateGreenScreen(grayImg);
      expect(grayResult.isValid).toBe(false);
      expect(grayResult.reason).toBe("insufficient_green_chroma");
      expect(grayResult.greenRatio).toBe(0);

      // Solid Black
      const blackImg = createDecodedImage(width, height, [0, 0, 0, 255]);
      const blackResult = validateGreenScreen(blackImg);
      expect(blackResult.isValid).toBe(false);
      expect(blackResult.reason).toBe("insufficient_green_chroma");
      expect(blackResult.greenRatio).toBe(0);
    });

    it("rejects natural scene / complex non-green background", () => {
      const width = 64;
      const height = 64;
      const img = createDecodedImage(width, height, [135, 206, 235, 255]); // Sky blue

      // Ground (brown)
      fillRect(img.data, width, 0, 44, width, height, [139, 69, 19, 255]);
      // Brick building (red)
      fillRect(img.data, width, 0, 20, 20, 44, [178, 34, 34, 255]);

      const result = validateGreenScreen(img);

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe("insufficient_green_chroma");
      expect(result.isTransparent).toBe(false);
      expect(result.greenRatio).toBeLessThan(0.65);
    });

    it("validates 16:9 canvas with green headroom and green borders", () => {
      const width = 160;
      const height = 90;
      const img = createDecodedImage(width, height, [0, 255, 0, 255]);

      // Draw half-body mascot character in bottom center (x: 45..115, y: 35..90)
      // Notice headroom (y: 0..30) is untouched green screen
      fillRect(img.data, width, 45, 35, 115, height, [255, 140, 0, 255]);

      const result = validateGreenScreen(img, { composition: "16:9" });

      expect(result.isValid).toBe(true);
      expect(result.composition).toBe("16:9");
      expect(result.greenRatio).toBeGreaterThanOrEqual(0.65);
      expect(result.isTransparent).toBe(false);
      expect(result.details?.headroomRatio).toBe(1);
      expect(result.details?.borderRatio).toBeGreaterThanOrEqual(0.9);
    });

    it("validates 1:1 canvas with green borders", () => {
      const width = 64;
      const height = 64;
      const img = createDecodedImage(width, height, [0, 255, 0, 255]);

      // Full-body mascot in center (x: 10..54, y: 8..58)
      // Perimeter borders (outer 5%) and 4 corners remain green
      fillRect(img.data, width, 10, 8, 54, 58, [65, 105, 225, 255]);

      const result = validateGreenScreen(img, { composition: "1:1" });

      expect(result.isValid).toBe(true);
      expect(result.composition).toBe("1:1");
      expect(result.greenRatio).toBeGreaterThanOrEqual(0.65);
      expect(result.isTransparent).toBe(false);
      expect(result.details?.borderRatio).toBeGreaterThanOrEqual(0.9);
    });

    it("validates image with a green character inside an opaque green background (subject color safety)", () => {
      const width = 64;
      const height = 64;
      // Backdrop: Chroma Key Green
      const img = createDecodedImage(width, height, [0, 255, 0, 255]);

      // Mascot subject: A green frog or dinosaur character
      fillRect(img.data, width, 12, 12, 52, 52, [34, 180, 45, 255]);

      const result = validateGreenScreen(img);

      expect(result.isValid).toBe(true);
      expect(result.reason).toBeUndefined();
      expect(result.greenRatio).toBe(1);
      expect(result.isTransparent).toBe(false);
    });

    it("rejects image with a green character on a white background (no false positive)", () => {
      const width = 64;
      const height = 64;
      // Backdrop: Pure White
      const img = createDecodedImage(width, height, [255, 255, 255, 255]);

      // Mascot subject: Bright green frog character in the center
      fillRect(img.data, width, 12, 12, 52, 52, [0, 255, 0, 255]);

      const result = validateGreenScreen(img);

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe("insufficient_green_chroma");
      expect(result.greenRatio).toBe(0);
      expect(result.isTransparent).toBe(false);
    });
  });

  describe("validateGreenScreen - Edge Cases & Robustness", () => {
    it("handles corrupted or invalid PNG bytes gracefully", () => {
      const fakeCorruptBytes = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      const result = validateGreenScreen(fakeCorruptBytes);

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe("invalid_image");
      expect(result.greenRatio).toBe(0);
    });

    it("handles zero dimensions image safely", () => {
      const zeroImg: DecodedImage = { width: 0, height: 0, data: new Uint8Array(0) };
      const result = validateGreenScreen(zeroImg);

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe("zero_dimensions");
    });

    it("honors custom minGreenRatio threshold", () => {
      const width = 64;
      const height = 64;
      const img = createDecodedImage(width, height, [0, 255, 0, 255]);

      // Cover 25% of image with black
      fillRect(img.data, width, 0, 0, width, 16, [0, 0, 0, 255]);

      // With default 0.65 threshold, it might pass or fail depending on ratio
      // With strict 0.95 threshold, it must fail
      const strictResult = validateGreenScreen(img, { minGreenRatio: 0.95 });
      expect(strictResult.isValid).toBe(false);
      expect(strictResult.reason).toBe("insufficient_green_chroma");
    });

    it("normalizes and validates WebP images via validateGreenScreenNormalized", async () => {
      const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#00ff00"/><circle cx="32" cy="32" r="16" fill="#f97316"/></svg>';
      const webpBytes = await sharp(Buffer.from(svg)).webp({ lossless: true }).toBuffer();

      const result = await validateGreenScreenNormalized(webpBytes);

      expect(result.isValid).toBe(true);
      expect(result.greenRatio).toBeGreaterThanOrEqual(0.65);
      expect(result.isTransparent).toBe(false);
    });
  });
});
