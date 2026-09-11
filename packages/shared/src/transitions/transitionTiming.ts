import { invalidTiming } from "./transition.schemas.js";
import type { FrameRate, TransitionTimingAdjustment } from "./transition.types.js";

export function quantizeSecondsToFrames(seconds: number, fps: FrameRate): number {
  if (!Number.isFinite(seconds) || seconds < 0) {
    throw invalidTiming(`Invalid transition duration: ${seconds}`);
  }
  if (!Number.isInteger(fps.numerator) || !Number.isInteger(fps.denominator) || fps.numerator <= 0 || fps.denominator <= 0) {
    throw invalidTiming(`Invalid framerate: ${fps.numerator}/${fps.denominator}`);
  }
  return Math.round((seconds * fps.numerator) / fps.denominator);
}

export function framesToSeconds(frames: number, fps: FrameRate): number {
  if (!Number.isInteger(frames) || frames < 0) {
    throw invalidTiming(`Invalid frame count: ${frames}`);
  }
  return frames / (fps.numerator / fps.denominator);
}

export function fitTransitionWindow(options: {
  requestedFrames: number;
  boundaryFrame: number;
  startFrame: number;
  availableEndFrameExclusive: number;
  handoffProgress: number;
}): {
  startFrame: number;
  durationFrames: number;
  endFrameExclusive: number;
  timingAdjustment: TransitionTimingAdjustment;
} {
  const { requestedFrames, boundaryFrame, startFrame, availableEndFrameExclusive, handoffProgress } = options;

  if (startFrame > boundaryFrame || boundaryFrame >= availableEndFrameExclusive) {
    throw invalidTiming(
      `Invalid boundary window: start ${startFrame}, boundary ${boundaryFrame}, availableEnd ${availableEndFrameExclusive}`,
    );
  }

  const boundedProgress = Math.max(0, Math.min(1, handoffProgress));

  for (let frames = requestedFrames; frames >= 1; frames -= 1) {
    const start = boundaryFrame - Math.round(frames * boundedProgress);
    if (start >= startFrame && start + frames <= availableEndFrameExclusive) {
      const timingAdjustment: TransitionTimingAdjustment =
        frames < requestedFrames ? "window-limited" : "none";
      return {
        startFrame: start,
        durationFrames: frames,
        endFrameExclusive: start + frames,
        timingAdjustment,
      };
    }
  }

  throw invalidTiming("The transition does not fit this source boundary");
}
