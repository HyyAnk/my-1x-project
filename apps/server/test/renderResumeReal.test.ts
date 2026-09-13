import { execFile } from "node:child_process";
import { copyFile, mkdtemp, readFile, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import type { AppConfig } from "@studio/shared";
import { executeHyperframesRender } from "../src/tasks/video/videoRenderExecution.js";
import { decodeVideoFrameToRawRgba } from "../src/tasks/video/videoFrameDecoder.js";
import { verifyAndCheckLayout } from "../src/tasks/video/videoLayoutChecker.js";

const execFileAsync = promisify(execFile);
describe.skipIf(process.env.RUN_RENDER_RECOVERY !== "1")("real render recovery", () => {
  it("resumes a cancelled real render without recapturing its verified first chunk and preserves the boundary/audio", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "studio-resume-real-"));
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 150_000);
    try {
      await copyFile(path.resolve("test/fixtures/render-resume/index.html"), path.join(root, "index.html"));
      await execFileAsync(
        "ffmpeg",
        [
          "-v",
          "error",
          "-f",
          "lavfi",
          "-i",
          "sine=frequency=440:duration=9",
          "-ar",
          "48000",
          "-ac",
          "2",
          path.join(root, "soundtrack.wav"),
        ],
        { windowsHide: true, timeout: 15_000 },
      );
      const options = {
        renderRoot: root,
        outputPath: path.join(root, "quiz-video.mp4"),
        checkpointPath: path.join(root, "render-checkpoint.json"),
        sourceFingerprint: "resume-fixture-v1",
        renderCanvas: { width: 320, height: 180 },
        videoConfig: { fps: 24, render_quality: "draft", render_workers: 1 } as AppConfig["video_generation"],
        repositoryRoot: path.resolve("../.."),
        signal: controller.signal,
        logPath: path.join(root, "first.log"),
      };
      await verifyAndCheckLayout({
        renderRoot: root,
        rootDir: options.repositoryRoot,
        sourceFingerprint: options.sourceFingerprint,
        renderQuality: "draft",
      });
      await expect(
        executeHyperframesRender({
          ...options,
          onProgress: (_message, _percent, progress) => {
            if ((progress?.frames_completed ?? 0) >= 192) controller.abort();
            return Promise.resolve();
          },
        }),
      ).rejects.toThrow(/cancelled/i);
      const pointer = JSON.parse(await readFile(path.join(root, ".render-resume", "current.json"), "utf8")) as { generation: string };
      const firstChunk = path.join(root, ".render-resume", pointer.generation, "chunks", "00000.mp4");
      const before = await stat(firstChunk);
      const retryController = new AbortController();
      const retryTimeout = setTimeout(() => retryController.abort(), 150_000);
      try {
        const result = await executeHyperframesRender({
          ...options,
          signal: retryController.signal,
          logPath: path.join(root, "retry.log"),
          onProgress: async () => {},
        });
        expect(result.duration).toBeCloseTo(9, 1);
        expect(result.probe.issues).toEqual([]);
        expect((await stat(firstChunk)).mtimeMs).toBe(before.mtimeMs);
        const red = await decodeVideoFrameToRawRgba(options.outputPath, 191);
        const blue = await decodeVideoFrameToRawRgba(options.outputPath, 192);
        expect(red[0]).toBeGreaterThan(200);
        expect(red[2]).toBeLessThan(30);
        expect(blue[2]).toBeGreaterThan(200);
        expect(blue[0]).toBeLessThan(30);
      } finally {
        clearTimeout(retryTimeout);
        retryController.abort();
      }
    } finally {
      clearTimeout(timeout);
      controller.abort();
      await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    }
  }, 320_000);
});
