import { MASCOT_CANVAS_SIZES, QuizV2Schema, resolveEffectiveMascotMediaMode } from "@studio/shared";
import type { CandyArcadeCompositionBundle, CandyArcadeCompositionInput } from "../candyArcadeComposition.js";
import { createMascotAnimationRenderSnapshot } from "../productionMascotRenderer.js";
import { SCORE_CTA_DURATION_SECONDS } from "../../timeline/quizShortTimelinePolicy.js";
import { assembleCandyArcadeDocument } from "./candyArcadeAssetBundler.js";
import { buildCandyArcadeQuestionTimeline } from "./candyArcadeQuestionTimeline.js";
import { resolveCandyArcadeQuestions } from "./candyArcadeQuestionResolution.js";
import { resolveChosenMascotStyleId } from "./mascotStyleSelection.js";
import { quizCopy } from "./quizCopy.js";
import { scoreCtaClip } from "./scoreCtaClip.js";
import { buildQuizShortOpening, resolveQuizShortClosingStart, resolveQuizShortStageEvents } from "./shortBookends/quizShortBookendClips.js";

import { buildQuizShortOutroClips } from "./shortBookends/shortOutroClips.js";

export { resolveQuizShortStageEvents } from "./shortBookends/quizShortBookendClips.js";
export const QUIZ_SHORT_ASPECT_RATIO = "9:16" as const;

/**
 * Builds the 1080x1920 Quiz Short composition: the opening (the Short intro with the title, or the
 * kickoff card), the portrait question clips and the closing (the full Short outro, or the
 * three-second score CTA). There is no bridge topic, brand stinger, subscribe CTA, pre-outro or
 * celebration stinger, and the mascot appears only on answer reveals and the CTA.
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

  const opening = buildQuizShortOpening({
    stages,
    media: input.shortBookends,
    questionCount: input.quiz.questions.length,
    copy,
    palette: firstPalette,
    fps,
    canvas,
    transitionInstances: input.transitionInstances,
  });
  const clips: string[] = [...opening.clips];
  const closingStart = resolveQuizShortClosingStart(stages, opening.end, duration);
  const timeline = buildCandyArcadeQuestionTimeline({
    quiz: input.quiz,
    resolvedQuestions,
    events,
    duration,
    outroStart: closingStart,
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
    ...(buildQuizShortOutroClips(stages, input.shortBookends, duration) ?? [
      scoreCtaClip({
        start: closingStart,
        duration: Math.max(0.04, Math.min(duration - closingStart, stages.scoreCta?.duration_seconds ?? SCORE_CTA_DURATION_SECONDS)),
        onScreenCopy: typeof stages.scoreCta?.payload?.on_screen_copy === "string" ? stages.scoreCta.payload.on_screen_copy : undefined,
        aspectRatio,
        mascot: input.mascot,
        mascotConfig: input.mascotConfig,
        mediaMode,
        palette: lastPalette,
      }),
    ]),
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
    firstStart: opening.start,
    outroStart: closingStart,
  });

  return {
    html: document.html,
    files: document.files,
    transitionInstances: { ...opening.transitionInstances, ...timeline.transitionInstances },
    mascotAnimationSnapshot: snapshot,
  };
}
