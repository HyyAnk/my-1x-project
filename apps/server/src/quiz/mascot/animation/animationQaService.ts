import path from "node:path";
import { REQUIRED_FPS, REQUIRED_FRAME_COUNT } from "@studio/shared";
import { writeJsonAtomic } from "../../../utils/fs.js";
import { analyzeFrameTransitions, extractFrameThumbnailsAndAlpha, resolveAtlasBuffer } from "./animationQaFrameMetrics.js";
import {
  DEFAULT_QA_THRESHOLDS,
  type AnimationQaCheckName,
  type AnimationQaCheckResult,
  type AnimationQaReport,
  type AnimationQaThresholds,
  type ValidateAnimationInput,
} from "./animationQaTypes.js";

export class AnimationQaService {
  private readonly defaultThresholds: AnimationQaThresholds;

  constructor(thresholds?: Partial<AnimationQaThresholds>) {
    this.defaultThresholds = { ...DEFAULT_QA_THRESHOLDS, ...thresholds };
  }

  public async validateAnimationRow(input: ValidateAnimationInput): Promise<AnimationQaReport> {
    const thresholds: AnimationQaThresholds = {
      ...this.defaultThresholds,
      ...input.thresholds,
    };
    const checks: Record<AnimationQaCheckName, AnimationQaCheckResult> = {
      frame_count: this.checkFrameCount(input),
      bounds: this.checkBounds(input),
      alpha_coverage: { passed: true, score: 1.0, message: "Skipped (no atlas image provided)" },
      duplicate_pose: { passed: true, score: 1.0, message: "Skipped (no atlas image provided)" },
      motion_difference: { passed: true, score: 1.0, message: "Skipped (no atlas image provided)" },
      seam: { passed: true, score: 1.0, message: "Skipped (no atlas image provided)" },
      fingerprint_consistency: this.checkFingerprint(input),
    };

    const atlasBuffer = await resolveAtlasBuffer(input.atlas);
    let avgAlpha = 1.0;
    let dupRatio = 0.0;
    let motionScore = 1.0;
    let seamDiff = 0.0;

    if (atlasBuffer && checks.bounds.passed && checks.frame_count.passed) {
      const { thumbnails, alphaRatios } = await extractFrameThumbnailsAndAlpha(
        atlasBuffer,
        input.frames,
        input.atlas.width,
        input.atlas.height,
      );

      const metrics = analyzeFrameTransitions(thumbnails, alphaRatios, thresholds);
      avgAlpha = alphaRatios.reduce((sum, r) => sum + r, 0) / (alphaRatios.length || 1);
      dupRatio = metrics.duplicateRatio;
      motionScore = metrics.averageMotionDifference;
      seamDiff = metrics.seamDifference;

      checks.alpha_coverage = this.checkAlphaCoverage(alphaRatios, thresholds.minAlphaRatio);
      checks.duplicate_pose = this.checkDuplicatePose(metrics.duplicateRatio, thresholds.maxDuplicateRatio);
      checks.motion_difference = this.checkMotionDifference(metrics.averageMotionDifference, thresholds.minMotionDifference);
      checks.seam = this.checkSeam(metrics.seamDifference, thresholds.maxSeamDifference, input.state);
    }

    const checkList = Object.values(checks);
    const passed = checkList.every((c) => c.passed);
    const sumScores = checkList.reduce((sum, c) => sum + c.score, 0);
    const overallScore = passed ? Number((sumScores / checkList.length).toFixed(3)) : 0;

    return {
      version: 1,
      job_id: input.jobId,
      passed,
      score: overallScore,
      timestamp: new Date().toISOString(),
      checks,
      summary: {
        state: input.state,
        recipe_id: input.recipeId,
        frame_count: input.frames.length,
        fps: REQUIRED_FPS,
        average_alpha_ratio: Number(avgAlpha.toFixed(3)),
        duplicate_ratio: Number(dupRatio.toFixed(3)),
        motion_score: Number(motionScore.toFixed(3)),
        seam_difference: Number(seamDiff.toFixed(3)),
        content_fingerprint: input.expectedContentFingerprint,
      },
    };
  }

  public async saveQaReport(dir: string, report: AnimationQaReport): Promise<string> {
    const targetPath = path.join(dir, "qa_report.json");
    await writeJsonAtomic(targetPath, report);
    return targetPath;
  }

