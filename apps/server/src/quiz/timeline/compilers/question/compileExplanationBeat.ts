import type { DirectorBeat, QuizQuestion, VoicePlan } from "@studio/shared";
import { type TimelineContext, round } from "../timelineContext.js";

function scheduleFactOrExplanation(
  ctx: TimelineContext,
  question: QuizQuestion,
  segmentId: string,
  text: string,
  at: number,
  mascotState: "point" | "celebrate",
  phase: string,
): number {
  const duration = ctx.scheduleNarration(segmentId, at, text, question.id);
  if (question.answer_mode !== "single_reveal") {
    ctx.add({
      type: "fact.enter",
      at_seconds: at,
      duration_seconds: duration,
      question_id: question.id,
      choice_id: null,
      segment_id: segmentId,
      payload: {},
    });
  }
  ctx.add({
    type: "mascot.state",
    at_seconds: at,
    duration_seconds: 0,
    question_id: question.id,
    choice_id: null,
    segment_id: null,
    payload: { state: mascotState, phase },
  });
  return duration;
}

export function compileExplanationBeat(
  ctx: TimelineContext,
  question: QuizQuestion,
  beat: DirectorBeat,
  voicePlan: VoicePlan,
  questionStart: number,
  rewardAt: number,
  revealNarrationEnd: number,
): void {
  const policy = ctx.policy;
  let postReveal = Math.max(
    revealNarrationEnd + policy.reveal_hold_seconds,
    rewardAt + policy.reward_seconds[beat.reward_intensity] + policy.explanation_lead_seconds,
  );

  const explanationSegment = voicePlan.segments.find((segment) => segment.segment_id === question.id + ":explanation");
  if (explanationSegment) {
    const duration = scheduleFactOrExplanation(
      ctx,
      question,
      explanationSegment.segment_id,
      explanationSegment.text,
      postReveal,
      "point",
      "explanation_start",
    );
    postReveal = postReveal + duration;
  }
  postReveal = round(postReveal + policy.explanation_hold_seconds);

  const factSegment = voicePlan.segments.find((segment) => segment.segment_id === question.id + ":fact");
  if (factSegment) {
    const duration = scheduleFactOrExplanation(
      ctx,
      question,
      factSegment.segment_id,
      factSegment.text,
      postReveal,
      "celebrate",
      "fact_start",
    );
    postReveal = round(postReveal + duration + policy.fact_hold_seconds);
  }

  ctx.add({
    type: "transition.start",
    at_seconds: postReveal,
    duration_seconds: policy.transition_seconds,
    question_id: question.id,
    choice_id: null,
    segment_id: null,
    payload: {
      intent: beat.transition_intent,
      transition_id: beat.transition_id,
      instance_id: question.id,
    },
  });

  ctx.add({
    type: "background.motion",
    at_seconds: questionStart,
    duration_seconds: round(postReveal - questionStart),
    question_id: question.id,
    choice_id: null,
    segment_id: null,
    payload: { layers: ["sunburst", "pattern", "ambient_shapes", "hero_float"] },
  });

  ctx.cursor = round(postReveal + Math.max(0.05, policy.transition_seconds - policy.transition_overlap_seconds));
}
