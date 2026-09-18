import type { DirectorBeat, QuizQuestion, VoicePlan } from "@studio/shared";
import { type TimelineContext, round } from "../timelineContext.js";

export interface QuestionEntranceResult {
  questionStart: number;
  questionNarrationEnd: number;
}

export function compileQuestionEntranceBeat(
  ctx: TimelineContext,
  question: QuizQuestion,
  beat: DirectorBeat,
  voicePlan: VoicePlan,
): QuestionEntranceResult {
  const policy = ctx.policy;
  const questionStart = ctx.cursor;

  ctx.add({
    type: "question.enter",
    at_seconds: questionStart,
    duration_seconds: policy.question_entrance_seconds,
    question_id: question.id,
    choice_id: null,
    segment_id: null,
    payload: { archetype: beat.archetype, energy: beat.energy },
  });

  ctx.add({
    type: "mascot.state",
    at_seconds: questionStart,
    duration_seconds: 0,
    question_id: question.id,
    choice_id: null,
    segment_id: null,
    payload: { state: "thinking", phase: "question_start" },
  });

  const questionSegment = voicePlan.segments.find((segment) => segment.segment_id === question.id + ":question");
  const questionNarrationAt = round(questionStart + policy.question_narration_lead_seconds);
  const questionNarrationDuration = questionSegment
    ? ctx.scheduleNarration(questionSegment.segment_id, questionNarrationAt, questionSegment.text, question.id)
    : 0;
  const questionNarrationEnd = round(questionNarrationAt + questionNarrationDuration);

  return { questionStart, questionNarrationEnd };
}
