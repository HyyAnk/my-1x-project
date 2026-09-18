import type { QuizQuestion, VoicePlan } from "@studio/shared";
import { type TimelineContext, round } from "../timelineContext.js";

export interface ChoicesBeatResult {
  choiceNarrationEnd: number;
}

export function compileChoicesBeat(
  ctx: TimelineContext,
  question: QuizQuestion,
  questionIndex: number,
  voicePlan: VoicePlan,
  questionStart: number,
  questionNarrationEnd: number,
): ChoicesBeatResult {
  if (question.answer_mode === "single_reveal") {
    return { choiceNarrationEnd: questionNarrationEnd };
  }

  const policy = ctx.policy;
  const incomingTransitionClearance = questionIndex > 0 ? policy.transition_overlap_seconds + 0.05 : 0;
  const choicesStart = round(questionStart + Math.max(policy.choices_enter_delay_seconds, incomingTransitionClearance));

  ctx.add({
    type: "choices.enter",
    at_seconds: choicesStart,
    duration_seconds: policy.choice_entrance_seconds + Math.max(0, question.choices.length - 1) * policy.choice_stagger_seconds,
    question_id: question.id,
    choice_id: null,
    segment_id: null,
    payload: { choice_ids: question.choices.map((choice) => choice.id) },
  });

  const choiceSegment = voicePlan.segments.find((segment) => segment.segment_id === question.id + ":choice");
  let choiceNarrationEnd = round(choicesStart + policy.choice_settle_seconds);

  if (choiceSegment) {
    const choiceAt = round(
      Math.max(choicesStart + policy.choice_settle_seconds, questionNarrationEnd + policy.question_to_choices_pause_seconds),
    );
    const choiceDuration = ctx.scheduleNarration(choiceSegment.segment_id, choiceAt, choiceSegment.text, question.id);
    if (choiceDuration >= 4) {
      ctx.add({
        type: "mascot.state",
        at_seconds: round(choiceAt + choiceDuration / 2),
        duration_seconds: 0,
        question_id: question.id,
        choice_id: null,
        segment_id: null,
        payload: { state: "thinking", phase: "choices_pulse" },
      });
    }
    choiceNarrationEnd = round(choiceAt + choiceDuration);
  }

  return { choiceNarrationEnd };
}
