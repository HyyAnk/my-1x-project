import type { QuizLayoutAssetAspectRatio } from "../quizLayouts.types.js";
import type { ImageSizingRecommendation, ImageSizingResult, ImageSlotGeometry } from "./types.js";

export const DEFAULT_SUPPORTED_RATIOS: readonly QuizLayoutAssetAspectRatio[] = Object.freeze(["1:1", "4:3", "3:4", "16:9"]);

const RATIO_TIE_BREAK_ORDER: readonly QuizLayoutAssetAspectRatio[] = Object.freeze(["1:1", "4:3", "3:4", "16:9"]);

function gcd(a: number, b: number): number {
  let x = Math.abs(Math.round(a));
  let y = Math.abs(Math.round(b));
  while (y > 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

function lcm(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return Math.abs(Math.round((a * b) / gcd(a, b)));
}

function parseRatio(ratio: string): { n: number; d: number } | null {
  const parts = ratio.split(":");
  if (parts.length !== 2) return null;
  const n = Number(parts[0]);
  const d = Number(parts[1]);
  if (!Number.isFinite(n) || !Number.isFinite(d) || n <= 0 || d <= 0) {
    return null;
  }
  return { n, d };
}

export function recommendImageSizing(
  geometry: ImageSlotGeometry,
  supportedRatios: readonly QuizLayoutAssetAspectRatio[] = DEFAULT_SUPPORTED_RATIOS,
): ImageSizingResult {
  // 1. Validate Geometry
  if (
    !geometry ||
    !Array.isArray(geometry.viewports) ||
    geometry.viewports.length === 0 ||
    !geometry.canvas ||
    !Number.isFinite(geometry.canvas.width) ||
    !Number.isFinite(geometry.canvas.height) ||
    geometry.canvas.width <= 0 ||
    geometry.canvas.height <= 0
  ) {
    return { ok: false, code: "invalid_geometry" };
  }

  for (const vp of geometry.viewports) {
    if (
      !vp ||
      !Number.isFinite(vp.width) ||
      !Number.isFinite(vp.height) ||
      vp.width <= 0 ||
      vp.height <= 0 ||
      (vp.fit !== "cover" && vp.fit !== "contain")
    ) {
      return { ok: false, code: "invalid_geometry" };
    }
  }

  // 2. Validate Supported Ratios
  if (!Array.isArray(supportedRatios) || supportedRatios.length === 0) {
    return { ok: false, code: "unsupported_ratio_set" };
  }

  const validCandidates: Array<{
    ratioStr: QuizLayoutAssetAspectRatio;
    n: number;
    d: number;
    val: number;
  }> = [];

  for (const r of supportedRatios) {
    const parsed = parseRatio(r);
    if (parsed) {
      validCandidates.push({
        ratioStr: r,
        n: parsed.n,
        d: parsed.d,
        val: parsed.n / parsed.d,
      });
    }
  }

  if (validCandidates.length === 0) {
    return { ok: false, code: "unsupported_ratio_set" };
  }

  // 3. Evaluate Candidates
  interface CandidateLoss {
    candidate: (typeof validCandidates)[number];
    maxMismatchLoss: number;
    meanMismatchLoss: number;
    maxCropLoss: number;
    maxUnusedArea: number;
  }

  const evaluated: CandidateLoss[] = [];

  for (const cand of validCandidates) {
    const s = cand.val;
    let maxMismatch = 0;
    let totalMismatch = 0;
    let maxCrop = 0;
    let maxUnused = 0;

    for (const vp of geometry.viewports) {
      const r = vp.width / vp.height;
      const utilization = Math.min(s / r, r / s);
      const mismatchLoss = 1 - utilization;
      const cropLoss = vp.fit === "cover" ? mismatchLoss : 0;
      const unusedArea = vp.fit === "contain" ? mismatchLoss : 0;

      if (mismatchLoss > maxMismatch) maxMismatch = mismatchLoss;
      totalMismatch += mismatchLoss;
      if (cropLoss > maxCrop) maxCrop = cropLoss;
      if (unusedArea > maxUnused) maxUnused = unusedArea;
    }

    evaluated.push({
      candidate: cand,
      maxMismatchLoss: maxMismatch,
      meanMismatchLoss: totalMismatch / geometry.viewports.length,
      maxCropLoss: maxCrop,
      maxUnusedArea: maxUnused,
    });
  }

  // 4. Rank candidates by minimax mismatchLoss, then mean mismatchLoss, then fixed order
  evaluated.sort((a, b) => {
    const maxDiff = a.maxMismatchLoss - b.maxMismatchLoss;
    if (Math.abs(maxDiff) > 1e-9) {
      return maxDiff;
    }
    const meanDiff = a.meanMismatchLoss - b.meanMismatchLoss;
    if (Math.abs(meanDiff) > 1e-9) {
      return meanDiff;
    }
    const idxA = RATIO_TIE_BREAK_ORDER.indexOf(a.candidate.ratioStr);
    const idxB = RATIO_TIE_BREAK_ORDER.indexOf(b.candidate.ratioStr);
    return (idxA >= 0 ? idxA : 999) - (idxB >= 0 ? idxB : 999);
  });

  const best = evaluated[0];
  const { n, d, ratioStr } = best.candidate;

  // 5. Calculate Recommended Raster Dimensions
  const perViewportScales = geometry.viewports.map((vp) =>
    vp.fit === "cover" ? Math.max(vp.width / n, vp.height / d) : Math.min(vp.width / n, vp.height / d),
  );

  const maxScale = Math.max(...perViewportScales);
  const requiredScale = 1.5 * maxScale;
  const quantum = lcm(8 / gcd(8, n), 8 / gcd(8, d));
  const alignedScale = Math.ceil(requiredScale / quantum) * quantum;
  const recommendedWidth = n * alignedScale;
  const recommendedHeight = d * alignedScale;

  if (
    !Number.isSafeInteger(recommendedWidth) ||
    !Number.isSafeInteger(recommendedHeight) ||
    recommendedWidth <= 0 ||
    recommendedHeight <= 0
  ) {
    return { ok: false, code: "invalid_geometry" };
  }

  return {
    ok: true,
    value: {
      policyVersion: 1,
      geometry,
      aspectRatio: ratioStr,
      recommended: {
        width: recommendedWidth,
        height: recommendedHeight,
      },
      maxCropLoss: best.maxCropLoss,
      maxUnusedArea: best.maxUnusedArea,
    },
  };
}
