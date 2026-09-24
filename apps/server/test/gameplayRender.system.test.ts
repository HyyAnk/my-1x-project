import { execFile } from "node:child_process";
import { mkdir, writeFile, stat } from "node:fs/promises";
import { promisify } from "node:util";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { QUIZ_GAMEPLAY_ARCHETYPES } from "@studio/shared";
import { gameplayFixture } from "./fixtures/gameplayFixtures.js";
import { buildCandyArcadeCompositionBundle } from "../src/quiz/render/candyArcadeComposition.js";
import { createSilentWavBuffer, writeCompositionBundle } from "./mascotVideoCheckHelpers.js";
import { getHyperframesInvocation } from "../src/tasks/video/videoInvocation.js";
import { StudioLogger } from "../src/logger.js";

const execAsync = promisify(execFile);
const outputRoot = path.resolve("../../tmp/gameplay-policy-renders");
const logger = new StudioLogger(outputRoot);

async function runCli(args: string[], destination: string) {
  const invocation = getHyperframesInvocation(...args);
  try {
    const result = await execAsync(invocation.command, invocation.args, {
      windowsHide: true,
      timeout: 240000,
      maxBuffer: 32 * 1024 * 1024,
    });
    await writeFile(destination, result.stdout + result.stderr);
    return result.stdout;
  } catch (error) {
    const failure = error as Error & { stdout?: string; stderr?: string };
    await writeFile(destination, `${failure.stdout ?? ""}\n${failure.stderr ?? ""}\n${failure.message}`);
    throw error;
  }
}

describe.skipIf(process.env.RUN_GAMEPLAY_RENDERS !== "1")("production gameplay render matrix", () => {
  it.each(QUIZ_GAMEPLAY_ARCHETYPES)(
    "checks and renders three questions for $id",
    async ({ id }) => {
      const started = Date.now();
      const context = { workerId: "render-1", profileId: id, step: "verify_gameplay" };
      await logger.init();
      logger.info("Config: fixture assets, silent measured-duration audio, headless browser protocol, concurrency=1, profiles=7", context);
      const fixture = gameplayFixture(id);
      const renderRoot = path.join(outputRoot, id);
      await mkdir(renderRoot, { recursive: true });
      const bundle = buildCandyArcadeCompositionBundle({
        quiz: fixture.quiz,
        director: fixture.director,
        timeline: fixture.timeline,
        styleContext: { theme: "candy_arcade" },
        audioPath: "./soundtrack.wav",
        narrationDurationSeconds: fixture.timeline.duration_seconds,
        premixedAudio: true,
        fps: 24,
      });
      await writeCompositionBundle(renderRoot, bundle, process.cwd(), createSilentWavBuffer(fixture.timeline.duration_seconds));
      await writeFile(path.join(renderRoot, "timeline.json"), JSON.stringify(fixture.timeline, null, 2));
      const times = fixture.timeline.events
        .filter((event) => ["countdown.start", "answer.reveal"].includes(event.type))
        .map((event) => (event.at_seconds + 0.7).toFixed(3));
      logger.step("Checking thinking and reveal samples for every question", context);
      const raw = await runCli(
        ["check", renderRoot, "--json", "--at", times.join(","), "--snapshots", "--timeout", "60000", "--no-browser-gpu"],
        path.join(renderRoot, "check.json"),
      );
      const report = JSON.parse(raw.slice(raw.indexOf("{"))) as { ok: boolean };
      expect(report.ok).toBe(true);
      logger.step("Rendering MP4", context);
      const videoPath = path.join(renderRoot, "video.mp4");
      await runCli(
        ["render", renderRoot, "--output", videoPath, "--quality", "draft", "--fps", "24", "--workers", "4"],
        path.join(renderRoot, "render.log"),
      );
      expect((await stat(videoPath)).size).toBeGreaterThan(10000);
      const { stdout } = await execAsync(
        "ffprobe",
        ["-v", "error", "-show_entries", "format=duration:stream=codec_type,width,height", "-of", "json", videoPath],
        { windowsHide: true },
      );
      await writeFile(path.join(renderRoot, "probe.json"), stdout);
      const probe = JSON.parse(stdout) as { format: { duration: string }; streams: { codec_type: string }[] };
      expect(Math.abs(Number(probe.format.duration) - fixture.timeline.duration_seconds)).toBeLessThan(0.15);
      expect(probe.streams.some((stream) => stream.codec_type === "audio")).toBe(true);
      logger.ok(`Total=1 success=1 failed=0 skipped=0 retries=0 elapsed=${((Date.now() - started) / 1000).toFixed(1)}s`, context);
    },
    300000,
  );
});
