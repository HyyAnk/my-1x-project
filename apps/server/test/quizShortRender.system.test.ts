import { execFile } from "node:child_process";
import { mkdir, stat, writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import path from "node:path";
import { describe, expect, it } from "vitest";
import sharp from "sharp";
import type { MascotProfile } from "@studio/shared";
import { buildQuizShortVoicePlan } from "../src/quiz/audio/quizShortVoicePlan.js";
import { createQuizShortDirectorPlan } from "../src/quiz/director/quizShortDirectorPlan.js";
import { compileQuizTimeline } from "../src/quiz/timeline/compileTimeline.js";
import { buildCandyArcadeCompositionBundle } from "../src/quiz/render/candyArcadeComposition.js";
import { findQuizShortMascotViolations } from "../src/quiz/render/candyArcade/quizShortMascotInvariant.js";
import { getHyperframesInvocation } from "../src/tasks/video/videoInvocation.js";
import { buildLayoutCheckArgs, resolveLayoutCheckSampling } from "../src/tasks/video/layoutCheckSampling.js";
import { createSilentWavBuffer, writeCompositionBundle } from "./mascotVideoCheckHelpers.js";
import { buildQuizShortConfig, buildTextQuizShortQuiz, quizShortAudioDurations } from "./fixtures/quizShortFixtures.js";
import { stillImageMascot } from "./candyArcadeTestUtils.js";

const execAsync = promisify(execFile);
const outputRoot = path.resolve("../../tmp/quiz-short-renders");

const MASCOT_ASSET_FILES = ["mascot.png", "mascot_thinking_1.png", "mascot_celebrate_1.png"] as const;

/** The shared fixture points at "/assets/..."; the specimen needs real files next to the composition. */
function bundleRelativeMascot(): MascotProfile {
  const relative = (url: string) => `.${url}`;
  return {
    ...stillImageMascot,
    master_image_url: relative(stillImageMascot.master_image_url),
    styles: stillImageMascot.styles.map((style) => ({
      ...style,
      anchor_image_url: relative(style.anchor_image_url),
      states: Object.fromEntries(
        Object.entries(style.states).map(([state, slots]) => [
          state,
          slots.map((slot) => ({ ...slot, image_url: relative(slot.image_url) })),
        ]),
      ) as typeof style.states,
    })),
  };
}

async function writeMascotAssets(renderRoot: string): Promise<void> {
  const assetsDir = path.join(renderRoot, "assets");
  await mkdir(assetsDir, { recursive: true });
  const png = await sharp({ create: { width: 220, height: 220, channels: 4, background: { r: 255, g: 180, b: 40, alpha: 1 } } })
    .png()
    .toBuffer();
  await Promise.all(MASCOT_ASSET_FILES.map((name) => writeFile(path.join(assetsDir, name), png)));
}

async function runCli(args: string[], logPath: string): Promise<string> {
  const invocation = getHyperframesInvocation(...args);
  try {
    const result = await execAsync(invocation.command, invocation.args, {
      windowsHide: true,
      timeout: 240000,
      maxBuffer: 32 * 1024 * 1024,
    });
    await writeFile(logPath, result.stdout + result.stderr);
    return result.stdout;
  } catch (error) {
    const failure = error as Error & { stdout?: string; stderr?: string };
    await writeFile(logPath, `${failure.stdout ?? ""}\n${failure.stderr ?? ""}\n${failure.message}`);
    throw error;
  }
}

/** Opt-in (STUDIO_TEST_SUITE=system): checks and renders one five-question portrait specimen with HyperFrames. */
describe("Quiz Short portrait render specimen", () => {
  it("checks every reveal sample at 1080x1920 and renders a draft MP4", async () => {
    const quiz = buildTextQuizShortQuiz();
    const director = createQuizShortDirectorPlan(quiz, buildQuizShortConfig());
    const voicePlan = buildQuizShortVoicePlan(quiz, { director });
    const audioDurations = quizShortAudioDurations(voicePlan.segments.map((segment) => segment.segment_id));
    const timeline = compileQuizTimeline({ quiz, director, voicePlan, audioDurations, productKind: "quiz_short" });
    const renderRoot = path.join(outputRoot, "five-question-text");
    await mkdir(renderRoot, { recursive: true });
    await writeMascotAssets(renderRoot);

    const bundle = buildCandyArcadeCompositionBundle({
      productKind: "quiz_short",
      quiz,
      director,
      timeline,
      styleContext: { theme: "candy_arcade" },
      audioPath: "./soundtrack.wav",
      premixedAudio: true,
      narrationDurationSeconds: timeline.duration_seconds,
      aspectRatio: "9:16",
      mascot: bundleRelativeMascot(),
      fps: 24,
    });
    expect(findQuizShortMascotViolations(bundle)).toEqual([]);
    await writeCompositionBundle(renderRoot, bundle, process.cwd(), createSilentWavBuffer(timeline.duration_seconds));
    await writeFile(path.join(renderRoot, "timeline.json"), JSON.stringify(timeline, null, 2));

    const sampleTimes = timeline.events
      .filter((event) => ["countdown.start", "answer.reveal"].includes(event.type))
      .map((event) => (event.at_seconds + 0.7).toFixed(3));
    const sampling = resolveLayoutCheckSampling({ renderQuality: "draft", canvas: { width: 1080, height: 1920 } });
    const checkArgs = buildLayoutCheckArgs(sampling, 60000).filter(
      (arg, index, args) => arg !== "--samples" && args[index - 1] !== "--samples",
    );
    const raw = await runCli(
      ["check", renderRoot, ...checkArgs, "--at", sampleTimes.join(","), "--snapshots", "--no-browser-gpu"],
      path.join(renderRoot, "check.log"),
    );
    const report = JSON.parse(raw.slice(raw.indexOf("{"))) as { ok: boolean };
    expect(report.ok).toBe(true);

    const videoPath = path.join(renderRoot, "video.mp4");
    await runCli(
      ["render", renderRoot, "--output", videoPath, "--quality", "draft", "--fps", "24", "--workers", "4"],
      path.join(renderRoot, "render.log"),
    );
    const rendered = await stat(videoPath);
    expect(rendered.size).toBeGreaterThan(0);
  }, 600000);
});
