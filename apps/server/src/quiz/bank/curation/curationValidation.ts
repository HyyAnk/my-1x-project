import type { BankGameplayArchetypeId, BankQuestionWithCooldown, TopicCandidate } from "@studio/shared";

export const LEGACY_PLACEHOLDER_EXPLANATION_SUFFIX = " is verified through scientific and historical evidence.";
export const LEGACY_PLACEHOLDER_QUESTION_PATTERN = /: (key question #\d+|core fact|challenge fact|climax fact)\?$/;
export const LEGACY_PLACEHOLDER_CHOICE_PATTERN = /^(.+ )?(Choice|Contender) [A-Z]$/;

export function resolveTargetArchetype(topic: TopicCandidate): BankGameplayArchetypeId | undefined {
  if (topic.archetype) {
    return topic.archetype;
  }
  if (topic.suggested_layout) {
    switch (topic.suggested_layout) {
      case "media_left_choices_right":
        return "deep_trivia";
      case "visual_choices_three_pure":
        return "visual_spotting";
      case "verdict_true_false":
        return "verdict_true_false";
      case "split_versus_two":
        return "versus_faceoff";
      case "visual_choices_three":
        return "visual_identification";
      case "full_stack_list":
        return "speed_blitz";
      case "mystery_reveal":
        return "mystery_reveal";
    }
  }
  if (topic.quiz_format === "true_false") {
    return "verdict_true_false";
  }
  if (topic.quiz_format === "odd_one_out") {
    return "visual_spotting";
  }
  return undefined;
}

/**
 * Detects questions produced by the retired deterministic JIT fallback, which
 * shipped template text ("Topic: key question #2?") into persisted banks.
 * Scoped to the legacy "JIT-" id prefix so real curated questions are unaffected.
 */
export function isLegacyPlaceholderBankQuestion(question: BankQuestionWithCooldown): boolean {
  if (!question.id.startsWith("JIT-")) {
    return false;
  }
  if (question.explanation.endsWith(LEGACY_PLACEHOLDER_EXPLANATION_SUFFIX)) {
    return true;
  }
  if (LEGACY_PLACEHOLDER_QUESTION_PATTERN.test(question.question)) {
    return true;
  }
  return question.choices.some((choice) => LEGACY_PLACEHOLDER_CHOICE_PATTERN.test(choice.text));
}

export function isValidBankQuestion(question: BankQuestionWithCooldown): boolean {
  const status = (question.status as string) ?? "approved";
  if (status === "archived" || status === "rejected") {
    return false;
  }
  if (isLegacyPlaceholderBankQuestion(question)) {
    return false;
  }
  if (status === "approved") {
    return true;
  }
  const semanticStatus = (question as { validation?: { semantic_status?: string } }).validation?.semantic_status;
  if (semanticStatus === "validated") {
    return true;
  }
  return status !== "rejected";
}
