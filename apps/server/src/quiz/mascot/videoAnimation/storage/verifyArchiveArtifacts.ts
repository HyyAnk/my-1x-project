import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { createFfmpegAdapter } from "../adapters/ffmpegAdapter.js";
import { runFfmpegProcess } from "../adapters/ffmpeg/ffmpegProcess.js";
import type { AttemptRetentionPlan } from "./retention.types.js";

export async function verifyArchiveArtifacts(plan: AttemptRetentionPlan): Promise<void> {
  const adapter = createFfmpegAdapter();
  for (const name of ["source.mp4", "video_transparent.webm"]) {
    const file = path.join(plan.attemptDirectory, name);
    const metadata = await adapter.probeVideoMetadata(file);
    if (metadata.durationMs <= 0 || metadata.width <= 0 || metadata.height <= 0) throw new Error(`Unreadable media: ${name}`);
    await runFfmpegProcess({
      args: ["-v", "error", "-xerror", "-i", file, "-map", "0:v:0", "-f", "null", "-"],
      timeoutMs: 120000,
      onAborted: () => new Error("Media verification cancelled"),
      onTimeout: () => new Error("Media verification timed out"),
      onCommandFailed: (details) => new Error(details),
    });
  }
  for (const name of plan.imageArtifacts) await sharp(await readFile(path.join(plan.attemptDirectory, name))).stats();
}
