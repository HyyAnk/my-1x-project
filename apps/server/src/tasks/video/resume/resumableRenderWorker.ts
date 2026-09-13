import { spawn, execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { z } from "zod";
import { resolveConfig } from "@hyperframes/producer";
import { StudioLogger } from "../../../logger.js";
import { resolveHardwareBrowserPath } from "../videoPerformance.js";
import { createHyperframesChunkPort, prepareResumablePlan } from "./hyperframesChunkAdapter.js";
import { resumeChunkRender } from "./resumeChunkRender.js";
import { acquireRenderLease } from "./renderLease.js";

const RequestSchema = z.object({
  renderRoot: z.string().min(1),
  outputPath: z.string().min(1),
  configFingerprint: z.string(),
  fps: z.union([z.literal(24), z.literal(30), z.literal(60)]),
  quality: z.enum(["draft", "standard", "high"]),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  workers: z.number().int().min(1).max(16),
});

// IPC disconnect fires when the dashboard dies, including a hard restart. Do
// not let orphaned Chrome/FFmpeg workers race the replacement task's cache.
function stopOrphanedWorker(): void {
  if (process.platform === "win32") spawn("taskkill", ["/PID", String(process.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
  else {
    try {
      process.kill(-process.pid, "SIGTERM");
    } catch {
      process.exit(1);
    }
  }
}
process.on("disconnect", stopOrphanedWorker);

async function main(): Promise<void> {
  const request = RequestSchema.parse(JSON.parse(process.argv[2] ?? "{}"));
  const release = await acquireRenderLease(request.renderRoot);
  try {
    await render(request);
  } finally {
    await release();
  }
}

async function render(request: z.infer<typeof RequestSchema>): Promise<void> {
  const logger = new StudioLogger(process.cwd());
  const context = { profileId: path.basename(request.renderRoot), workerId: String(process.pid), step: "resumable_render" };
  await logger.init();
  const started = Date.now();
  logger.info(`Starting resumable render: profiles=1, mode=local, workers=${request.workers}, method=headless browser protocol`, context);
  const ffmpeg = await promisify(execFile)("ffmpeg", ["-version"], { windowsHide: true, timeout: 10_000 });
  const configFingerprint = `${request.configFingerprint}\n${ffmpeg.stdout.split("\n")[0]}`;
  const engineConfig = resolveConfig({
    concurrency: request.workers,
    browserGpuMode: "software",
    chromePath: resolveHardwareBrowserPath(),
    forceScreenshot: true,
    useDrawElement: false,
    enableStreamingEncode: false,
  });
  const prepared = await prepareResumablePlan(
    request.renderRoot,
    {
      fps: request.fps,
      quality: request.quality,
      width: request.width,
      height: request.height,
      format: "mp4",
      chunkSize: request.fps * 8,
      maxParallelChunks: 256,
      engineConfig,
      strictness: "strict",
      logger,
    },
    configFingerprint,
  );
  let reused = 0;
  await resumeChunkRender({
    ...prepared,
    outputPath: request.outputPath,
    port: createHyperframesChunkPort(prepared.planDir),
    onProgress: (framesCompleted, totalFrames, reusedChunks) => {
      reused = reusedChunks;
      logger.info(
        `[Studio:render][Render:trace]${JSON.stringify({ phase: "capture_streaming", framesCompleted, totalFrames, workerCount: request.workers, stageElapsedMs: Date.now() - started })}`,
        context,
      );
      return Promise.resolve();
    },
  });
  logger.ok(
    `Render completed: total=${prepared.plan.chunks.length}, success=${prepared.plan.chunks.length}, failed=0, skipped=${reused}, retries=0, elapsed=${Math.round((Date.now() - started) / 1000)}s`,
    context,
  );
}

main()
  .catch((error: unknown) => {
    new StudioLogger(process.cwd()).error(
      `Resumable render failed: ${error instanceof Error ? error.message : String(error)}. Retry to reuse verified chunks.`,
      { workerId: String(process.pid), step: "resumable_render" },
    );
    process.exitCode = 1;
  })
  .finally(() => {
    process.removeListener("disconnect", stopOrphanedWorker);
    if (process.connected) process.disconnect();
  });
