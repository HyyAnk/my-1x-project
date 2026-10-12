import type { QuizShortTitleCanvas, QuizTimeline, QuizTimelineEvent, ResolvedTransitionInstance } from "@studio/shared";
import { QUIZ_SHORT_STAGE_SEGMENT_IDS, SCORE_CTA_DURATION_SECONDS } from "../../../timeline/quizShortTimelinePolicy.js";
import { DEFAULT_KICKOFF_DURATION_SECONDS, kickoffClip } from "../kickoffClip.js";
import type { Copy } from "../quizCopy.js";
import { shortIntroClip } from "./shortIntroClip.js";

/** Uploaded Short Intro & Outro media copied into the render root, as the composition references it. */
export type QuizShortBookendRenderMedia = {
  introVideoPath: string;
  introLoopDurationSeconds: number;
  outroVideoPath: string;
  outroHasAudio: boolean;
  titleCanvas: QuizShortTitleCanvas;
  transitionType: string;
  transitionDurationSeconds: number;
};

export type QuizShortStageEvents = {
  kickoff?: QuizTimelineEvent;
  shortIntro?: QuizTimelineEvent;
  scoreCta?: QuizTimelineEvent;
  shortOutro?: QuizTimelineEvent;
  firstQuestionStart: number;
};

type Palette = { backgroundPrimary: string; backgroundSecondary: string; accent: string; text?: string };

function findStageEvent(events: QuizTimeline["events"], segmentId: string): QuizTimelineEvent | undefined {
  return events.find((event) => event.type === "background.motion" && event.segment_id === segmentId);
}

/** Locates the opening and closing stages the Quiz Short timeline compiler emits. */
export function resolveQuizShortStageEvents(timeline: QuizTimeline, firstQuestionId: string | undefined): QuizShortStageEvents {
  const firstQuestionStart = firstQuestionId
    ? (timeline.events.find((event) => event.question_id === firstQuestionId && event.type === "question.enter")?.at_seconds ?? 0)
    : 0;
  return {
    kickoff: findStageEvent(timeline.events, QUIZ_SHORT_STAGE_SEGMENT_IDS.kickoff),
    shortIntro: findStageEvent(timeline.events, QUIZ_SHORT_STAGE_SEGMENT_IDS.shortIntro),
    scoreCta: findStageEvent(timeline.events, QUIZ_SHORT_STAGE_SEGMENT_IDS.scoreCta),
    shortOutro: findStageEvent(timeline.events, QUIZ_SHORT_STAGE_SEGMENT_IDS.shortOutro),
    firstQuestionStart,
  };
}

export type QuizShortOpeningInput = {
  stages: QuizShortStageEvents;
  media?: QuizShortBookendRenderMedia;
  questionCount: number;
  copy: Copy;
  palette?: Palette;
  fps: number;
  canvas: { width: number; height: number };
  transitionInstances?: Record<string, ResolvedTransitionInstance>;
};

export type QuizShortOpening = {
  clips: string[];
  /** Where the opening hands over to the first question. */
  end: number;
  start: number;
  transitionInstances: Record<string, ResolvedTransitionInstance>;
};

function payloadNumber(event: QuizTimelineEvent, key: string, fallback: number): number {
  const value = event.payload?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/** The Short intro with the spoken title when one is pinned, otherwise the kickoff card. */
export function buildQuizShortOpening(input: QuizShortOpeningInput): QuizShortOpening {
  const { stages, media } = input;
  if (stages.shortIntro && media) {
    const event = stages.shortIntro;
    const intro = shortIntroClip({
      videoPath: media.introVideoPath,
      loopDurationSeconds: media.introLoopDurationSeconds,
      start: event.at_seconds,
      duration: event.duration_seconds,
      title: typeof event.payload?.title === "string" ? event.payload.title : "",
      voiceStartSeconds: payloadNumber(event, "voice_start_seconds", event.at_seconds),
      voiceDurationSeconds: payloadNumber(event, "voice_duration_seconds", event.duration_seconds),
      copy: input.copy,
      titleCanvas: media.titleCanvas,
      transitionType: media.transitionType,
      transitionDurationSeconds: media.transitionDurationSeconds,
      transitionInstances: input.transitionInstances,
      fps: input.fps,
      canvas: input.canvas,
      palette: input.palette ? { accent: input.palette.accent, backgroundPrimary: input.palette.backgroundPrimary } : undefined,
    });
    return {
      clips: [intro.clip],
      start: event.at_seconds,
      end: event.at_seconds + event.duration_seconds,
      transitionInstances: intro.transitionInstance ? { [intro.transitionInstance.id]: intro.transitionInstance.instance } : {},
    };
  }
  const start = stages.kickoff?.at_seconds ?? 0;
  const end = stages.kickoff ? stages.kickoff.at_seconds + stages.kickoff.duration_seconds : stages.firstQuestionStart;
  const duration = stages.kickoff?.duration_seconds ?? Math.min(DEFAULT_KICKOFF_DURATION_SECONDS, stages.firstQuestionStart);
  const clips =
    duration > 0.04 ? [kickoffClip({ start, duration, questionCount: input.questionCount, copy: input.copy, palette: input.palette })] : [];
  return { clips, start, end, transitionInstances: {} };
}

/** Start of the closing stage: the Short outro, the score CTA, or the last seconds of the video. */
export function resolveQuizShortClosingStart(stages: QuizShortStageEvents, openingEnd: number, duration: number): number {
  return stages.shortOutro?.at_seconds ?? stages.scoreCta?.at_seconds ?? Math.max(openingEnd, duration - SCORE_CTA_DURATION_SECONDS);
}
