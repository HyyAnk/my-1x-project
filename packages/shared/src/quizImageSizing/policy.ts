import type { QuizLayoutAssetAspectRatio } from "../quizLayouts.types.js";
import type { ImageSizingResult, ImageSlotGeometry, ImageSlotViewport } from "./types.js";

export const DEFAULT_SUPPORTED_RATIOS: readonly QuizLayoutAssetAspectRatio[] = Object.freeze(["1:1", "4:3", "3:4", "16:9"]);

const RATIO_TIE_BREAK_ORDER: readonly QuizLayoutAssetAspectRatio[] = Object.freeze(["1:1", "4:3", "3:4", "16:9"]);

interface RatioCandidate {
  ratioStr: QuizLayoutAssetAspectRatio;
  n: number;
  d: number;
  val: number;
}

interface CandidateLoss {
  candidate: RatioCandidate;
  maxMismatchLoss: number;
  meanMismatchLoss: number;
  maxCropLoss: number;
  maxUnusedArea: number;
}

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

function isValidGeometry(geometry: ImageSlotGeometry): boolean {
  if (
    !geometry ||
    !geometry.canvas ||
    !Number.isFinite(geometry.canvas.width) ||
    !Number.isFinite(geometry.canvas.height) ||
    geometry.canvas.width <= 0 ||
    geometry.canvas.height <= 0
  ) {
    return false;
  }

  const viewports: readonly ImageSlotViewport[] = geometry.viewports;
  if (!Array.isArray(viewports) || viewports.length === 0) {
    return false;
  }

  for (const vp of viewports as readonly ImageSlotViewport[]) {
    if (
      !vp ||
      !Number.isFinite(vp.width) ||
      !Number.isFinite(vp.height) ||
      vp.width <= 0 ||
      vp.height <= 0 ||
      (vp.fit !== "cover" && vp.fit !== "contain")
    ) {
      return false;
    }
  }

  return true;
}

function parseSupportedCandidates(supportedRatios: readonly QuizLayoutAssetAspectRatio[]): RatioCandidate[] {
  const candidates: RatioCandidate[] = [];
  for (const r of supportedRatios) {
    const parsed = parseRatio(r);
    if (parsed) {
      candidates.push({
        ratioStr: r,
        n: parsed.n,
        d: parsed.d,
        val: parsed.n / parsed.d,
      });
    }
  }
  return candidates;
}

function evaluateCandidateLosses(geometry: ImageSlotGeometry, candidates: readonly RatioCandidate[]): CandidateLoss[] {
  const evaluated: CandidateLoss[] = [];

  for (const cand of candidates) {
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

  evaluated.sort((a, b) => {
    const maxDiff = a.maxMismatchLoss - b.maxMismatchLoss;
    if (Math.abs(maxDiff) > 1e-9) return maxDiff;
    const meanDiff = a.meanMismatchLoss - b.meanMismatchLoss;
    if (Math.abs(meanDiff) > 1e-9) return meanDiff;
    const idxA = RATIO_TIE_BREAK_ORDER.indexOf(a.candidate.ratioStr);
    const idxB = RATIO_TIE_BREAK_ORDER.indexOf(b.candidate.ratioStr);
    return (idxA >= 0 ? idxA : 999) - (idxB >= 0 ? idxB : 999);
  });

  return evaluated;
}

function computeAlignedDimensions(geometry: ImageSlotGeometry, candidate: RatioCandidate): { width: number; height: number } | null {
  const { n, d } = candidate;
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
    return null;
  }

  return { width: recommendedWidth, height: recommendedHeight };
}

export function recommendImageSizing(
  geometry: ImageSlotGeometry,
  supportedRatios: readonly QuizLayoutAssetAspectRatio[] = DEFAULT_SUPPORTED_RATIOS,
): ImageSizingResult {
  if (!isValidGeometry(geometry)) {
    return { ok: false, code: "invalid_geometry" };
  }

  if (!Array.isArray(supportedRatios) || supportedRatios.length === 0) {
    return { ok: false, code: "unsupported_ratio_set" };
  }

  const validCandidates = parseSupportedCandidates(supportedRatios);
  if (validCandidates.length === 0) {
    return { ok: false, code: "unsupported_ratio_set" };
  }

  const evaluated = evaluateCandidateLosses(geometry, validCandidates);
  const best = evaluated[0];
  const dims = computeAlignedDimensions(geometry, best.candidate);

  if (!dims) {
    return { ok: false, code: "invalid_geometry" };
  }

  return {
    ok: true,
    value: {
      policyVersion: 1,
      geometry,
      aspectRatio: best.candidate.ratioStr,
      recommended: dims,
      maxCropLoss: best.maxCropLoss,
      maxUnusedArea: best.maxUnusedArea,
    },
  };
}
