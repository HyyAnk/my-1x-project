import type { AppConfig, RenderProgress } from "@studio/shared";
import { RepositoryError } from "../../repository.js";
import { inspectRenderedVideo } from "../../quiz/qa/postRenderQa.js";
import { hasNonEmptyFile } from "../artifactFiles.js";
import { readRenderCheckpoint, writeRenderCheckpoint } from "../checkpoints.js";
import { getHyperframesInvocation } from "./videoInvocation.js";
import { mapRenderTaskPercent } from "./hyperframesProgress.js";
import { calculateOptimalWorkers, getHyperframesExecutionEnv } from "./videoPerformance.js";
import { runHyperframesProcess } from "./hyperframesProcess.js";

export async function executeHyperframesRender(options: {
  renderRoot: string;
  outputPath: string;
  checkpointPath: string;
  sourceFingerprint: string;
  renderCanvas: { width: number; height: number };
  videoConfig: AppConfig["video_generation"];
  repositoryRoot: string;
  signal: AbortSignal;
  logPath: string;
  onProgress: (message: string, percent: number, renderProgress?: RenderProgress | null) => Promise<void>;
}): Promise<{ probe: Awaited<ReturnType<typeof inspectRenderedVideo>>; duration: number }> {
  const {
    renderRoot,
    outputPath,
    checkpointPath,
    sourceFingerprint,
    renderCanvas,
    videoConfig,
    repositoryRoot,
    signal,
    logPath,
    onProgress,
  } = options;

  const checkpoint = await readRenderCheckpoint(checkpointPath);
  const layoutReady = checkpoint?.source_fingerprint === sourceFingerprint && checkpoint.check.status === "passed";
  let reusableRender = layoutReady && checkpoint?.render?.status === "passed" && (await hasNonEmptyFile(outputPath));
  if (reusableRender) {
    const existingProbe = await inspectRenderedVideo(outputPath, {
      width: renderCanvas.width,
      height: renderCanvas.height,
      fps: videoConfig.fps,
    });
    reusableRender = !existingProbe.issues.some((issue) => issue.severity === "blocker");
  }

  if (reusableRender) {
    await onProgress("Video · reusing verified MP4", 85, null);
  } else {
    await onProgress("Video · rendering MP4 with narration", 65, null);
    const browserTimeout = process.env.HYPERFRAMES_BROWSER_TIMEOUT_SECONDS || "300";
    const renderTimeoutMs = Number(process.env.HYPERFRAMES_RENDER_TIMEOUT_MS) || 120 * 60_000;
    const hyperframesEnv = getHyperframesExecutionEnv();
    const optimalWorkers = calculateOptimalWorkers(videoConfig.render_workers);
    const renderInvocation = getHyperframesInvocation(
      "render",
      renderRoot,
      "--output",
      outputPath,
      "--fps",
      String(videoConfig.fps),
      "--quality",
      videoConfig.render_quality,
      "--workers",
      String(optimalWorkers),
      "--gpu",
      "--browser-gpu",
      "--browser-timeout",
      browserTimeout,
      "--strict",
      "--json",
    );
    let latestPercent = 65;
    let latestFrames = 0;
    let latestProgress: RenderProgress | null = null;
    await runHyperframesProcess({
      command: renderInvocation.command,
      args: renderInvocation.args,
      cwd: repositoryRoot,
      env: hyperframesEnv,
      timeoutMs: renderTimeoutMs,
      logPath,
      signal,
      onProgress: async (event) => {
        if (event.kind === "heartbeat") {
          await onProgress(`Video · rendering MP4 (${Math.round(event.elapsedMs / 1000)}s)`, latestPercent, latestProgress);
          return;
        }
        const { sample } = event;
        if (sample.framesCompleted < latestFrames) return;
        latestFrames = sample.framesCompleted;
        latestPercent = Math.max(latestPercent, mapRenderTaskPercent(sample));
        latestProgress = {
          phase: sample.phase,
          frames_completed: sample.framesCompleted,
          total_frames: sample.totalFrames,
          worker_count: sample.workerCount,
          elapsed_ms: sample.elapsedMs,
          eta_seconds: sample.etaSeconds,
        };
        await onProgress(
          `Video · rendering frame ${sample.framesCompleted.toLocaleString("en-US")} / ${sample.totalFrames.toLocaleString("en-US")}`,
          latestPercent,
          latestProgress,
        );
      },
    });
  }

  await onProgress("Video · verifying MP4 and audio track", 95);
  const probe = await inspectRenderedVideo(outputPath, {
    width: renderCanvas.width,
    height: renderCanvas.height,
    fps: videoConfig.fps,
  });
  const renderBlocker = probe.issues.find((issue) => issue.severity === "blocker");
  if (renderBlocker) throw new RepositoryError(renderBlocker.message, "QUIZ_RENDER_QA_FAILED");

  await writeRenderCheckpoint(checkpointPath, {
    schema_version: 2,
    source_fingerprint: sourceFingerprint,
    check: { status: "passed" },
    render: { status: "passed" },
  });

  const duration = Number.parseFloat(probe.probe.format?.duration ?? "");
  if (!Number.isFinite(duration) || duration <= 0) throw new Error("Rendered MP4 has no readable duration");

  return { probe, duration };
}
