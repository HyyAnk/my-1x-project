import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import { MascotVideoProcessingJobSchema } from "@studio/shared";
import {
  createAnimationStorageAdapter,
  createVideoProcessingRepository,
  createVideoUploadService,
  createFfmpegAdapter,
  createFrameRegistrationService,
  createAnimationPackagingService,
} from "../../src/quiz/mascot/videoAnimation/index.js";
import { createOrchestratorQueue } from "../../src/quiz/mascot/videoAnimation/orchestrator/orchestratorQueue.js";
import { createMattingWorkerSession } from "../../src/quiz/mascot/videoAnimation/adapters/mattingWorkerSession.js";
import { encodeRgbaToPng } from "../../src/utils/imageMatting.js";

const roots: string[] = [];
afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});

function frame(size = 32) {
  const data = new Uint8Array(size * size * 4);
  for (let y = size / 4; y < (size * 3) / 4; y++) {
    for (let x = size / 4; x < (size * 3) / 4; x++) data.set([80, 120, 200, 255], (y * size + x) * 4);
  }
  return { imageBytes: encodeRgbaToPng({ width: size, height: size, data }) };
}

it("terminates an active CPU worker and its queued frames without stopping another attempt", async () => {
  const controller = new AbortController();
  const first = createMattingWorkerSession(controller.signal);
  const second = createMattingWorkerSession();
  try {
    await first.matteFrame(frame());
    const largeFrame = frame(1024);
    const work = Promise.allSettled(Array.from({ length: 16 }, () => first.matteFrame(largeFrame)));
    const started = performance.now();
    const timer = setTimeout(() => controller.abort(), 20);
    const outcomes = await work;
    clearTimeout(timer);
    expect(outcomes.some((result) => result.status === "rejected")).toBe(true);
    expect(performance.now() - started).toBeLessThan(2000);
    expect((await second.matteFrame(frame())).width).toBe(32);
    await expect(first.matteFrame(frame())).rejects.toThrow("cancelled");
  } finally {
    await Promise.all([first.close(), second.close()]);
  }
});

it("cancels running and queued jobs, coalesces duplicate cancellation, and never packages cancelled work", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "video-cancellation-"));
  roots.push(root);
  const storageAdapter = createAnimationStorageAdapter(root);
  const repository = createVideoProcessingRepository(storageAdapter);
  const ffmpeg = createFfmpegAdapter();
  const signals = new Map<number, AbortSignal>();
  const packagingService = createAnimationPackagingService(storageAdapter);
  const packageSpy = vi.spyOn(packagingService, "packageAttemptAnimation");
  const queue = createOrchestratorQueue({
    storageAdapter,
    repository,
    packagingService,
    uploadService: createVideoUploadService(storageAdapter, ffmpeg),
    registrationService: createFrameRegistrationService(storageAdapter),
    extractionService: {
      extractAttemptFrames: vi.fn(async () => ({
        frames: [],
        frameCount: 0,
        fps: 24,
        durationMs: 1000,
        outputDir: root,
        sourceMetadata: { width: 640, height: 360, fps: 24, durationMs: 1000, codec: "h264", format: "mp4", fileSizeBytes: 1 },
      })),
    },
    mattingService: {
      matteAttemptFrames: ({ slotIndex, signal }) =>
        new Promise((_resolve, reject) => {
          if (!signal) {
            reject(new Error("Cancellation signal missing"));
            return;
          }
          signals.set(slotIndex, signal);
          signal.addEventListener("abort", () => reject(new Error("Cancelled")), { once: true });
        }),
    },
    maxConcurrentJobs: 2,
  });
  for (const slot of [1, 2, 3]) {
    await repository.transitionSlotState("m1", "core", "thinking", slot, "uploading");
    await queue.scheduleJob(
      MascotVideoProcessingJobSchema.parse({
        id: `job-${slot}`,
        mascot_id: "m1",
        style_id: "core",
        state: "thinking",
        slot_index: slot,
        attempt: 1,
        source_video_url: "/video.mp4",
        source_video_fingerprint: "fp",
        status: "queued",
        progress: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
    );
    if (slot < 3) await vi.waitFor(() => expect(signals.has(slot)).toBe(true));
  }
  expect((await queue.cancelJob("job-3")).status).toBe("cancelled");
  expect(signals.has(3)).toBe(false);
  const cancellation = queue.cancelJob("job-1");
  expect(queue.cancelJob("job-1")).toBe(cancellation);
  expect((await cancellation).status).toBe("cancelled");
  expect(signals.get(1)?.aborted).toBe(true);
  expect(signals.get(2)?.aborted).toBe(false);
  expect((await repository.getSlotProjection("m1", "core", "thinking", 1)).status).toBe("cancelled");
  await queue.cancelJob("job-2");
  expect(queue.getQueueStatus()).toEqual({ runningCount: 0, queuedCount: 0 });
  expect(packageSpy).not.toHaveBeenCalled();
});
