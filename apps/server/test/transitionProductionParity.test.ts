import { describe, expect, it } from "vitest";
import { transitionClip } from "../src/quiz/render/candyArcade/candyArcadeClips.js";
import { createTransitionFixture } from "./helpers/transitionFixtures.js";
import { decodeVideoFrameToRawRgba } from "../src/tasks/video/videoFrameDecoder.js";
import { spawn } from "node:child_process";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

async function generateSampleTestVideo(outputPath: string, durationSeconds = 1): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "ffmpeg",
      [
        "-y",
        "-f",
        "lavfi",
        "-i",
        `testsrc=size=160x90:rate=30:duration=${durationSeconds}`,
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        outputPath,
      ],
      { stdio: ["ignore", "pipe", "pipe"], windowsHide: true },
    );

    let stderr = "";
    child.stderr.on("data", (c) => (stderr += c.toString()));
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg testsrc generation failed (${code}): ${stderr.slice(-500)}`));
    });
    child.on("error", reject);
  });
}

describe("Task 10: Transition Production Parity & Verification", () => {
  it("verifies production markup geometry across all canonical transitions in 16:9 and 9:16", () => {
    const aspectRatios = ["16:9" as const, "9:16" as const];

    for (const ar of aspectRatios) {
      // 1. brush_wave
      const brushFixture = createTransitionFixture("brush_wave", ar);
      const brushHtml = transitionClip(brushFixture.transitionClipInput);
      expect(brushHtml).toContain('class="brush brush-one"');
      expect(brushHtml).not.toContain('class="splash-bed"');

      // 2. lightning_brush
      const lightningFixture = createTransitionFixture("lightning_brush", ar);
      const lightningHtml = transitionClip(lightningFixture.transitionClipInput);
      expect(lightningHtml).toContain('class="brush brush-one"');
      expect(lightningHtml).not.toContain('class="splash-bed"');

      // 3. bubble_splash
      const bubbleFixture = createTransitionFixture("bubble_splash", ar);
      const bubbleHtml = transitionClip(bubbleFixture.transitionClipInput);
      expect(bubbleHtml).toContain('class="splash-bed"');

      // 4. stinger_swipe
      const stingerFixture = createTransitionFixture("stinger_swipe", ar);
      const stingerHtml = transitionClip(stingerFixture.transitionClipInput);
      expect(stingerHtml).toContain("stinger-slash");
      expect(stingerHtml).toContain("stinger-flash");

      // 5. crossfade
      const crossfadeFixture = createTransitionFixture("crossfade", ar);
      const crossfadeHtml = transitionClip(crossfadeFixture.transitionClipInput);
      expect(crossfadeHtml).toContain("transition-crossfade");

      // 6. cut
      const cutFixture = createTransitionFixture("cut", ar);
      const cutHtml = transitionClip(cutFixture.transitionClipInput);
      expect(cutHtml).toBe("");
    }
  });

  it("verifies exact video frame decoder extracts non-empty RGBA buffers from encoded test video", async () => {
    const tmpDir = path.join(os.tmpdir(), `test_parity_decode_${Date.now()}`);
    await mkdir(tmpDir, { recursive: true });
    const videoPath = path.join(tmpDir, "test_parity.mp4");

    try {
      await generateSampleTestVideo(videoPath, 1.0);

      // Decode frame 0 and frame 15
      const rgba0 = await decodeVideoFrameToRawRgba(videoPath, 0);
      expect(rgba0.length).toBe(160 * 90 * 4);

      const rgba15 = await decodeVideoFrameToRawRgba(videoPath, 15);
      expect(rgba15.length).toBe(160 * 90 * 4);

      // Different frames in dynamic testsrc must have differing pixel buffers
      expect(Buffer.compare(rgba0, rgba15)).not.toBe(0);
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  });
});
