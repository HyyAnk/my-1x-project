import type { DirectorBeat, QuizQuestion, VoicePlan } from "@studio/shared";
import { type TimelineContext, round } from "../timelineContext.js";

export interface AnswerRevealResult {
  rewardAt: number;
  revealNarrationEnd: number;
}

export function compileAnswerRevealBeat(
  ctx: TimelineContext,
  question: QuizQuestion,
  beat: DirectorBeat,
  voicePlan: VoicePlan,
  revealAt: number,
): AnswerRevealResult {
  const policy = ctx.policy;
  const correctChoice = question.choices.find((choice) => choice.id === question.correct_choice_id);

  ctx.add({
    type: "answer.reveal",
    at_seconds: revealAt,
    duration_seconds: policy.reveal_seconds,
    question_id: question.id,
    choice_id: question.correct_choice_id,
    segment_id: null,
    payload: { canonical_choice_id: question.correct_choice_id, answer_text: correctChoice?.text ?? "" },
  });

  ctx.add({
    type: "mascot.state",
    at_seconds: revealAt,
    duration_seconds: 0,
    question_id: question.id,
    choice_id: null,
    segment_id: null,
    payload: { state: "celebrate", phase: "answer_reveal" },
  });

  if (question.answer_mode !== "single_reveal") {
    ctx.add({
      type: "answer.dim_wrong",
      at_seconds: revealAt,
      duration_seconds: policy.reveal_seconds,
      question_id: question.id,
      choice_id: null,
      segment_id: null,
      payload: {
        wrong_choice_ids: question.choices.filter((choice) => choice.id !== question.correct_choice_id).map((choice) => choice.id),
      },
    });
  }

  const revealSegment = voicePlan.segments.find((segment) => segment.segment_id === question.id + ":reveal");
  let revealNarrationEnd = revealAt + policy.reveal_seconds;
  if (revealSegment) {
    const revealNarrationAt = Math.max(revealAt, round(revealAt + policy.reveal_voice_lead_seconds));
    revealNarrationEnd =
      revealNarrationAt + ctx.scheduleNarration(revealSegment.segment_id, revealNarrationAt, revealSegment.text, question.id);
  }

  const rewardAt = round(revealAt + policy.reveal_seconds);
  ctx.add({
    type: "reward.play",
    at_seconds: rewardAt,
    duration_seconds: policy.reward_seconds[beat.reward_intensity],
    question_id: question.id,
    choice_id: question.correct_choice_id,
    segment_id: null,
    payload: { intensity: beat.reward_intensity },
  });

  ctx.add({
    type: "mascot.state",
    at_seconds: rewardAt,
    duration_seconds: 0,
    question_id: question.id,
    choice_id: null,
    segment_id: null,
    payload: { state: "celebrate", phase: "reward_play" },
  });

  ctx.add({
    type: "sfx.play",
    at_seconds: rewardAt,
    duration_seconds: 0,
    question_id: question.id,
    choice_id: null,
    segment_id: null,
    payload: { intents: beat.sfx_intents },
  });

  return { rewardAt, revealNarrationEnd };
}
