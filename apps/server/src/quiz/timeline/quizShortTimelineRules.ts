import type { QuizIssue, QuizTimeline } from "@studio/shared";
import {
  QUIZ_SHORT_MAX_DURATION_SECONDS,
  QUIZ_SHORT_WARN_DURATION_SECONDS,
  isChoiceNarrationSegmentId,
} from "./quizShortTimelinePolicy.js";

function timelineIssue(
  code: string,
  severity: QuizIssue["severity"],
  message: string,
  nextAction: string,
  questionIds: string[] = [],
): QuizIssue {
  return { code, severity, message, next_action: nextAction, question_ids: questionIds, stage: "timeline" };
}

export function quizShortDurationIssues(durationSeconds: number): QuizIssue[] {
  if (durationSeconds > QUIZ_SHORT_MAX_DURATION_SECONDS)
    return [
      timelineIssue(
        "timeline_short_duration_exceeded",
        "blocker",
        `The Quiz Short runs ${durationSeconds.toFixed(1)}s, above the ${QUIZ_SHORT_MAX_DURATION_SECONDS}s hard limit.`,
        "Reduce the question count, shorten question text, or tighten the short timing policy.",
      ),
    ];
  if (durationSeconds > QUIZ_SHORT_WARN_DURATION_SECONDS)
    return [
      timelineIssue(
        "timeline_short_duration_long",
        "warning",
        `The Quiz Short runs ${durationSeconds.toFixed(1)}s, above the ${QUIZ_SHORT_WARN_DURATION_SECONDS}s comfort target.`,
        "Shorten question narration so the video lands between 45 and 60 seconds.",
      ),
    ];
  return [];
}

export function quizShortChoiceNarrationIssues(timeline: Pick<QuizTimeline, "events">): QuizIssue[] {
  const choiceNarration = timeline.events.filter(
    (event) => event.type === "narration.segment" && isChoiceNarrationSegmentId(event.segment_id),
  );
  if (!choiceNarration.length) return [];
  return [
    timelineIssue(
      "timeline_short_choice_narration",
      "blocker",
      "A Quiz Short timeline schedules choice narration: " + choiceNarration.map((event) => event.segment_id).join(", ") + ".",
      "Rebuild the voice plan with the short pacing profile so choices are never read aloud.",
      [...new Set(choiceNarration.flatMap((event) => (event.question_id ? [event.question_id] : [])))],
    ),
  ];
}

/** Quiz Short only: the duration budget and the no-choice-narration contract. */
export function quizShortTimelineIssues(timeline: Pick<QuizTimeline, "events" | "duration_seconds">): QuizIssue[] {
  return [...quizShortDurationIssues(timeline.duration_seconds), ...quizShortChoiceNarrationIssues(timeline)];
}
