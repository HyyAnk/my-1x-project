import type { QuizIssue, QuizTimeline, QuizV2 } from "@studio/shared";
import { validateQuizTimeline } from "../../timeline/validateTimeline.js";

export interface AssessTimelineQaInput {
  quiz: QuizV2;
  timeline?: QuizTimeline | null;
  staticIntervalThresholdSeconds?: number;
}

export function questionCycleRangeSeconds(ageBand: QuizV2["age_band"]): [number, number] {
  const ranges: Record<QuizV2["age_band"], [number, number]> = {
    "4-6": [15, 22],
    "7-9": [14, 20],
    "10-12": [13, 19],
    family: [14, 20],
  };
  return ranges[ageBand];
}

export function assessTimelineQa(input: AssessTimelineQaInput): QuizIssue[] {
  const issues: QuizIssue[] = [];
  const { quiz, timeline, staticIntervalThresholdSeconds } = input;
  if (!timeline) return issues;

  // 1. Timeline event consistency validation
  validateQuizTimeline(quiz, timeline).forEach((issue) => issues.push(issue));

  // 2. Question cycle duration validation
  const [minimumCycle, maximumCycle] = questionCycleRangeSeconds(quiz.age_band);
  const starts = quiz.questions
    .map((question) => timeline.events.find((event) => event.type === "question.enter" && event.question_id === question.id)?.at_seconds)
    .filter((start): start is number => start !== undefined);

  const rushed = quiz.questions.flatMap((question, index) => {
    const start = starts[index];
    const nextStart = starts[index + 1];
    const transition = timeline.events.find((event) => event.type === "transition.start" && event.question_id === question.id);
    const end = nextStart ?? (transition ? transition.at_seconds + transition.duration_seconds : timeline.duration_seconds);
    return typeof start === "number" && (end - start < minimumCycle || end - start > maximumCycle) ? [question] : [];
  });

  if (rushed.length) {
    issues.push({
      code: "pacing_question_cycle_outside_target",
      severity: "warning",
      message: `${rushed.length} question cycle${rushed.length === 1 ? " is" : "s are"} outside the ${minimumCycle}–${maximumCycle}s target for ${quiz.age_band}.`,
      next_action: "Adjust narration overlap, thinking, reveal, or explanation duration before rendering.",
      question_ids: rushed.map((question) => question.id),
      stage: "timeline",
    });
  }

  // 3. Static visual interval detection
  const threshold = staticIntervalThresholdSeconds ?? 2.5;
  const activeVisualIntervals = timeline.events
    .filter(
      (event) =>
        [
          "background.motion",
          "question.enter",
          "choices.enter",
          "countdown.start",
          "answer.reveal",
          "reward.play",
          "fact.enter",
          "transition.start",
        ].includes(event.type) && event.duration_seconds > 0,
    )
    .map((event) => ({ start: event.at_seconds, end: event.at_seconds + event.duration_seconds, questionId: event.question_id }))
    .sort((left, right) => left.start - right.start);

  let coveredThrough = 0;
  for (const interval of activeVisualIntervals) {
    if (interval.start - coveredThrough > threshold) {
      issues.push({
        code: "visual_static_interval",
        severity: "warning",
        message: "The gameplay timeline contains a " + (interval.start - coveredThrough).toFixed(1) + "s visually static interval.",
        next_action: "Add a meaningful visual beat or confirm that the pause is intentional.",
        question_ids: interval.questionId ? [interval.questionId] : [],
        stage: "layout",
      });
      break;
    }
    coveredThrough = Math.max(coveredThrough, interval.end);
  }

  return issues;
}
