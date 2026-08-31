import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { AppConfig } from "@studio/shared";
import { RepositoryError } from "../../repository.js";
import { inspectRenderedVideo } from "../../quiz/qa/postRenderQa.js";
import { hasNonEmptyFile } from "../artifactFiles.js";
import { readRenderCheckpoint, writeRenderCheckpoint } from "../checkpoints.js";
import { getHyperframesInvocation } from "./videoInvocation.js";
import { calculateOptimalWorkers, getHyperframesExecutionEnv } from "./videoPerformance.js";

const execFileAsync = promisify(execFile);

export async function executeHyperframesRender(options: {
  renderRoot: string;
  outputPath: string;
  checkpointPath: string;
  sourceFingerprint: string;
  renderCanvas: { width: number; height: number };
  videoConfig: AppConfig["video_generation"];
  repositoryRoot: string;
  onProgress: (message: string, percent: number) => Promise<void>;
}): Promise<{ probe: Awaited<ReturnType<typeof inspectRenderedVideo>>; duration: number }> {
  const { renderRoot, outputPath, checkpointPath, sourceFingerprint, renderCanvas, videoConfig, repositoryRoot, onProgress } = options;

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
    await onProgress("Video · reusing verified MP4", 85);
  } else {
    await onProgress("Video · rendering MP4 with narration", 65);
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
    await execFileAsync(renderInvocation.command, renderInvocation.args, {
      cwd: repositoryRoot,
      timeout: renderTimeoutMs,
      windowsHide: true,
      maxBuffer: 50 * 1024 * 1024,
      env: hyperframesEnv,
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
