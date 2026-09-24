import type { QuizAgeBand, QuizLayoutId, QuizQuestionFormat } from "./enums.js";
import type { QuizGameplayArchetypeId } from "./quizArchetypes.js";
import { timingPolicyForAgeBand, type QuizTimingPolicy } from "./timing.js";

export const QUIZ_GAMEPLAY_POLICY_VERSION = 1;
export type GameplayPolicy = {
  id: QuizGameplayArchetypeId;
  choiceCount: number;
  readChoices: boolean;
  thinkingPrompt: boolean;
  thinking: readonly [number, number];
  countdown: number;
  cycle: readonly [number, number];
};

export const QUIZ_GAMEPLAY_POLICIES = {
  deep_trivia: {
    id: "deep_trivia",
    choiceCount: 3,
    readChoices: true,
    thinkingPrompt: true,
    thinking: [6, 9],
    countdown: 3,
    cycle: [14, 30],
  },
  visual_identification: {
    id: "visual_identification",
    choiceCount: 3,
    readChoices: true,
    thinkingPrompt: true,
    thinking: [5, 8],
    countdown: 3,
    cycle: [13, 28],
  },
  visual_spotting: {
    id: "visual_spotting",
    choiceCount: 3,
    readChoices: false,
    thinkingPrompt: true,
    thinking: [7, 10],
    countdown: 3,
    cycle: [13, 28],
  },
  verdict_true_false: {
    id: "verdict_true_false",
    choiceCount: 2,
    readChoices: false,
    thinkingPrompt: false,
    thinking: [4, 6],
    countdown: 3,
    cycle: [10, 23],
  },
  verdict_fact_myth: {
    id: "verdict_fact_myth",
    choiceCount: 2,
    readChoices: false,
    thinkingPrompt: false,
    thinking: [4, 6],
    countdown: 3,
    cycle: [10, 23],
  },
  versus_faceoff: {
    id: "versus_faceoff",
    choiceCount: 2,
    readChoices: true,
    thinkingPrompt: false,
    thinking: [4, 7],
    countdown: 3,
    cycle: [12, 26],
  },
  speed_blitz: {
    id: "speed_blitz",
    choiceCount: 3,
    readChoices: false,
    thinkingPrompt: false,
    thinking: [3, 5],
    countdown: 3,
    cycle: [7, 18],
  },
  mystery_reveal: {
    id: "mystery_reveal",
    choiceCount: 1,
    readChoices: false,
    thinkingPrompt: true,
    thinking: [6, 8],
    countdown: 3,
    cycle: [13, 28],
  },
} as const satisfies Record<QuizGameplayArchetypeId, GameplayPolicy>;

const LAYOUT_GAMEPLAY: Partial<Record<QuizLayoutId, QuizGameplayArchetypeId>> = {
  media_left_choices_right: "deep_trivia",
  visual_choices_three: "visual_identification",
  visual_choices_three_pure: "visual_spotting",
  verdict_true_false: "verdict_true_false",
  split_versus_two: "versus_faceoff",
  full_stack_list: "speed_blitz",
  mystery_reveal: "mystery_reveal",
};

export function resolveGameplayPolicy(input: {
  gameplay_id?: QuizGameplayArchetypeId;
  layout_id?: QuizLayoutId;
  format?: QuizQuestionFormat;
  answer_mode?: string;
}): GameplayPolicy {
  const id =
    input.gameplay_id ??
    (input.layout_id && LAYOUT_GAMEPLAY[input.layout_id]) ??
    (input.answer_mode === "single_reveal"
      ? "mystery_reveal"
      : input.format === "odd_one_out"
        ? "visual_spotting"
        : input.format === "true_false"
          ? "verdict_true_false"
          : "deep_trivia");
  return QUIZ_GAMEPLAY_POLICIES[id];
}

export function gameplayTimingPolicy(policy: GameplayPolicy, ageBand: QuizAgeBand, difficulty = 1): QuizTimingPolicy {
  const base = timingPolicyForAgeBand(ageBand);
  const ageBuffer = ageBand === "4-6" ? 2 : ageBand === "7-9" ? 1 : ageBand === "family" ? 0.5 : 0;
  const minimum = policy.thinking[0] + ageBuffer;
  const maximum = policy.thinking[1] + ageBuffer;
  const speed = policy.id === "speed_blitz";
  return {
    ...base,
    minimum_thinking_seconds: Math.min(maximum, minimum + Math.max(0, difficulty - 1) * 0.25),
    maximum_thinking_seconds: maximum,
    countdown_seconds: policy.countdown,
    question_narration_lead_seconds: speed ? 0.35 : 0.8,
    choice_stagger_seconds: policy.id === "versus_faceoff" || policy.id === "visual_spotting" ? 0 : base.choice_stagger_seconds,
    question_to_choices_pause_seconds: 0.25,
    post_prompt_thinking_seconds: speed ? 0 : 0.5,
    explanation_hold_seconds: speed ? 0.5 : 1.2,
    transition_seconds: speed ? 0.35 : base.transition_seconds,
  };
}
