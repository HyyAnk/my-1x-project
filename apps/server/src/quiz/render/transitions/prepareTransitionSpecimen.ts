import {
  QuizV2Schema,
  type DirectorPlan,
  type FrameRate,
  type MascotRenderAspectRatio,
  type QuizTimeline,
  type QuizV2,
  type ResolvedTransitionInstance,
  type TransitionPlacement,
  type TransitionPreviewSource,
  type TransitionSelection,
  getTransitionDefinition,
  resolveTransitionInstance,
  MASCOT_CANVAS_SIZES,
  canonicalJsonStringify,
  sha256Hex,
} from "@studio/shared";
import { buildQuizVoicePlan } from "../../audio/voicePlan.js";
import { createDefaultDirectorPlan } from "../../director/parseDirectorPlan.js";
import { compileQuizTimeline } from "../../timeline/compileTimeline.js";
import type { QuizTimingPolicy } from "../../timeline/timingPolicy.js";
import type { CandyArcadeCompositionInput } from "../candyArcadeComposition.js";
import type { QuizRenderStyleContext } from "../quizRenderStyleContext.js";

export const DETERMINISTIC_TRANSITION_QUIZ: QuizV2 = QuizV2Schema.parse({
  schema_version: 2,
  episode_id: "transition-preview-specimen",
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

export const SPECIMEN_SAMPLE_REVISION = sha256Hex(
  canonicalJsonStringify({
    quiz: DETERMINISTIC_TRANSITION_QUIZ,
    version: 1,
  }),
).slice(0, 16);

export type PrepareTransitionSpecimenOptions = {
  selection: TransitionSelection;
  source: TransitionPreviewSource;
  fps?: FrameRate;
  compactTiming?: boolean;
};

export type PreparedTransitionSpecimen = {
  compositionInput: CandyArcadeCompositionInput;
  reviewWindow: {
    firstFrame: number;
    lastFrameInclusive: number;
    boundaryFrame: number;
  };
  resolvedInstance: ResolvedTransitionInstance;
  boundaryId: string;
  fps: FrameRate;
  aspectRatio: MascotRenderAspectRatio;
  width: number;
  height: number;
  sampleRevision: string;
};

function createSilentWavDataUri(durationSeconds: number = 6): string {
  const sampleRate = 22050;
  const numChannels = 1;
  const bitsPerSample = 16;
  const numSamples = Math.floor(sampleRate * durationSeconds);
  const dataSize = numSamples * numChannels * (bitsPerSample / 8);
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * numChannels * (bitsPerSample / 8), 28);
  buffer.writeUInt16LE(numChannels * (bitsPerSample / 8), 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  return `data:audio/wav;base64,${buffer.toString("base64")}`;
}

export function prepareTransitionSpecimen(
  options: PrepareTransitionSpecimenOptions,
): PreparedTransitionSpecimen {
  const { selection, source, compactTiming = true } = options;
  const fps: FrameRate = options.fps ?? { numerator: 30, denominator: 1 };
  const fpsVal = fps.numerator / fps.denominator;

  const definition = getTransitionDefinition(selection.id);
  const placement: TransitionPlacement = definition.placements.includes("scene") ? "scene" : "intro";

  const sandboxInput = source.kind === "sample" ? source.sandboxInput : undefined;
  const aspectRatio: MascotRenderAspectRatio = (sandboxInput?.aspect_ratio ?? "16:9") as MascotRenderAspectRatio;
  const canvas = MASCOT_CANVAS_SIZES[aspectRatio] ?? { width: 1920, height: 1080 };

  const quiz: QuizV2 = {
    ...DETERMINISTIC_TRANSITION_QUIZ,
    episode_id: "transition-preview-specimen",
  };

  const director = createDefaultDirectorPlan(quiz, aspectRatio);
  if (director.beats[0]) {
    director.beats[0].transition_id = selection.id as any;
  }

  const voicePlan = buildQuizVoicePlan(quiz);

  let timingPolicy: Partial<QuizTimingPolicy> | undefined;
  let audioDurations: Record<string, number> | undefined;

  if (compactTiming) {
    timingPolicy = {
      question_entrance_seconds: 0.25,
      question_narration_lead_seconds: 0.1,
      choices_enter_delay_seconds: 0.15,
      choice_entrance_seconds: 0.15,
      choice_stagger_seconds: 0.08,
      choice_settle_seconds: 0.15,
      narration_gap_seconds: 0.08,
      question_to_choices_pause_seconds: 0.08,
      thinking_settle_seconds: 0.1,
      post_prompt_thinking_seconds: 0.1,
      minimum_thinking_seconds: 0.4,
      maximum_thinking_seconds: 0.8,
      countdown_seconds: 1,
      reveal_delay_seconds: 0.1,
      reveal_seconds: 0.25,
      reveal_voice_lead_seconds: 0.1,
      reveal_hold_seconds: 0.15,
      reward_seconds: { small: 0.2, medium: 0.25, big: 0.3 },
      explanation_lead_seconds: 0.1,
      explanation_hold_seconds: 0.15,
      fact_hold_seconds: 0.15,
      transition_seconds: selection.durationSeconds ?? definition.defaultDurationSeconds,
      transition_overlap_seconds: 0.08,
      outro_hold_seconds: 0.3,
    };

    audioDurations = {};
    for (const segment of voicePlan.segments) {
      audioDurations[segment.segment_id] = 0.25;
    }
  }

  const timeline = compileQuizTimeline({
    quiz,
    director,
    voicePlan,
    timing: timingPolicy,
    audioDurations,
  });

  const boundaryId = quiz.questions[0]!.id;
  const transitionEvent = timeline.events.find(
    (event) => event.question_id === boundaryId && event.type === "transition.start",
  );

  const startSeconds = transitionEvent ? transitionEvent.at_seconds : 2.5;
  const durationSeconds = transitionEvent
    ? transitionEvent.duration_seconds
    : selection.durationSeconds ?? definition.defaultDurationSeconds;

  const startFrame = Math.round(startSeconds * fpsVal);
  const durationFrames = Math.max(1, Math.round(durationSeconds * fpsVal));
  const boundaryFrame = startFrame + Math.round(durationFrames / 2);
  const availableEndFrameExclusive = startFrame + durationFrames;

  const styleContext: QuizRenderStyleContext = {
    theme: sandboxInput?.theme ?? "candy_arcade",
    episode: {
      visual_theme: sandboxInput?.theme ?? "candy_arcade",
      palette_id: sandboxInput?.palette_id ?? "lime",
      thinking_bar_style: sandboxInput?.thinking_bar_style ?? "star_slider",
      question_box_style: sandboxInput?.question_box_style ?? "candy_pop",
      answer_card_style: sandboxInput?.answer_card_style ?? "glossy_arcade",
      question_counter_style: sandboxInput?.counter_style ?? "hanging_woodsign",
      background_style: sandboxInput?.background_style ?? "candy_rays",
      style_catalog_revision: sandboxInput?.style_catalog_revision,
    },
    styleCatalogRevision: sandboxInput?.style_catalog_revision,
  };

  const resolvedInstance = resolveTransitionInstance(selection, {
    instanceId: boundaryId,
    placement,
    fps,
    startFrame,
    boundaryFrame,
    availableEndFrameExclusive,
    width: canvas.width,
    height: canvas.height,
    fromColor: "#a3e635",
    toColor: "#06b6d4",
    inkColor: "#1f2937",
  });

  const totalDurationSeconds = timeline.duration_seconds;
  const totalFrames = Math.round(totalDurationSeconds * fpsVal);

  const inspectionFrames = Math.round(0.75 * fpsVal);
  const reviewWindow = {
    firstFrame: Math.max(0, resolvedInstance.startFrame - inspectionFrames),
    lastFrameInclusive: Math.min(
      Math.max(0, totalFrames - 1),
      resolvedInstance.endFrameExclusive - 1 + inspectionFrames,
    ),
    boundaryFrame: resolvedInstance.boundaryFrame,
  };

  const silentAudio = createSilentWavDataUri(totalDurationSeconds + 1);

  const compositionInput: CandyArcadeCompositionInput = {
    quiz,
    director,
    timeline,
    styleContext,
    audioPath: silentAudio,
    narrationDurationSeconds: totalDurationSeconds,
    aspectRatio,
    fps: fpsVal,
    premixedAudio: true,
    transitionInstances: {
      [boundaryId]: resolvedInstance,
    },
  };

  return {
    compositionInput,
    reviewWindow,
    resolvedInstance,
    boundaryId,
    fps,
    aspectRatio,
    width: canvas.width,
    height: canvas.height,
    sampleRevision: SPECIMEN_SAMPLE_REVISION,
  };
}
