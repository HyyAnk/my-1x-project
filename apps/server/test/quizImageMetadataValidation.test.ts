import { describe, expect, it } from "vitest";
import sharp from "sharp";
import type { ImageSizingRecommendation } from "@studio/shared";
import {
  validateQuizImageBytes,
  resolveFallbackRecommendation,
} from "../src/quiz/assets/imageMetadataValidator.js";

function makeRecommendation(
  aspectRatio: "16:9" | "4:3" | "1:1" | "3:4",
  width: number,
  height: number,
): ImageSizingRecommendation {
  return {
    policyVersion: 1,
    geometry: {
      layoutId: "test_layout",
      purpose: "hero_question_image",
      canvas: { width: 1920, height: 1080 },
      viewports: [{ width: width / 1.5, height: height / 1.5, fit: "cover" }],
      geometryKey: `test:${aspectRatio}:${width}x${height}`,
    },
    aspectRatio,
    recommended: { width, height },
    maxCropLoss: 0,
    maxUnusedArea: 0,
  };
}

describe("quizImageMetadataValidation", () => {
  it("validates compliant 1280x720 PNG matching 16:9 recommendation without issues", async () => {
    const bytes = await sharp({
      create: { width: 1280, height: 720, channels: 4, background: { r: 50, g: 100, b: 150, alpha: 1 } },
    })
      .png()
      .toBuffer();

    const rec = makeRecommendation("16:9", 1280, 720);
    const result = await validateQuizImageBytes({
      bytes: new Uint8Array(bytes),
      recommendation: rec,
      provenance: "generated",
      required: true,
    });

    expect(result.actual).toEqual({ width: 1280, height: 720 });
    expect(result.issues).toEqual([]);
  });

  it("validates compliant 1024x768 JPEG for 4:3 recommendation (proves non-PNG format support)", async () => {
    const bytes = await sharp({
      create: { width: 1024, height: 768, channels: 3, background: { r: 200, g: 100, b: 50 } },
    })
      .jpeg()
      .toBuffer();

    const rec = makeRecommendation("4:3", 1024, 768);
    const result = await validateQuizImageBytes({
      bytes: new Uint8Array(bytes),
      recommendation: rec,
      provenance: "generated",
      required: true,
    });

    expect(result.actual).toEqual({ width: 1024, height: 768 });
    expect(result.issues).toEqual([]);
  });

  it("validates compliant 1024x1024 WebP for 1:1 recommendation", async () => {
    const bytes = await sharp({
      create: { width: 1024, height: 1024, channels: 4, background: { r: 80, g: 180, b: 80, alpha: 1 } },
    })
      .webp()
      .toBuffer();

    const rec = makeRecommendation("1:1", 728, 728);
    const result = await validateQuizImageBytes({
      bytes: new Uint8Array(bytes),
      recommendation: rec,
      provenance: "generated",
      required: true,
    });

    expect(result.actual).toEqual({ width: 1024, height: 1024 });
    expect(result.issues).toEqual([]);
  });

  it("blocks generated square bytes returned for a requested 16:9 image", async () => {
    const bytes = await sharp({
      create: { width: 1024, height: 1024, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 1 } },
    })
      .png()
      .toBuffer();

    const rec = makeRecommendation("16:9", 1280, 720);
    const result = await validateQuizImageBytes({
      bytes: new Uint8Array(bytes),
      recommendation: rec,
      provenance: "generated",
      required: true,
    });

    expect(result.actual).toEqual({ width: 1024, height: 1024 });
    expect(result.issues).toContainEqual({
      code: "image_output_aspect_mismatch",
      severity: "blocker",
    });
  });

  it("warns but does not block when explicit user-selected image has aspect ratio mismatch", async () => {
    const bytes = await sharp({
      create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 255, alpha: 1 } },
    })
      .png()
      .toBuffer();

    const rec = makeRecommendation("16:9", 1280, 720);
    const result = await validateQuizImageBytes({
      bytes: new Uint8Array(bytes),
      recommendation: rec,
      provenance: "explicit",
      required: true,
    });

    expect(result.actual).toEqual({ width: 1024, height: 1024 });
    expect(result.issues).toContainEqual({
      code: "image_output_aspect_mismatch",
      severity: "warning",
    });
    // Explicit source preserves selection: no blocker issues
    expect(result.issues.some((i) => i.severity === "blocker")).toBe(false);
  });

  it("blocks generated image with resolution below 1.0x visible display requirement", async () => {
    // 320x180 has 16:9 ratio, but recommendation is 1280x720 (1.0x threshold is 853x480)
    const bytes = await sharp({
      create: { width: 320, height: 180, channels: 4, background: { r: 100, g: 100, b: 100, alpha: 1 } },
    })
      .png()
      .toBuffer();

    const rec = makeRecommendation("16:9", 1280, 720);
    const result = await validateQuizImageBytes({
      bytes: new Uint8Array(bytes),
      recommendation: rec,
      provenance: "generated",
      required: true,
    });

    expect(result.actual).toEqual({ width: 320, height: 180 });
    expect(result.issues).toContainEqual({
      code: "image_resolution_insufficient",
      severity: "blocker",
    });
  });

  it("warns when image resolution is between 1.0x and 1.5x recommendation", async () => {
    // 1024x576 is 16:9, above 853x480 (1.0x) but below 1280x720 (1.5x)
    const bytes = await sharp({
      create: { width: 1024, height: 576, channels: 4, background: { r: 120, g: 120, b: 120, alpha: 1 } },
    })
      .png()
      .toBuffer();

    const rec = makeRecommendation("16:9", 1280, 720);
    const result = await validateQuizImageBytes({
      bytes: new Uint8Array(bytes),
      recommendation: rec,
      provenance: "generated",
      required: true,
    });

    expect(result.actual).toEqual({ width: 1024, height: 576 });
    expect(result.issues).toContainEqual({
      code: "image_resolution_below_recommendation",
      severity: "warning",
    });
    expect(result.issues.some((i) => i.severity === "blocker")).toBe(false);
  });

  it("flags undecodable corrupted bytes as blocker for required asset", async () => {
    const corruptBytes = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const rec = makeRecommendation("16:9", 1280, 720);

    const result = await validateQuizImageBytes({
      bytes: corruptBytes,
      recommendation: rec,
      provenance: "generated",
      required: true,
    });

    expect(result.actual).toBeNull();
    expect(result.issues).toContainEqual({
      code: "image_undecodable",
      severity: "blocker",
    });
  });

  it("resolves fallback recommendations deterministically when layout sizing metadata is omitted", () => {
    const rec16_9 = resolveFallbackRecommendation("16:9", "hero_question_image");
    expect(rec16_9.aspectRatio).toBe("16:9");
    expect(rec16_9.recommended).toEqual({ width: 1280, height: 720 });

    const rec4_3 = resolveFallbackRecommendation("4:3", "answer_option");
    expect(rec4_3.aspectRatio).toBe("4:3");
    expect(rec4_3.recommended).toEqual({ width: 1056, height: 792 });
  });
});
