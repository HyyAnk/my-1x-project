export interface VideoBenchmarkOptions {
  totalFrames: number;
  durationMs: number;
  videoFps: number;
  workerCount: number;
  quality: "draft" | "standard" | "high";
  fastRenderMode: boolean;
  assetPrepDurationMs?: number;
  layoutCheckDurationMs?: number;
  renderDurationMs?: number;
  postQaDurationMs?: number;
}

export interface VideoPerformanceMetrics {
  effectiveFps: number;
  realtimeFactor: number;
  totalDurationSeconds: number;
  frameRenderTimeMs: number;
  throughputPerWorkerFps: number;
  summary: string;
}

export function calculateRenderPerformance(options: VideoBenchmarkOptions): VideoPerformanceMetrics {
  const { totalFrames, durationMs, videoFps, workerCount } = options;
  const safeDurationMs = Math.max(1, durationMs);
  const totalDurationSeconds = safeDurationMs / 1000;
  const effectiveFps = Number((totalFrames / totalDurationSeconds).toFixed(2));
  const realtimeFactor = Number((effectiveFps / videoFps).toFixed(2));
  const frameRenderTimeMs = Number((safeDurationMs / totalFrames).toFixed(2));
  const throughputPerWorkerFps = Number((effectiveFps / Math.max(1, workerCount)).toFixed(2));

  const speedupDescription =
    realtimeFactor >= 1.0
      ? `${realtimeFactor}x faster than realtime`
      : `${(1 / Math.max(0.01, realtimeFactor)).toFixed(1)}x render time to video length`;

  const summary = `Rendered ${totalFrames} frames in ${totalDurationSeconds.toFixed(1)}s (${effectiveFps} FPS, ${speedupDescription}) with ${workerCount} workers.`;

  return {
    effectiveFps,
    realtimeFactor,
    totalDurationSeconds,
    frameRenderTimeMs,
    throughputPerWorkerFps,
    summary,
  };
}

export function estimateSpeedupComparison(
  baselineDurationMs: number,
  optimizedDurationMs: number,
): { speedupMultiplier: number; timeSavedPercent: number; timeSavedSeconds: number } {
  const safeBaseline = Math.max(1, baselineDurationMs);
  const safeOptimized = Math.max(1, optimizedDurationMs);
  const speedupMultiplier = Number((safeBaseline / safeOptimized).toFixed(2));
  const timeSavedPercent = Number((((safeBaseline - safeOptimized) / safeBaseline) * 100).toFixed(1));
  const timeSavedSeconds = Number(((safeBaseline - safeOptimized) / 1000).toFixed(1));

  return {
    speedupMultiplier,
    timeSavedPercent,
    timeSavedSeconds,
  };
}