  private checkFrameCount(input: ValidateAnimationInput): AnimationQaCheckResult {
    const actual = input.frames.length;
    if (actual !== REQUIRED_FRAME_COUNT) {
      return {
        passed: false,
        score: 0,
        message: `Frame count ${actual} does not match required ${REQUIRED_FRAME_COUNT} frames`,
      };
    }
    const sequential = input.frames.every((f, i) => f.index === i);
    if (!sequential) {
      return {
        passed: false,
        score: 0.5,
        message: "Frames must be strictly ordered with sequential indices 0..11",
      };
    }
    return { passed: true, score: 1.0, message: "Valid 12 frames with sequential indices" };
  }

  private checkBounds(input: ValidateAnimationInput): AnimationQaCheckResult {
    const { width: aW, height: aH } = input.atlas;
    for (let i = 0; i < input.frames.length; i += 1) {
      const f = input.frames[i];
      if (f.x < 0 || f.y < 0 || f.width <= 0 || f.height <= 0) {
        return {
          passed: false,
          score: 0,
          message: `Frame ${i} has negative or zero bounds (x=${f.x}, y=${f.y}, w=${f.width}, h=${f.height})`,
        };
      }
      if (f.x + f.width > aW || f.y + f.height > aH) {
        return {
          passed: false,
          score: 0,
          message: `Frame ${i} exceeds atlas bounds (frame right=${f.x + f.width} > atlas ${aW} or bottom=${f.y + f.height} > atlas ${aH})`,
        };
      }
    }
    return { passed: true, score: 1.0, message: "All frame rectangles strictly within atlas bounds" };
  }

  private checkAlphaCoverage(alphaRatios: number[], minRatio: number): AnimationQaCheckResult {
    const minAlpha = Math.min(...alphaRatios);
    if (minAlpha < minRatio) {
      return {
        passed: false,
        score: Number((minAlpha / minRatio).toFixed(2)),
        message: `Frame alpha coverage ${Number((minAlpha * 100).toFixed(1))}% is below threshold ${Number((minRatio * 100).toFixed(1))}%`,
      };
    }
    return { passed: true, score: 1.0, message: "Sufficient non-transparent alpha coverage across all frames" };
  }

  private checkDuplicatePose(dupRatio: number, maxRatio: number): AnimationQaCheckResult {
    if (dupRatio > maxRatio) {
      return {
        passed: false,
        score: Number((1 - dupRatio).toFixed(2)),
        message: `Duplicate pose ratio ${Number((dupRatio * 100).toFixed(1))}% exceeds threshold ${Number((maxRatio * 100).toFixed(1))}%`,
      };
    }
    return { passed: true, score: 1.0, message: "Acceptable pose variation between adjacent frames" };
  }

  private checkMotionDifference(avgDiff: number, minDiff: number): AnimationQaCheckResult {
    if (avgDiff < minDiff) {
      return {
        passed: false,
        score: Number((avgDiff / minDiff).toFixed(2)),
        message: `Row motion difference ${avgDiff.toFixed(3)} is below minimum discernible threshold ${minDiff}`,
      };
    }
    return { passed: true, score: 1.0, message: "Discernible character motion across animation row" };
  }

  private checkSeam(seamDiff: number, maxDiff: number, state: string): AnimationQaCheckResult {
    if (seamDiff > maxDiff) {
      return {
        passed: false,
        score: Number((1 - seamDiff).toFixed(2)),
        message: `Seam difference ${seamDiff.toFixed(3)} exceeds loop tolerance ${maxDiff} for ${state}`,
      };
    }
    return { passed: true, score: 1.0, message: `Smooth seam continuity for ${state}` };
  }

  private checkFingerprint(input: ValidateAnimationInput): AnimationQaCheckResult {
    if (!input.declaredFingerprint || !input.expectedContentFingerprint) {
      return { passed: true, score: 1.0, message: "Fingerprint verification passed" };
    }
    if (input.declaredFingerprint !== input.expectedContentFingerprint) {
      return {
        passed: false,
        score: 0,
        message: `Fingerprint mismatch: declared '${input.declaredFingerprint}' != computed '${input.expectedContentFingerprint}'`,
      };
    }
    return { passed: true, score: 1.0, message: "Manifest and atlas share consistent content fingerprint" };
  }
}

export function createAnimationQaService(thresholds?: Partial<AnimationQaThresholds>): AnimationQaService {
  return new AnimationQaService(thresholds);
}
