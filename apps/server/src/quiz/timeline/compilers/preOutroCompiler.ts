import type { BridgeSceneConfig, VoicePlan } from "@studio/shared";
import { TimelineContext, round } from "./timelineContext.js";

export interface CompilePreOutroOptions {
  bridgeConfig?: BridgeSceneConfig;
  hasNextOutro?: boolean;
}

/**
 * Compiles the Pre-Outro celebration stage between the final quiz question and the outro video.
 * Features a high-energy celebratory screen with confetti, bubbles, "FANTASTIC JOB!" headline,
 * enthusiastic congratulatory voiceover, and a strict 0.5s pause after speech before transitioning to outro.
 */
export function compilePreOutroStage(
  ctx: TimelineContext,
  voicePlan: VoicePlan,
  options?: CompilePreOutroOptions,
): void {
  const preOutro = voicePlan.segments.find(
    (segment) => segment.role === "pre_outro" || segment.segment_id === "pre_outro",
  );
  if (!preOutro) return;

  const preOutroStart = ctx.cursor;
  const timing = options?.bridgeConfig?.timing;
  const pauseSeconds = timing?.preOutroPauseSeconds ?? 0.5;
  const transitionDuration = 0.5;

  // 1. Transition into Pre-Outro celebration scene
  ctx.add({
    type: "transition.start",
    at_seconds: preOutroStart,
    duration_seconds: transitionDuration,
    question_id: null,
    choice_id: null,
    segment_id: null,
    payload: {
      intent: "pre_outro",
      instance_id: "question_to_pre_outro",
      transition_id: "star_wipe",
    },
  });

  // 2. Schedule voiceover narration for pre_outro
  const narrationDuration = ctx.scheduleNarration(preOutro.segment_id, preOutroStart, preOutro.text, null);

  // Total scene duration: speech narration + 0.5s pause
  const totalSceneDuration = round(narrationDuration + pauseSeconds);

  // 3. Pre-Outro celebration scene event
  const headline = options?.bridgeConfig?.customPreOutroHeadline?.trim() || "FANTASTIC JOB!";
  ctx.add({
    type: "pre_outro.enter",
    at_seconds: preOutroStart,
    duration_seconds: totalSceneDuration,
    question_id: null,
    choice_id: null,
    segment_id: preOutro.segment_id,
    payload: {
      headline,
      speechText: preOutro.text,
      celebrationEffects: ["confetti", "bubbles", "sparkles"],
    },
  });

  // 4. Festive Sound Effects (SFX)
  ctx.add({
    type: "sfx.play",
    at_seconds: preOutroStart,
    duration_seconds: 0.8,
    question_id: null,
    choice_id: null,
    segment_id: preOutro.segment_id,
    payload: { sound: "correct_big", name: "party_popper", volume: 0.85 },
  });

  ctx.add({
    type: "sfx.play",
    at_seconds: round(preOutroStart + 0.6),
    duration_seconds: 0.4,
    question_id: null,
    choice_id: null,
    segment_id: preOutro.segment_id,
    payload: { sound: "ui_pop", name: "bubble_pop", volume: 0.7 },
  });

  if (options?.hasNextOutro) {
    const outroTransitionStart = round(preOutroStart + totalSceneDuration);
    const outroTransitionDuration =
      (options?.bridgeConfig?.timing as { preOutroTransitionSeconds?: number } | undefined)?.preOutroTransitionSeconds ??
      options?.bridgeConfig?.timing?.stingerDurationSeconds ??
      2.0;
    ctx.add({
      type: "transition.start",
      at_seconds: outroTransitionStart,
      duration_seconds: outroTransitionDuration,
      question_id: null,
      choice_id: null,
      segment_id: null,
      payload: {
        intent: "outro",
        instance_id: "pre_outro_to_outro",
        transition_id: "celebration_stinger",
      },
    });

    ctx.add({
      type: "sfx.play",
      at_seconds: outroTransitionStart,
      duration_seconds: outroTransitionDuration,
      question_id: null,
      choice_id: null,
      segment_id: null,
      payload: { sound: "transition_fast", name: "stinger_whoosh", volume: 0.8 },
    });

    ctx.cursor = outroTransitionStart;
  } else {
    ctx.cursor = round(preOutroStart + totalSceneDuration);
  }
}
