import {
  MASCOT_CANVAS_SIZES,
  QuizV2Schema,
  resolveEffectiveMascotMediaMode,
  type QuizTimeline,
  type QuizTimelineEvent,
} from "@studio/shared";
import type { CandyArcadeCompositionBundle, CandyArcadeCompositionInput } from "../candyArcadeComposition.js";
import { createMascotAnimationRenderSnapshot } from "../productionMascotRenderer.js";
import { QUIZ_SHORT_STAGE_SEGMENT_IDS, SCORE_CTA_DURATION_SECONDS } from "../../timeline/quizShortTimelinePolicy.js";
import { assembleCandyArcadeDocument } from "./candyArcadeAssetBundler.js";
import { buildCandyArcadeQuestionTimeline } from "./candyArcadeQuestionTimeline.js";
import { resolveCandyArcadeQuestions } from "./candyArcadeQuestionResolution.js";
import { DEFAULT_KICKOFF_DURATION_SECONDS, kickoffClip } from "./kickoffClip.js";
import { resolveChosenMascotStyleId } from "./mascotStyleSelection.js";
import { quizCopy } from "./quizCopy.js";
import { scoreCtaClip } from "./scoreCtaClip.js";

export const QUIZ_SHORT_ASPECT_RATIO = "9:16" as const;

type StageEvents = { kickoff?: QuizTimelineEvent; scoreCta?: QuizTimelineEvent; firstQuestionStart: number };

function findStageEvent(events: QuizTimeline["events"], segmentId: string): QuizTimelineEvent | undefined {
  return events.find((event) => event.type === "background.motion" && event.segment_id === segmentId);
}

/** Locates the kickoff and score CTA stages the Quiz Short timeline compiler emits. */
export function resolveQuizShortStageEvents(timeline: QuizTimeline, firstQuestionId: string | undefined): StageEvents {
  const firstQuestionStart = firstQuestionId
    ? (timeline.events.find((event) => event.question_id === firstQuestionId && event.type === "question.enter")?.at_seconds ?? 0)
    : 0;
  return {
    kickoff: findStageEvent(timeline.events, QUIZ_SHORT_STAGE_SEGMENT_IDS.kickoff),
    scoreCta: findStageEvent(timeline.events, QUIZ_SHORT_STAGE_SEGMENT_IDS.scoreCta),
    firstQuestionStart,
  };
}

/**
 * Builds the 1080x1920 Quiz Short composition: kickoff card, the portrait question clips and the
 * three-second score CTA. There is no intro, bridge topic, brand stinger, subscribe CTA, pre-outro,
 * outro or celebration stinger, and the mascot appears only on answer reveals and the CTA.
 */
export function buildQuizShortCompositionBundle(input: CandyArcadeCompositionInput): CandyArcadeCompositionBundle {
  QuizV2Schema.parse(input.quiz);
  const aspectRatio = QUIZ_SHORT_ASPECT_RATIO;
  const canvas = MASCOT_CANVAS_SIZES[aspectRatio];
  const fps = input.fps ?? 30;
  const duration = Math.max(3, input.narrationDurationSeconds, input.timeline.duration_seconds);
  const copy = quizCopy(input.quiz.language);
  const events = [...input.timeline.events].sort((a, b) => a.at_seconds - b.at_seconds);
  const stages = resolveQuizShortStageEvents(input.timeline, input.quiz.questions[0]?.id);
  const resolvedQuestions = resolveCandyArcadeQuestions({
    quiz: input.quiz,
    director: input.director,
    styleContext: input.styleContext,
    aspectRatio,
  });
  const chosenStyleId = resolveChosenMascotStyleId(input);
  const snapshot = input.mascotAnimationSnapshot ?? createMascotAnimationRenderSnapshot(input.quiz.episode_id || "default_video");
  const mediaMode = resolveEffectiveMascotMediaMode(input.mascotConfig, input.mascotMediaMode);
  const firstPalette = resolvedQuestions[0]?.visual.palette;
  const lastPalette = resolvedQuestions[resolvedQuestions.length - 1]?.visual.palette;

  const kickoffEnd = stages.kickoff ? stages.kickoff.at_seconds + stages.kickoff.duration_seconds : stages.firstQuestionStart;
  const kickoffDuration = stages.kickoff?.duration_seconds ?? Math.min(DEFAULT_KICKOFF_DURATION_SECONDS, stages.firstQuestionStart);
  const clips: string[] = [];
  if (kickoffDuration > 0.04) {
    clips.push(
      kickoffClip({
        start: stages.kickoff?.at_seconds ?? 0,
        duration: kickoffDuration,
        questionCount: input.quiz.questions.length,
        copy,
        palette: firstPalette,
      }),
    );
  }

  const scoreCtaStart = stages.scoreCta?.at_seconds ?? Math.max(kickoffEnd, duration - SCORE_CTA_DURATION_SECONDS);
  const timeline = buildCandyArcadeQuestionTimeline({
    quiz: input.quiz,
    resolvedQuestions,
    events,
    duration,
    outroStart: scoreCtaStart,
    mascot: input.mascot,
    mascotConfig: input.mascotConfig,
    chosenStyleId,
    snapshot,
    styleContext: input.styleContext,
    assets: input.assets,
    aspectRatio,
    copy,
    fps,
    canvas,
    customTransitionInstances: input.transitionInstances,
    mediaMode,
    productKind: "quiz_short",
  });
  clips.push(...timeline.clips);

  clips.push(
    scoreCtaClip({
      start: scoreCtaStart,
      duration: Math.max(0.04, Math.min(duration - scoreCtaStart, stages.scoreCta?.duration_seconds ?? SCORE_CTA_DURATION_SECONDS)),
      onScreenCopy: typeof stages.scoreCta?.payload?.on_screen_copy === "string" ? stages.scoreCta.payload.on_screen_copy : undefined,
      aspectRatio,
      mascot: input.mascot,
      mascotConfig: input.mascotConfig,
      mediaMode,
      palette: lastPalette,
    }),
  );

  const usedBackgroundStyles = new Set(resolvedQuestions.map(({ style }) => style.backgroundStyle));
  const document = assembleCandyArcadeDocument({
    clips,
    canvas,
    aspectRatio,
    duration,
    fps,
    mascot: input.mascot ? { ...input.mascot, active_style_id: chosenStyleId ?? input.mascot.active_style_id } : null,
    usedBackgroundStyles,
    styleCatalogRevision: input.styleContext.styleCatalogRevision ?? undefined,
    audioPath: input.audioPath,
    narrationDurationSeconds: input.narrationDurationSeconds,
    premixedAudio: input.premixedAudio,
    events,
    assets: input.assets,
    bgmOptions: input.bgmOptions,
    episodeId: input.quiz.episode_id,
    firstStart: stages.kickoff?.at_seconds ?? 0,
    outroStart: scoreCtaStart,
  });

  return {
    html: document.html,
    files: document.files,
    transitionInstances: timeline.transitionInstances,
    mascotAnimationSnapshot: snapshot,
  };
}
