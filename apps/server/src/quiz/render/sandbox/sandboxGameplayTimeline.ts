import {
  computeSandboxPhaseTimeline,
  getQuizGameplayArchetype,
  QuizConfigSchema,
  QuizV2Schema,
  resolveGameplayPolicy,
  type SandboxPhaseTimeline,
  type SandboxPreviewInput,
} from "@studio/shared";
import { createEpisodeDirectorPlan } from "../../director/episodeDirectorPlan.js";
import { buildQuizVoicePlan } from "../../audio/voicePlan.js";
import { compileQuizTimeline } from "../../timeline/compileTimeline.js";

/** Rehearsal uses the production compiler with estimated speech, not fixed phase timestamps. */
export function sandboxGameplayTimeline(input: SandboxPreviewInput): SandboxPhaseTimeline {
  if (input.layout_id === "baseline") return computeSandboxPhaseTimeline();
  const policy = resolveGameplayPolicy({
    layout_id: input.layout_id,
    gameplay_id: input.choices.length === 2 && input.layout_id !== "split_versus_two" ? "verdict_true_false" : undefined,
  });
  const blueprint = getQuizGameplayArchetype(policy.id)!;
  const choices = input.choices.map((text, index) => ({ id: `c${index}`, text }));
  const quiz = QuizV2Schema.parse({
    schema_version: 2,
    episode_id: "preview",
    age_band: "7-9",
    language: "en",
    questions: [
      {
        id: "q1",
        number: 1,
        gameplay_id: policy.id,
        format: blueprint.defaultFormat,
        answer_mode: policy.id === "mystery_reveal" ? "single_reveal" : "choice_selection",
        difficulty: 1,
        question: input.question_text,
        choices,
        correct_choice_id: choices[input.correct_choice_index]?.id,
        explanation: input.fact_card_text || "Answer explanation.",
      },
    ],
  });
  const director = createEpisodeDirectorPlan(quiz, QuizConfigSchema.parse({ target_layout: input.layout_id, archetype: policy.id }));
  const voice = buildQuizVoicePlan(quiz, { director, skipIntro: true, skipOutro: true });
  const timeline = compileQuizTimeline({ quiz, director, voicePlan: voice, introDuration: 0, outroDuration: 0 });
  const at = (type: string) => timeline.events.find((event) => event.type === type)?.at_seconds ?? 0;
  const reveal = at("answer.reveal");
  return {
    countdownSeconds: policy.countdown,
    questionStart: 0,
    choicesStart: at("choices.enter"),
    thinkingStart: at("countdown.start"),
    timerHideAt: policy.id === "mystery_reveal" ? at("timer.hide") : undefined,
    revealStart: reveal,
    rewardStart: at("reward.play"),
    explainStart: at("fact.enter") || at("reward.play"),
    totalDuration: timeline.duration_seconds,
  };
}
