import { mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { RunHyperframesProcessOptions } from "../src/tasks/video/hyperframesProcess.js";

const mocks = vi.hoisted(() => ({ runHyperframesProcess: vi.fn() }));

vi.mock("../src/tasks/video/hyperframesProcess.js", async (importOriginal) => {
  const original = await importOriginal<typeof import("../src/tasks/video/hyperframesProcess.js")>();
  return { ...original, runHyperframesProcess: mocks.runHyperframesProcess };
});

vi.mock("../src/quiz/qa/postRenderQa.js", () => ({
  inspectRenderedVideo: () =>
    Promise.resolve({
      probe: {
        format: { duration: "128" },
        streams: [
          { codec_type: "video", width: 1920, height: 1080, r_frame_rate: "30/1" },
          { codec_type: "audio", duration: "128" },
        ],
      },
      issues: [],
    }),
}));

import { executeHyperframesRender } from "../src/tasks/video/videoRenderExecution.js";

const roots: string[] = [];

afterEach(async () => {
  mocks.runHyperframesProcess.mockReset();
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("executeHyperframesRender", () => {
  it("publishes monotonic measured progress and starts QA only after process exit", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "video-render-execution-"));
    roots.push(root);
    const renderRoot = path.join(root, "render");
    await mkdir(renderRoot, { recursive: true });
    const updates: Array<{ message: string; percent: number; progress: unknown }> = [];
    const controller = new AbortController();
    mocks.runHyperframesProcess.mockImplementation(async (options: RunHyperframesProcessOptions) => {
      expect(options.signal).toBe(controller.signal);
      expect(options.logPath).toBe(path.join(renderRoot, "render.log"));
      await options.onProgress({
        kind: "measured",
        sample: { phase: "capture_streaming", framesCompleted: 200, totalFrames: 400, workerCount: 6, elapsedMs: 10_000, etaSeconds: 10 },
      });
      await options.onProgress({
        kind: "measured",
        sample: { phase: "capture_streaming", framesCompleted: 100, totalFrames: 400, workerCount: 6, elapsedMs: 12_000, etaSeconds: 36 },
      });
      await options.onProgress({ kind: "heartbeat", elapsedMs: 15_000 });
    });

    const result = await executeHyperframesRender({
      renderRoot,
      outputPath: path.join(renderRoot, "quiz-video.mp4"),
      checkpointPath: path.join(renderRoot, "render-checkpoint.json"),
      sourceFingerprint: "source-1",
      renderCanvas: { width: 1920, height: 1080 },
      videoConfig: { fps: 30, render_quality: "medium", render_workers: 6 } as never,
      repositoryRoot: root,
      signal: controller.signal,
      logPath: path.join(renderRoot, "render.log"),
      onProgress: (message, percent, progress) => {
        updates.push({ message, percent, progress });
        return Promise.resolve();
      },
    });

    expect(result.duration).toBe(128);
    expect(updates.map((update) => update.percent)).toEqual([65, 80.75, 80.75, 95]);
    expect(updates[1]).toEqual({
      message: "Video · rendering frame 200 / 400",
      percent: 80.75,
      progress: {
        phase: "capture_streaming",
        frames_completed: 200,
        total_frames: 400,
        worker_count: 6,
        elapsed_ms: 10_000,
        eta_seconds: 10,
      },
    });
    expect(updates[2].message).toBe("Video · rendering MP4 (15s)");
    expect(updates.at(-1)?.message).toBe("Video · verifying MP4 and audio track");
  });
});
