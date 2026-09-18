import type {
  ChannelMascotConfig,
  MascotProfile,
  MascotRenderAspectRatio,
  QuizTimeline,
  QuizTimelineEvent,
  QuizV2,
  ResolvedTransitionInstance,
} from "@studio/shared";
import type { ResolvedCandyArcadeQuestion } from "./candyArcadeQuestionResolution.js";
import { questionClip, type Copy } from "./candyArcadeClips.js";
import { adaptMascotForQuestion, findSnapshotEntry, type MascotAnimationRenderSnapshot } from "../productionMascotRenderer.js";
import type { QuizRenderStyleContext } from "../quizRenderStyleContext.js";
import { resolveCandyArcadeSceneTransition } from "./candyArcadeTransitionResolver.js";

export type CandyArcadeQuestionTimelineInput = {
  quiz: QuizV2;
  resolvedQuestions: ResolvedCandyArcadeQuestion[];
  events: QuizTimeline["events"];
  duration: number;
  outroStart?: number;
  mascot?: MascotProfile | null;
  mascotConfig?: ChannelMascotConfig | null;
  chosenStyleId?: string | null;
  snapshot: MascotAnimationRenderSnapshot;
  styleContext: QuizRenderStyleContext;
  assets?: Record<string, string>;
  aspectRatio: MascotRenderAspectRatio;
  copy: Copy;
  fps: number;
  canvas: { width: number; height: number };
  customTransitionInstances?: Record<string, ResolvedTransitionInstance>;
};

export type CandyArcadeQuestionTimelineResult = {
  clips: string[];
  transitionInstances: Record<string, ResolvedTransitionInstance>;
  snapshot: MascotAnimationRenderSnapshot;
};

type QuestionTimingBounds = {
  start: number;
  questionNarrationStart: number;
  choicesStart: number;
  thinkingStart: number;
  timerHideAt?: number;
  revealStart: number;
  rewardStart: number;
  transition?: QuizTimelineEvent;
  end: number;
};

function computeQuestionTimingBounds(
  questionId: string,
  events: QuizTimeline["events"],
  nextQuestionId: string | undefined,
  duration: number,
  outroStart: number | undefined,
): QuestionTimingBounds {
  const eventAt = (targetQuestionId: string, type: string, fallback: number) =>
    events.find((event) => event.question_id === targetQuestionId && event.type === type)?.at_seconds ?? fallback;

  const start = eventAt(questionId, "question.enter", 0);
  const questionNarrationStart =
    events.find(
      (event) => event.question_id === questionId && event.type === "narration.segment" && event.segment_id === `${questionId}:question`,
    )?.at_seconds ?? start;
  const choicesStart = eventAt(questionId, "choices.enter", start + 1);
  const thinkingStart = eventAt(questionId, "countdown.start", choicesStart + 1);
  const timerHideEvent = events.find((event) => event.question_id === questionId && event.type === "timer.hide");
  const revealStart = eventAt(questionId, "answer.reveal", thinkingStart + 8);
  const timerHideAt = timerHideEvent?.at_seconds ?? revealStart;
  const rewardStart = eventAt(questionId, "reward.play", revealStart + 0.8);
  const transition = events.find((event) => event.question_id === questionId && event.type === "transition.start");
  const end = Math.min(
    duration,
    nextQuestionId ? eventAt(nextQuestionId, "question.enter", duration) : (transition?.at_seconds ?? outroStart ?? duration),
  );

  return {
    start,
    questionNarrationStart,
    choicesStart,
    thinkingStart,
    timerHideAt,
    revealStart,
    rewardStart,
    transition,
    end,
  };
}

export function buildCandyArcadeQuestionTimeline(input: CandyArcadeQuestionTimelineInput): CandyArcadeQuestionTimelineResult {
  const {
    quiz,
    resolvedQuestions,
    events,
    duration,
    outroStart,
    mascot,
    mascotConfig,
    chosenStyleId,
    snapshot,
    styleContext,
    assets,
    aspectRatio,
    copy,
    fps,
    canvas,
    customTransitionInstances,
  } = input;

  const resolvedQuestionById = new Map(resolvedQuestions.map((item) => [item.question.id, item]));
  const clips: string[] = [];
  const transitionInstances: Record<string, ResolvedTransitionInstance> = {};

  let lastThinkingSlot: number | undefined;
  let lastCelebrateSlot: number | undefined;
  const episodeId = quiz.episode_id || "default_video";

  resolvedQuestions.forEach(({ question, questionIndex, beat, style, layoutResolution, visual }) => {
    const nextQuestion = quiz.questions[questionIndex + 1];
    const nextResolvedQuestion = nextQuestion ? resolvedQuestionById.get(nextQuestion.id) : undefined;
    const timing = computeQuestionTimingBounds(question.id, events, nextQuestion?.id, duration, outroStart);

    const questionMascot = adaptMascotForQuestion(mascot, chosenStyleId, questionIndex, {
      videoId: episodeId,
      questionId: question.id,
      previousSlotIndex: {
        thinking: lastThinkingSlot,
        celebrate: lastCelebrateSlot,
      },
      snapshot,
    });

    const effectiveStyleId = questionMascot?.active_style_id || chosenStyleId || "";
    const recordedThinking = findSnapshotEntry(snapshot, {
      videoId: episodeId,
      questionId: question.id,
      state: "thinking",
      styleId: effectiveStyleId,
    });
    lastThinkingSlot = recordedThinking?.slot_index;

    const recordedCelebrate = findSnapshotEntry(snapshot, {
      videoId: episodeId,
      questionId: question.id,
      state: "celebrate",
      styleId: effectiveStyleId,
    });
    lastCelebrateSlot = recordedCelebrate?.slot_index;

    if (timing.end - timing.start > 0.04) {
      clips.push(
        questionClip({
          start: timing.start,
          questionNarrationStart: timing.questionNarrationStart,
          choicesStart: timing.choicesStart,
          thinkingStart: timing.thinkingStart,
          timerHideAt: timing.timerHideAt,
          revealStart: timing.revealStart,
          rewardStart: timing.rewardStart,
          end: timing.end,
          question,
          archetype: beat.archetype,
          layoutResolution,
          questionIndex,
          count: quiz.questions.length,
          visual,
          copy,
          assets: assets ?? {},
          isFinal: questionIndex === quiz.questions.length - 1,
          mascot: questionMascot,
          mascotConfig,
          aspectRatio,
          mascotEvents: events.filter((event) => event.question_id === question.id),
          thinkingBarStyle: style.thinkingBarStyle,
          questionBoxStyle: style.questionBoxStyle,
          answerCardStyle: style.answerCardStyle,
          counterStyle: style.counterStyle,
          backgroundStyle: style.backgroundStyle,
          channelBrandName: style.channelBrandName,
          styleCatalogRevision: styleContext.styleCatalogRevision ?? undefined,
        }),
      );
    }

    if (timing.transition) {
      const nextPalette = nextResolvedQuestion?.visual.palette ?? visual.palette;
      const sceneTransition = resolveCandyArcadeSceneTransition({
        transition: timing.transition,
        questionId: question.id,
        visual,
        nextPalette,
        fps,
        canvas,
        customTransitionInstances,
      });

      transitionInstances[sceneTransition.boundaryId] = sceneTransition.instance;
      clips.push(sceneTransition.clip);
    }
  });

  return {
    clips,
    transitionInstances,
    snapshot,
  };
}
