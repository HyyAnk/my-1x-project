import { REQUIRED_FRAME_COUNT, type MascotAssetRegistration, type MascotBounds, type MascotPoint } from "@studio/shared";
import { FrameRegistrationError } from "./registrationErrors.js";
import type {
  ComputeRegistrationFromFramesParams,
  FrameCentroid,
  FrameGeometryInput,
  SequenceRegistrationResult,
} from "./registrationTypes.js";

function validateFrameGeometries(frames: FrameGeometryInput[], expectedFrameCount?: number): { baseWidth: number; baseHeight: number } {
  if (expectedFrameCount !== undefined) {
    if (frames.length !== expectedFrameCount) {
      throw new FrameRegistrationError(
        `Sequence registration requires exactly ${expectedFrameCount} frames, received: ${frames.length}`,
        "INVALID_FRAME_COUNT",
      );
    }
  } else if (frames.length < REQUIRED_FRAME_COUNT) {
    throw new FrameRegistrationError(
      `Sequence registration requires at least ${REQUIRED_FRAME_COUNT} frames, received: ${frames.length}`,
      "INVALID_FRAME_COUNT",
    );
  }

  const baseWidth = frames[0].width;
  const baseHeight = frames[0].height;

  for (const f of frames) {
    if (f.width !== baseWidth || f.height !== baseHeight) {
      throw new FrameRegistrationError(
        `Inconsistent frame dimensions detected: frame 1 is ${baseWidth}x${baseHeight}, but frame ${f.frameIndex} is ${f.width}x${f.height}. Per-frame resizing/cropping is strictly prohibited.`,
        "INCONSISTENT_FRAME_DIMENSIONS",
      );
    }
    if (f.bounds.minX > f.bounds.maxX || f.bounds.minY > f.bounds.maxY) {
      throw new FrameRegistrationError(
        `Frame ${f.frameIndex} has empty or inverted content bounds: [${f.bounds.minX}, ${f.bounds.minY}, ${f.bounds.maxX}, ${f.bounds.maxY}]`,
        "EMPTY_FRAME_BOUNDS",
      );
    }
  }

  return { baseWidth, baseHeight };
}

function calculateCentroidDrift(frameCentroids: FrameCentroid[], maxAllowedDriftPx: number): { maxDriftPx: number; avgDriftPx: number } {
  let maxDrift = 0;
  let totalDrift = 0;
  const stepCount = frameCentroids.length - 1;

  for (let i = 0; i < stepCount; i++) {
    const c1 = frameCentroids[i];
    const c2 = frameCentroids[i + 1];
    const dx = c2.x - c1.x;
    const dy = c2.y - c1.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    totalDrift += dist;
    if (dist > maxDrift) {
      maxDrift = dist;
    }
  }

  const avgDriftPx = stepCount > 0 ? Number((totalDrift / stepCount).toFixed(2)) : 0;
  const maxDriftPx = Number(maxDrift.toFixed(2));

  if (maxDriftPx > maxAllowedDriftPx) {
    throw new FrameRegistrationError(
      `Inter-frame centroid drift of ${maxDriftPx}px exceeds maximum allowed tolerance of ${maxAllowedDriftPx}px`,
      "EXCESSIVE_DRIFT",
    );
  }

  return { maxDriftPx, avgDriftPx };
}

/**
 * Computes common union bounding box, stable baseline anchor pivot, and inter-frame drift metrics.
 */
export function computeRegistrationFromGeometry(params: ComputeRegistrationFromFramesParams): SequenceRegistrationResult {
  const { frames, maxAllowedDriftPx = 180, expectedFrameCount } = params;

  const { baseWidth, baseHeight } = validateFrameGeometries(frames, expectedFrameCount);

  let commonMinX = Number.POSITIVE_INFINITY;
  let commonMinY = Number.POSITIVE_INFINITY;
  let commonMaxX = Number.NEGATIVE_INFINITY;
  let commonMaxY = Number.NEGATIVE_INFINITY;

  const frameCentroids: FrameCentroid[] = [];

  for (const f of frames) {
    if (f.bounds.minX < commonMinX) commonMinX = f.bounds.minX;
    if (f.bounds.minY < commonMinY) commonMinY = f.bounds.minY;
    if (f.bounds.maxX > commonMaxX) commonMaxX = f.bounds.maxX;
    if (f.bounds.maxY > commonMaxY) commonMaxY = f.bounds.maxY;

    const cx = (f.bounds.minX + f.bounds.maxX) / 2;
    const cy = (f.bounds.minY + f.bounds.maxY) / 2;
    frameCentroids.push({
      frameIndex: f.frameIndex,
      x: Number(cx.toFixed(2)),
      y: Number(cy.toFixed(2)),
    });
  }

  const commonWidth = commonMaxX - commonMinX + 1;
  const commonHeight = commonMaxY - commonMinY + 1;

  if (commonMinX < 0 || commonMinY < 0 || commonMaxX >= baseWidth || commonMaxY >= baseHeight) {
    throw new FrameRegistrationError("Common content bounds exceed canvas boundaries", "BOUNDS_EXCEED_CANVAS");
  }

  const commonBounds: MascotBounds = {
    x: commonMinX,
    y: commonMinY,
    width: commonWidth,
    height: commonHeight,
  };

  const commonPivot: MascotPoint = {
    x: Math.round(commonMinX + commonWidth / 2),
    y: commonMaxY,
  };

  const { maxDriftPx, avgDriftPx } = calculateCentroidDrift(frameCentroids, maxAllowedDriftPx);

  const registration: MascotAssetRegistration = {
    source_width: baseWidth,
    source_height: baseHeight,
    content_bounds: commonBounds,
    pivot: commonPivot,
    offset_x: 0,
    offset_y: 0,
  };

  return {
    registration,
    canvas: { width: baseWidth, height: baseHeight },
    commonBounds,
    commonPivot,
    maxDriftPx,
    avgDriftPx,
    frameCentroids,
  };
}
