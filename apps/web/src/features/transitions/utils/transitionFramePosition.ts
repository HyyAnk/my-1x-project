export type TimeBase = {
  numerator: number;
  denominator: number;
};

export type FramePts = {
  index: number;
  pts: number;
};

export function ptsToSeconds(pts: number, timeBase: TimeBase): number {
  if (!timeBase.denominator) return 0;
  return (pts * timeBase.numerator) / timeBase.denominator;
}

export function secondsToFrameIndex(
  seconds: number,
  frames: readonly FramePts[],
  timeBase: TimeBase,
): number {
  if (frames.length === 0) return 0;

  let closestIndex = 0;
  let minDiff = Infinity;

  for (let i = 0; i < frames.length; i++) {
    const frameSeconds = ptsToSeconds(frames[i].pts, timeBase);
    const diff = Math.abs(frameSeconds - seconds);
    if (diff < minDiff) {
      minDiff = diff;
      closestIndex = frames[i].index;
    }
  }

  return closestIndex;
}

export function frameIndexToPts(frameIndex: number, frames: readonly FramePts[]): number {
  const found = frames.find((f) => f.index === frameIndex);
  return found ? found.pts : frameIndex;
}

export function formatFrameTime(
  frameIndex: number,
  totalFrames: number,
  fpsVal: number,
): string {
  const safeFps = fpsVal > 0 ? fpsVal : 30;
  const totalSeconds = frameIndex / safeFps;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const fraction = Math.floor((totalSeconds % 1) * 100);

  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  const ff = String(fraction).padStart(2, "0");

  const frameStr = `frame ${frameIndex + 1}/${Math.max(1, totalFrames)}`;
  return `${mm}:${ss}.${ff} (${frameStr})`;
}
