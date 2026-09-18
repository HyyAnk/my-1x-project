import { MYSTERY_SUSPENSE_GAP_SECONDS, type DirectorBeat, type QuizQuestion, type VoicePlan } from "@studio/shared";
import { type TimelineContext, round } from "../timelineContext.js";

export interface ThinkingCountdownResult {
  timerHideAt: number;
  revealAt: number;
}

export function compileThinkingCountdownBeat(
  ctx: TimelineContext,
  question: QuizQuestion,
  beat: DirectorBeat,
  voicePlan: VoicePlan,
  choiceNarrationEnd: number,
): ThinkingCountdownResult {
  const policy = ctx.policy;
  const isSingleReveal = question.answer_mode === "single_reveal";
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

  if (isSingleReveal && countdownNarrationDuration > policy.countdown_seconds) {
    throw new Error(
      `COUNTDOWN_PACING_OVERFLOW: Countdown narration duration (${countdownNarrationDuration.toFixed(2)}s) exceeds countdown window (${policy.countdown_seconds}s) for Question ${question.number}`,
    );
  }

  const countdownNarrationEnd = round(countdownStart + countdownNarrationDuration);

  let timerHideAt: number;
  let revealAt: number;

  if (isSingleReveal) {
    timerHideAt = round(Math.max(thinkingStart + thinkingSeconds, countdownStart + policy.countdown_seconds, countdownNarrationEnd));
    revealAt = round(timerHideAt + MYSTERY_SUSPENSE_GAP_SECONDS);

    ctx.add({
      type: "timer.hide",
      at_seconds: timerHideAt,
      duration_seconds: 0,
      question_id: question.id,
      choice_id: null,
      segment_id: null,
      payload: {},
    });
  } else {
    revealAt = round(
      Math.max(
        thinkingStart + thinkingSeconds + policy.reveal_delay_seconds,
        countdownNarrationEnd + policy.narration_gap_seconds,
        countdownStart + policy.countdown_seconds + policy.reveal_delay_seconds,
      ),
    );
    timerHideAt = revealAt;
  }

  return { timerHideAt, revealAt };
}
