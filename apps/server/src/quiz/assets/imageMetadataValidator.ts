import sharp from "sharp";
import {
  type ImageSizingRecommendation,
  type ImageSlotPurpose,
  type QuizAssetRequirement,
  type QuizLayoutAssetAspectRatio,
  getQuizImageSlotGeometry,
  recommendImageSizing,
} from "@studio/shared";

export type ImageMetadataValidationIssueCode =
  | "image_undecodable"
  | "image_output_aspect_mismatch"
  | "image_resolution_insufficient"
  | "image_resolution_below_recommendation";

export type ImageMetadataValidation = {
  actual: { width: number; height: number } | null;
  issues: Array<{
    code: ImageMetadataValidationIssueCode;
    severity: "warning" | "blocker";
  }>;
};

export interface ValidateQuizImageBytesInput {
  bytes: Uint8Array;
  recommendation: ImageSizingRecommendation;
  provenance: "explicit" | "generated";
  required: boolean;
}

const FALLBACK_DIMENSIONS_BY_RATIO: Record<string, { width: number; height: number }> = {
  "16:9": { width: 1280, height: 720 },
  "4:3": { width: 1056, height: 792 },
  "1:1": { width: 728, height: 728 },
  "3:4": { width: 768, height: 1024 },
  "9:16": { width: 720, height: 1280 },
  "2:3": { width: 720, height: 1080 },
  "3:2": { width: 1080, height: 720 },
};

export function resolveFallbackRecommendation(
  aspectRatio: QuizAssetRequirement["aspect_ratio"],
  purpose: QuizAssetRequirement["purpose"],
): ImageSizingRecommendation {
  const supportedRatios: readonly QuizLayoutAssetAspectRatio[] = ["16:9", "4:3", "1:1", "3:4"];
  const normalizedRatio: QuizLayoutAssetAspectRatio = (supportedRatios as readonly string[]).includes(aspectRatio)
    ? (aspectRatio as QuizLayoutAssetAspectRatio)
    : "16:9";
  const fallbackDims = FALLBACK_DIMENSIONS_BY_RATIO[aspectRatio] ?? { width: 1280, height: 720 };
  const slotPurpose: ImageSlotPurpose = purpose === "answer_option" ? "answer_option" : "hero_question_image";
  return {
    policyVersion: 1,
    geometry: {
      layoutId: "media_left_choices_right",
      purpose: slotPurpose,
      canvas: { width: 1920, height: 1080 },
      viewports: [{ width: fallbackDims.width / 1.5, height: fallbackDims.height / 1.5, fit: "cover" }],
      geometryKey: `fallback:${purpose}:${aspectRatio}`,
    },
    aspectRatio: normalizedRatio,
    recommended: fallbackDims,
    maxCropLoss: 0,
    maxUnusedArea: 0,
  };
}

export function getRecommendationForAssetRequirement(
  requirement: QuizAssetRequirement,
): ImageSizingRecommendation {
  const slotPurpose: ImageSlotPurpose = requirement.purpose === "answer_option" ? "answer_option" : "hero_question_image";
  const supportedRatios: readonly QuizLayoutAssetAspectRatio[] = ["16:9", "4:3", "1:1", "3:4"];
  const normalizedRatio: QuizLayoutAssetAspectRatio = (supportedRatios as readonly string[]).includes(requirement.aspect_ratio)
    ? (requirement.aspect_ratio as QuizLayoutAssetAspectRatio)
    : "16:9";

  if (requirement.sizing) {
    const geom = getQuizImageSlotGeometry({
      layoutId: requirement.sizing.layout_id,
      purpose: slotPurpose,
      presentation: "visual",
      choiceCount: 3,
      canvasAspectRatio: "16:9",
    });
    if (geom) {
      const rec = recommendImageSizing(geom);
      if (rec.ok) return rec.value;
    }

    return {
      policyVersion: requirement.sizing.policy_version,
      geometry: {
        layoutId: requirement.sizing.layout_id,
        purpose: slotPurpose,
        canvas: { width: 1920, height: 1080 },
        viewports: [
          {
            width: requirement.sizing.recommended_width / 1.5,
            height: requirement.sizing.recommended_height / 1.5,
            fit: "cover",
          },
        ],
        geometryKey: requirement.sizing.geometry_key,
      },
      aspectRatio: normalizedRatio,
      recommended: {
        width: requirement.sizing.recommended_width,
        height: requirement.sizing.recommended_height,
      },
      maxCropLoss: 0,
      maxUnusedArea: 0,
    };
  }

  return resolveFallbackRecommendation(requirement.aspect_ratio, requirement.purpose);
}

/**
 * Validates actual image bytes against layout recommendation and provenance.
 * Never trusts provider ratio labels alone. Decodes actual raster dimensions
 * honoring orientation.
 */
export async function validateQuizImageBytes(
  input: ValidateQuizImageBytesInput,
): Promise<ImageMetadataValidation> {
  let width = 0;
  let height = 0;

  try {
    const metadata = await sharp(input.bytes, { failOn: "none" }).metadata();
    if (metadata.width && metadata.height) {
      const isTransposed =
        typeof metadata.orientation === "number" &&
        metadata.orientation >= 5 &&
        metadata.orientation <= 8;
      width = isTransposed ? metadata.height : metadata.width;
      height = isTransposed ? metadata.width : metadata.height;
    }
  } catch {
    // Decoding failed
  }

  if (!width || !height || width <= 0 || height <= 0) {
    return {
      actual: null,
      issues: [
        {
          code: "image_undecodable",
          severity: input.required ? "blocker" : "warning",
        },
      ],
    };
  }

  const issues: ImageMetadataValidation["issues"] = [];

  // 1. Aspect Ratio Error Check (normalized error <= 2%)
  const parts = input.recommendation.aspectRatio.split(":");
  const targetRatio = Number(parts[0]) / Number(parts[1]);
  const actualRatio = width / height;
  const ratioError = Math.abs(actualRatio - targetRatio) / targetRatio;

  if (ratioError > 0.02) {
    issues.push({
      code: "image_output_aspect_mismatch",
      severity: input.provenance === "generated" && input.required ? "blocker" : "warning",
    });
  }

  // 2. Resolution Checks (1.0x display minimum and 1.5x recommendation)
  const minDisplayWidth = Math.floor(input.recommendation.recommended.width / 1.5);
  const minDisplayHeight = Math.floor(input.recommendation.recommended.height / 1.5);

  if (width < minDisplayWidth || height < minDisplayHeight) {
    issues.push({
      code: "image_resolution_insufficient",
      severity: input.provenance === "generated" && input.required ? "blocker" : "warning",
    });
  } else if (
    width < input.recommendation.recommended.width ||
    height < input.recommendation.recommended.height
  ) {
    issues.push({
      code: "image_resolution_below_recommendation",
      severity: "warning",
    });
  }

  return {
    actual: { width, height },
    issues,
  };
}
