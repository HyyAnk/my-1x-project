import { spawn } from "node:child_process";
import { QuizV2Schema, type DirectorPlan, type QuizTimeline, type QuizV2 } from "@studio/shared";
import { createDefaultDirectorPlan } from "../../src/quiz/director/parseDirectorPlan.js";
import { compileQuizTimeline } from "../../src/quiz/timeline/compileTimeline.js";
import { buildQuizVoicePlan } from "../../src/quiz/audio/voicePlan.js";
import type { QuizRenderStyleContext } from "../../src/quiz/render/quizRenderStyleContext.js";
import type { QuizTemplateScene, QuizPalette } from "../../src/quiz/visual/types.js";

export type TransitionFixtureAspect = "16:9" | "9:16";

export type TransitionBoundaryIdentity = {
  boundaryTimeSeconds: number;
  boundaryFrame: number;
  startFrame: number;
  endFrameExclusive: number;
  durationFrames: number;
  fps: { numerator: number; denominator: number };
};

export type TransitionClipTestInput = {
  start: number;
  end: number;
  visual: QuizTemplateScene;
  nextPalette: QuizPalette;
};

export type TransitionFixture = {
  id: string;
  aspectRatio: TransitionFixtureAspect;
  quiz: QuizV2;
  director: DirectorPlan;
  timeline: QuizTimeline;
  styleContext: QuizRenderStyleContext;
  assets: Record<string, string>;
  boundaryIdentity: TransitionBoundaryIdentity;
  transitionClipInput: TransitionClipTestInput;
};

export const DETERMINISTIC_TRANSITION_QUIZ: QuizV2 = QuizV2Schema.parse({
  schema_version: 2,
  episode_id: "transition-parity-specimen",
  age_band: "7-9",
  language: "English",
  questions: [
    {
      id: "specimen-q1",
      number: 1,
      format: "multiple_choice",
      difficulty: 1,
      question: "Which celestial body orbits Planet Earth?",
      choices: [
        { id: "choice-moon", text: "The Moon" },
        { id: "choice-mars", text: "Mars" },
        { id: "choice-sun", text: "The Sun" },
      ],
      correct_choice_id: "choice-moon",
      explanation: "The Moon is Earth's only natural satellite.",
      fun_fact: "The Moon is drifting away by ~3.8 cm every year.",
      source_ids: ["TP01"],
      visual_opportunity: "A luminous moon orbiting earth",
      validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
    },
    {
      id: "specimen-q2",
      number: 2,
      format: "odd_one_out",
      difficulty: 2,
      question: "Which of these is not a warm primary color?",
      choices: [
        { id: "choice-blue", text: "Blue" },
        { id: "choice-red", text: "Red" },
        { id: "choice-yellow", text: "Yellow" },
      ],
      correct_choice_id: "choice-blue",
      explanation: "Blue is considered a cool primary color.",
      fun_fact: "Primary colors cannot be created by mixing other colors.",
      source_ids: ["TP02"],
      visual_opportunity: "Artist color wheel",
      validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
    },
  ],
});

export function createTransitionFixture(
  id: string,
  aspectRatio: TransitionFixtureAspect = "16:9",
): TransitionFixture {
  const quiz = DETERMINISTIC_TRANSITION_QUIZ;
  const director = createDefaultDirectorPlan(quiz, aspectRatio);

  // Set the requested transition on question 1 beat
  if (director.beats[0]) {
    director.beats[0].transition_id = id as any;
  }

  const voicePlan = buildQuizVoicePlan(quiz);
  const timeline = compileQuizTimeline({
    quiz,
    director,
    voicePlan,
  });

  const fps = { numerator: 30, denominator: 1 };
  const transitionEvent = timeline.events.find(
    (event) => event.question_id === "specimen-q1" && event.type === "transition.start",
  );

  const startSeconds = transitionEvent ? transitionEvent.at_seconds : 9.5;
  const durationSeconds = transitionEvent ? transitionEvent.duration_seconds : 0.8;
  const startFrame = Math.round((startSeconds * fps.numerator) / fps.denominator);
  const durationFrames = Math.round((durationSeconds * fps.numerator) / fps.denominator);
  const boundaryFrame = startFrame + Math.round(durationFrames / 2);
  const endFrameExclusive = startFrame + durationFrames;

  const styleContext: QuizRenderStyleContext = {
    theme: "candy_arcade",
    imageStyle: "mixed",
    thinkingBarStyle: "auto",
    questionBoxStyle: "auto",
    answerCardStyle: "auto",
    counterStyle: "auto",
    backgroundStyle: "auto",
    paletteId: "sunny",
    topicWheelEnabled: false,
    musicStyle: "upbeat",
    thumbnailRatio: aspectRatio,
  };

  const transitionClipInput: TransitionClipTestInput = {
    start: startSeconds,
    end: startSeconds + durationSeconds,
    visual: {
      palette: {
        id: "sunny",
        name: "Sunny Joy",
        accent: "#fbbf24",
        backgroundPrimary: "#fef08a",
        backgroundSecondary: "#fde047",
        text: "#1f2937",
        contrastOnAccent: "#000000",
        contrastOnDark: "#ffffff",
      },
      transitionId: id,
      motionId: "enter.pop",
      layoutId: "full_stack_list",
    },
    nextPalette: {
      id: "aqua",
      name: "Aqua Pop",
      accent: "#06b6d4",
      backgroundPrimary: "#cffafe",
      backgroundSecondary: "#a5f3fc",
      text: "#0f172a",
      contrastOnAccent: "#ffffff",
      contrastOnDark: "#ffffff",
    },
  };

  return {
    id,
    aspectRatio,
    quiz,
    director,
    timeline,
    styleContext,
    assets: {},
    boundaryIdentity: {
      boundaryTimeSeconds: startSeconds + durationSeconds / 2,
      boundaryFrame,
      startFrame,
      endFrameExclusive,
      durationFrames,
      fps,
    },
    transitionClipInput,
  };
}

export async function generateDeterministicIntroVideo(targetPath: string, durationSeconds: number = 1.0): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn("ffmpeg", [
      "-y",
      "-f", "lavfi", "-i", `testsrc=size=1920x1080:rate=30:duration=${durationSeconds}`,
      "-f", "lavfi", "-i", `sine=frequency=440:duration=${durationSeconds}`,
      "-c:v", "libx264",
      "-pix_fmt", "yuv420p",
      "-c:a", "aac",
      targetPath,
    ], { stdio: ["ignore", "pipe", "pipe"] });

    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("close", (code) => {
      if (code === 0) resolve(targetPath);
      else reject(new Error(`ffmpeg failed with code ${code}: ${stderr.slice(-1000)}`));
    });
    child.on("error", reject);
  });
}
