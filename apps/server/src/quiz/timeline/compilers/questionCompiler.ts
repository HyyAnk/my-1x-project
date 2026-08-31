import type { DirectorPlan, QuizQuestion, VoicePlan } from "@studio/shared";
import { TimelineContext, round } from "./timelineContext.js";

export function compileQuestionBlock(
  ctx: TimelineContext,
  question: QuizQuestion,
  questionIndex: number,
  director: DirectorPlan,
  voicePlan: VoicePlan,
): void {
  const policy = ctx.policy;
  const beat = director.beats.find((candidate) => candidate.question_id === question.id);
  if (!beat) throw new Error("Question " + question.id + " has no Director beat");

  const midpoint = voicePlan.segments.find((segment) => segment.role === "midpoint" && segment.question_id === question.id);
  if (midpoint) {
    ctx.add({
      type: "mascot.state",
      at_seconds: ctx.cursor,
      duration_seconds: 0,
      question_id: question.id,
      choice_id: null,
      segment_id: null,
      payload: { state: "encourage", interlude: "midpoint" },
    });
    ctx.cursor += ctx.scheduleNarration(midpoint.segment_id, ctx.cursor, midpoint.text, question.id);
    ctx.cursor = round(ctx.cursor + policy.transition_seconds);
  }

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

  const thinkingStart = round(choiceNarrationEnd + policy.thinking_settle_seconds);
  const thinkingSegment = voicePlan.segments.find((segment) => segment.segment_id === question.id + ":thinking");
  const thinkingNarrationDuration = thinkingSegment
    ? ctx.scheduleNarration(thinkingSegment.segment_id, thinkingStart, thinkingSegment.text, question.id)
    : 0;
  const thinkingNarrationEnd = round(thinkingStart + thinkingNarrationDuration);
  const earliestCountdownStart = round(thinkingNarrationEnd + policy.post_prompt_thinking_seconds);
  const minRequiredThinkingSeconds = round(earliestCountdownStart + policy.countdown_seconds - thinkingStart);
  const thinkingSeconds = round(
    Math.min(policy.maximum_thinking_seconds, Math.max(policy.minimum_thinking_seconds, beat.thinking_seconds, minRequiredThinkingSeconds)),
  );

  ctx.add({
    type: "countdown.start",
    at_seconds: thinkingStart,
    duration_seconds: thinkingSeconds,
    question_id: question.id,
    choice_id: null,
    segment_id: null,
    payload: { seconds: thinkingSeconds },
  });
  ctx.add({
    type: "mascot.state",
    at_seconds: thinkingStart,
    duration_seconds: 0,
    question_id: question.id,
    choice_id: null,
    segment_id: null,
    payload: { state: "thinking", phase: "thinking_start" },
  });

  const countdownStart = round(Math.max(thinkingStart + thinkingSeconds - policy.countdown_seconds, earliestCountdownStart));
  const thinkingPulseAt = round(thinkingStart + Math.max(1.4, (countdownStart - thinkingStart) / 2));
  if (thinkingPulseAt < countdownStart - 0.18) {
    ctx.add({
      type: "mascot.state",
      at_seconds: thinkingPulseAt,
      duration_seconds: 0,
      question_id: question.id,
      choice_id: null,
      segment_id: null,
      payload: { state: "thinking", phase: "thinking_pulse" },
    });
  }

  for (let tick = 0; tick < policy.countdown_seconds; tick += 1) {
    ctx.add({
      type: "countdown.tick",
      at_seconds: round(countdownStart + tick),
      duration_seconds: 0,
      question_id: question.id,
      choice_id: null,
      segment_id: null,
      payload: { value: policy.countdown_seconds - tick },
    });
  }

  const countdownSegment = voicePlan.segments.find((segment) => segment.segment_id === question.id + ":countdown");
  const countdownNarrationDuration = countdownSegment
    ? ctx.scheduleNarration(countdownSegment.segment_id, countdownStart, countdownSegment.text, question.id)
    : 0;
  const countdownNarrationEnd = round(countdownStart + countdownNarrationDuration);
  const revealAt = round(
    Math.max(
      thinkingStart + thinkingSeconds + policy.reveal_delay_seconds,
      countdownNarrationEnd + policy.narration_gap_seconds,
      countdownStart + policy.countdown_seconds + policy.reveal_delay_seconds,
    ),
  );

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

  const revealSegment = voicePlan.segments.find((segment) => segment.segment_id === question.id + ":reveal");
  let revealNarrationEnd = revealAt + policy.reveal_seconds;
  if (revealSegment) {
    const revealNarrationAt = round(revealAt + policy.reveal_voice_lead_seconds);
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

  const explanationSegment = voicePlan.segments.find((segment) => segment.segment_id === question.id + ":explanation");
  let postReveal = Math.max(
    revealNarrationEnd + policy.reveal_hold_seconds,
    rewardAt + policy.reward_seconds[beat.reward_intensity] + policy.explanation_lead_seconds,
  );
  if (explanationSegment) {
    const explanationAt = postReveal;
    const explanationDuration = ctx.scheduleNarration(explanationSegment.segment_id, explanationAt, explanationSegment.text, question.id);
    ctx.add({
      type: "mascot.state",
      at_seconds: explanationAt,
      duration_seconds: 0,
      question_id: question.id,
      choice_id: null,
      segment_id: null,
      payload: { state: "celebrate", phase: "explanation_start" },
    });
    postReveal = explanationAt + explanationDuration;
  }
  postReveal = round(postReveal + policy.explanation_hold_seconds);

  const factSegment = voicePlan.segments.find((segment) => segment.segment_id === question.id + ":fact");
  if (factSegment) {
    const factAt = postReveal;
    const factDuration = ctx.scheduleNarration(factSegment.segment_id, factAt, factSegment.text, question.id);
    ctx.add({
      type: "fact.enter",
      at_seconds: factAt,
      duration_seconds: factDuration,
      question_id: question.id,
      choice_id: null,
      segment_id: factSegment.segment_id,
      payload: {},
    });
    ctx.add({
      type: "mascot.state",
      at_seconds: factAt,
      duration_seconds: 0,
      question_id: question.id,
      choice_id: null,
      segment_id: null,
      payload: { state: "celebrate", phase: "fact_start" },
    });
    postReveal = round(factAt + factDuration + policy.fact_hold_seconds);
  }

  ctx.add({
    type: "sfx.play",
    at_seconds: rewardAt,
    duration_seconds: 0,
    question_id: question.id,
    choice_id: null,
    segment_id: null,
    payload: { intents: beat.sfx_intents },
  });
  ctx.add({
    type: "transition.start",
    at_seconds: postReveal,
    duration_seconds: policy.transition_seconds,
    question_id: question.id,
    choice_id: null,
    segment_id: null,
    payload: { intent: beat.transition_intent },
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
