import type { MascotAssetRegistration } from "../renderTypes.js";
import { REQUIRED_FPS, REQUIRED_FRAME_COUNT, type AnimationLoopPolicy } from "./animationConstants.js";
import type { AnimationPlaybackTarget, MascotAnimationAssetV1, MascotFrameRect } from "./animationTypes.js";

/**
 * Pixel and percentage atlas offset representation for CSS background positioning.
 */
export interface AtlasCssOffset {
  offsetX: number;
  offsetY: number;
  pixelOffsetX: number;
  pixelOffsetY: number;
  width: number;
  height: number;
  cssBackgroundPosition: string;
  percentageOffsetX?: number;
  percentageOffsetY?: number;
  cssPercentagePosition?: string;
}

/**
 * Result of resolving an animation frame at a specific composition timestamp.
 */
export interface ResolvedAnimationFrame {
  frameIndex: number;
  frame: MascotFrameRect;
  registration: MascotAssetRegistration;
  atlasOffsets: AtlasCssOffset;
  timeSeconds: number;
  isClamped: boolean;
  loop: boolean;
  cycleSeconds: number;
}

/**
 * Computes exact CSS background offset properties from a manifest frame rectangle.
 * Never assumes equal-width grid cells; strictly respects declared manifest coordinates.
 */
export function computeAtlasCssOffset(frame: MascotFrameRect, atlasDimensions?: { width: number; height: number }): AtlasCssOffset {
  const pixelOffsetX = frame.x === 0 ? 0 : -frame.x;
  const pixelOffsetY = frame.y === 0 ? 0 : -frame.y;
  const cssBackgroundPosition = `${pixelOffsetX}px ${pixelOffsetY}px`;

  let percentageOffsetX: number | undefined;
  let percentageOffsetY: number | undefined;
  let cssPercentagePosition: string | undefined;

  if (atlasDimensions && atlasDimensions.width > 0 && atlasDimensions.height > 0) {
    const maxX = atlasDimensions.width - frame.width;
    const maxY = atlasDimensions.height - frame.height;
    percentageOffsetX = maxX > 0 ? (frame.x / maxX) * 100 : 0;
    percentageOffsetY = maxY > 0 ? (frame.y / maxY) * 100 : 0;
    cssPercentagePosition = `${percentageOffsetX.toFixed(4)}% ${percentageOffsetY.toFixed(4)}%`;
  }

  return {
    offsetX: pixelOffsetX,
    offsetY: pixelOffsetY,
    pixelOffsetX,
    pixelOffsetY,
    width: frame.width,
    height: frame.height,
    cssBackgroundPosition,
    percentageOffsetX,
    percentageOffsetY,
    cssPercentagePosition,
  };
}

/**
 * Resolves the deterministic animation frame at a given composition timestamp.
 * Seamlessly supports dynamic frame counts (12..300+), dynamic FPS (8..60),
 * and transparent video playback targets.
 */
export function resolveAnimationFrameAtTime(
  animation: MascotAnimationAssetV1 | AnimationPlaybackTarget,
  timeSeconds: number,
): ResolvedAnimationFrame {
  const fps = animation.fps ?? (animation as { playback_fps?: number }).playback_fps ?? REQUIRED_FPS;
  const frameCount =
    animation.frame_count ||
    (animation.frames && animation.frames.length > 0 ? animation.frames.length : undefined) ||
    REQUIRED_FRAME_COUNT;
  const cycleSeconds = (animation as { duration_ms?: number }).duration_ms
    ? (animation as { duration_ms?: number }).duration_ms! / 1000
    : frameCount / fps;
  const normalizedTime = Number.isFinite(timeSeconds) ? Math.max(0, timeSeconds) : 0;

  const loopPolicy = animation.loop_policy ?? (animation as { loop_mode?: AnimationLoopPolicy }).loop_mode;
  const isOneShot = loopPolicy === "one_shot_rest" || (!animation.loop && loopPolicy !== "loop");
  const isLoop = !isOneShot;

  // Numerical epsilon for floating point boundary accuracy
  const epsilon = 1e-9;
  let frameIndex: number;
  let isClamped = false;

  if (isOneShot && normalizedTime >= cycleSeconds - epsilon) {
    frameIndex = frameCount - 1;
    isClamped = true;
  } else {
    frameIndex = Math.floor((normalizedTime + epsilon) * fps) % frameCount;
  }

  const frame: MascotFrameRect =
    animation.frames && animation.frames.length > 0
      ? (animation.frames.find((f) => f.index === frameIndex) ?? animation.frames[frameIndex] ?? animation.frames[0])
      : {
          index: frameIndex,
          x: 0,
          y: 0,
          width: animation.registration?.source_width ?? 1280,
          height: animation.registration?.source_height ?? 720,
          duration_ms: (1 / fps) * 1000,
        };

  const atlasOffsets = computeAtlasCssOffset(frame, {
    width: animation.registration?.source_width,
    height: animation.registration?.source_height,
  });

  return {
    frameIndex,
    frame,
    registration: animation.registration,
    atlasOffsets,
    timeSeconds: normalizedTime,
    isClamped,
    loop: isLoop,
    cycleSeconds,
  };
}
