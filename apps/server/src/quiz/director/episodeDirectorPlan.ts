import {
  getQuizGameplayArchetype,
  getQuizLayoutCapability,
  type DirectorBeat,
  type DirectorPlan,
  type QuizConfig,
  type QuizV2,
  QUIZ_GAMEPLAY_POLICY_VERSION,
  resolveGameplayPolicy,
} from "@studio/shared";
import { createDefaultDirectorPlan } from "./parseDirectorPlan.js";
import { assertDirectorPlanValid } from "./validateDirectorPlan.js";
import { applyGameplayDirectorPolicy } from "./gameplayDirectorPolicy.js";

/** Preserve the episode's gameplay contract, including its final question. */
export function createEpisodeDirectorPlan(quiz: QuizV2, config: QuizConfig): DirectorPlan {
  const base = createDefaultDirectorPlan(quiz);
  const requestedLayout = resolveEpisodeLayout(config);
  if (!requestedLayout)
    return assertDirectorPlanValid(quiz, {
      ...base,
      gameplay_policy_version: QUIZ_GAMEPLAY_POLICY_VERSION,
      beats: base.beats.map((beat) => applyGameplayDirectorPolicy(quiz, beat)),
    });

  const capability = getQuizLayoutCapability(requestedLayout);
  const visualChoices = capability.supportedPresentations.includes("visual") && capability.media.supported.includes("choice");
  const archetype: DirectorBeat["archetype"] =
    requestedLayout === "mystery_reveal"
      ? "mystery_reveal"
      : requestedLayout === "verdict_true_false"
        ? "true_false"
        : visualChoices
          ? "visual_multiple_choice"
          : config.archetype === "speed_blitz"
            ? "speed_round"
            : "text_multiple_choice";
  const assetIntents: DirectorBeat["asset_intents"] =
    requestedLayout === "mystery_reveal"
      ? ["question_illustration", "answer_reveal"]
      : visualChoices
        ? ["choice_illustration"]
        : capability.media.supported.includes("question")
          ? ["question_illustration"]
          : [];

  return assertDirectorPlanValid(quiz, {
    ...base,
    gameplay_policy_version: QUIZ_GAMEPLAY_POLICY_VERSION,
    beats: base.beats.map((beat) =>
      applyGameplayDirectorPolicy(quiz, {
        ...beat,
        archetype,
        layout_id: requestedLayout,
        asset_intents: assetIntents,
      }),
    ),
  });
}

function resolveEpisodeLayout(config: QuizConfig) {
  return config.target_layout && config.target_layout !== "auto"
    ? config.target_layout
    : getQuizGameplayArchetype(config.archetype ?? "")?.targetLayout;
}

export function matchesEpisodeLayout(plan: DirectorPlan, config: QuizConfig): boolean {
  const expected = resolveEpisodeLayout(config);
  if (!expected && !plan.gameplay_policy_version) return true;
  return (
    plan.gameplay_policy_version === QUIZ_GAMEPLAY_POLICY_VERSION &&
    (!expected ||
      (plan.beats.length > 0 &&
        plan.beats.every((beat) => {
          if (beat.layout_id !== expected || !beat.gameplay_id) return false;
          const policy = resolveGameplayPolicy({ layout_id: expected });
          const compatibleBinary =
            beat.gameplay_id === "verdict_true_false" && ["media_left_choices_right", "full_stack_list"].includes(expected);
          if (beat.gameplay_id !== policy.id && !compatibleBinary) return false;
          const media = getQuizLayoutCapability(expected).media;
          return media.required.every((kind) =>
            beat.asset_intents.includes(kind === "choice" ? "choice_illustration" : "question_illustration"),
          );
        })))
  );
}
