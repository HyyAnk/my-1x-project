import { execFile } from "node:child_process";
import { copyFile, mkdir, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { promisify } from "node:util";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_QUIZ_SHORT_TITLE_CANVAS } from "@studio/shared";
import { buildQuizShortVoicePlan } from "../src/quiz/audio/quizShortVoicePlan.js";
import { createQuizShortDirectorPlan } from "../src/quiz/director/quizShortDirectorPlan.js";
import { compileQuizTimeline } from "../src/quiz/timeline/compileTimeline.js";
import { QUIZ_SHORT_STAGE_SEGMENT_IDS } from "../src/quiz/timeline/quizShortTimelinePolicy.js";
import { buildCandyArcadeCompositionBundle } from "../src/quiz/render/candyArcadeComposition.js";
import { findQuizShortMascotViolations } from "../src/quiz/render/candyArcade/quizShortMascotInvariant.js";
import { getHyperframesInvocation } from "../src/tasks/video/videoInvocation.js";
import { createSilentWavBuffer, writeCompositionBundle } from "./mascotVideoCheckHelpers.js";
import { buildQuizShortConfig, buildTextQuizShortQuiz, quizShortAudioDurations } from "./fixtures/quizShortFixtures.js";

const execAsync = promisify(execFile);
const outputRoot = path.resolve("../../tmp/quiz-short-renders");
/** Point at a folder with "intro.mp4" and "outro.mp4" (1080x1920) to render real bookends; colored stand-ins otherwise. */
const SAMPLE_DIR = process.env.SHORT_BOOKEND_SAMPLE_DIR;
const TITLE = "Can You Name These Ocean Animals?";

async function writePortraitClip(target: string, color: string, seconds: number): Promise<void> {
  await execAsync("ffmpeg", [
    "-y",
    "-f",
    "lavfi",
    "-i",
    `color=c=${color}:s=1080x1920:d=${seconds}:r=24`,
    "-an",
    "-pix_fmt",
    "yuv420p",
    target,
  ]);
}

async function prepareClips(renderRoot: string): Promise<{ intro: number; outro: number }> {
  const intro = path.join(renderRoot, "intro.mp4");
  const outro = path.join(renderRoot, "outro.mp4");
  if (SAMPLE_DIR && existsSync(path.join(SAMPLE_DIR, "intro.mp4"))) {
    await copyFile(path.join(SAMPLE_DIR, "intro.mp4"), intro);
    await copyFile(path.join(SAMPLE_DIR, "outro.mp4"), outro);
    return { intro: 10, outro: 6 };
  }
  await writePortraitClip(intro, "skyblue", 10);
  await writePortraitClip(outro, "navy", 6);
  return { intro: 10, outro: 6 };
}

/** Opt-in (STUDIO_TEST_SUITE=system): renders a five-question Short with the Short intro and outro. */
describe("Quiz Short render with Short Intro & Outro", () => {
  it("renders the intro title stage, the questions and the full outro", async () => {
    const renderRoot = path.join(outputRoot, "short-bookends");
    await mkdir(renderRoot, { recursive: true });
    const lengths = await prepareClips(renderRoot);
    const quiz = buildTextQuizShortQuiz();
    const director = createQuizShortDirectorPlan(quiz, buildQuizShortConfig());
    const voicePlan = buildQuizShortVoicePlan(quiz, { director, kickoffText: TITLE });
    const audioDurations = quizShortAudioDurations(voicePlan.segments.map((segment) => segment.segment_id));
    audioDurations[QUIZ_SHORT_STAGE_SEGMENT_IDS.kickoff] = 2.6;
    const timeline = compileQuizTimeline({
      quiz,
      director,
      voicePlan,
      audioDurations,
      productKind: "quiz_short",
      introDuration: lengths.intro,
      outroDuration: lengths.outro,
      topic: TITLE,
    });
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
      fps: 24,
      shortBookends: {
        introVideoPath: "./intro.mp4",
        introLoopDurationSeconds: lengths.intro,
        outroVideoPath: "./outro.mp4",
        outroHasAudio: false,
        titleCanvas: DEFAULT_QUIZ_SHORT_TITLE_CANVAS,
        transitionType: "stinger_swipe",
        transitionDurationSeconds: 0.5,
      },
    });
    expect(findQuizShortMascotViolations(bundle)).toEqual([]);
    await writeCompositionBundle(renderRoot, bundle, process.cwd(), createSilentWavBuffer(timeline.duration_seconds));
    await writeFile(path.join(renderRoot, "timeline.json"), JSON.stringify(timeline, null, 2));

    const videoPath = path.join(renderRoot, "video.mp4");
    const invocation = getHyperframesInvocation(
      "render",
      renderRoot,
      "--output",
      videoPath,
      "--quality",
      "draft",
      "--fps",
      "24",
      "--workers",
      "4",
    );
    const result = await execAsync(invocation.command, invocation.args, {
      windowsHide: true,
      timeout: 480000,
      maxBuffer: 32 * 1024 * 1024,
    });
    await writeFile(path.join(renderRoot, "render.log"), result.stdout + result.stderr);
    expect((await stat(videoPath)).size).toBeGreaterThan(0);
  }, 600000);
});
