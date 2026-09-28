import path from "node:path";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import type { MascotVideoProcessingJob } from "@studio/shared";
import type { StudioLogger } from "../../../../logger.js";
import type { AnimationStorageAdapter } from "../adapters/animationStorageAdapter.js";
import type { FfmpegAdapter } from "../adapters/ffmpegAdapter.js";
import { planAttemptRetention } from "./attemptRetentionPlan.js";
import { removeInventoriedFrames } from "./safeFrameFiles.js";
import { verifyArchiveArtifacts } from "./verifyArchiveArtifacts.js";
import type { AttemptRetentionPlan } from "./retention.types.js";

export function createCompletedAttemptCleanup(
  storage: AnimationStorageAdapter,
  ffmpeg: Pick<FfmpegAdapter, "probeVideoMetadata">,
  logger: Pick<StudioLogger, "ok" | "warn">,
  verifyArtifacts: (plan: AttemptRetentionPlan) => Promise<void> = verifyArchiveArtifacts,
): (job: MascotVideoProcessingJob) => Promise<void> {
  return async (job) => {
    if (job.status !== "ready") return;
    const context = { profileId: job.mascot_id, workerId: job.id, step: "frame-retention" };
    try {
      const directory = storage.getAttemptDir(job.mascot_id, job.style_id, job.state, job.slot_index, job.attempt);
      const plan = await planAttemptRetention(storage.storageRoot, directory);
      const video = await ffmpeg.probeVideoMetadata(path.join(directory, "video_transparent.webm"));
      if (video.durationMs <= 0 || video.width <= 0 || video.height <= 0) throw new Error("Packaged video is unreadable");
      for (const name of plan.imageArtifacts) {
        await sharp(await readFile(path.join(directory, name))).stats();
      }
      await verifyArtifacts(plan);
      const current = await planAttemptRetention(storage.storageRoot, directory);
      if (JSON.stringify(current) !== JSON.stringify(plan)) throw new Error("Attempt changed during media verification");
      const source = await removeInventoriedFrames(storage.storageRoot, plan.source);
      const matted = plan.mattedProtected ? { files: 0, bytes: 0 } : await removeInventoriedFrames(storage.storageRoot, plan.matted);
      logger.ok(`Frame cleanup: ${source.files + matted.files} files, ${source.bytes + matted.bytes} bytes reclaimed`, context);
    } catch (error) {
      logger.warn(
        `Frame cleanup deferred: ${error instanceof Error ? error.message : String(error)}. Run storage audit before retrying cleanup.`,
        context,
      );
    }
  };
}
