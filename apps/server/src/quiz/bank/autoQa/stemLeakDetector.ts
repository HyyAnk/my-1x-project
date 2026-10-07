import type { BankQuestion } from "@studio/shared";
import type { AutoQaIssue } from "./autoQa.types.js";

const EXCLUDED_BOOLEAN_CHOICES = new Set(["yes", "no", "true", "false"]);

/**
 * Strips leading articles ("the", "a", "an"), possessives, and normalizes spacing.
 */
export function normalizeEntityText(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/^(?:the|a|an)\s+/i, "")
    .replace(/['’]s\b/gi, "")
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Escapes regex special characters.
 */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Detects whether the correct answer is leaked inside the question stem.
 * Specifically checks for:
 * 1. Eponymous Franchise Leaks: "In <Franchise>, who is <Franchise>?"
 * 2. Word-boundary exact/stem leak: The correct choice text appears verbatim in the question.
 */
export function detectStemAnswerLeak(question: BankQuestion): AutoQaIssue | null {
  if (!question.question || !question.choices || !question.correct_choice_id) {
    return null;
  }

  // Skip boolean / binary verdict formats and versus faceoff (which inherently compares named contenders)
  if (
    question.archetype_id === "verdict_yes_no" ||
    question.archetype_id === "verdict_true_false" ||
    question.archetype_id === "versus_faceoff"
  ) {
    return null;
  }

  const correctChoice = question.choices.find((c) => c.id === question.correct_choice_id);
  if (!correctChoice || !correctChoice.text) {
    return null;
  }

  const rawChoiceText = correctChoice.text.trim();
  const normalizedChoice = normalizeEntityText(rawChoiceText);

  // If the normalized choice is a boolean word or too short to be an entity (< 3 chars), skip
  if (EXCLUDED_BOOLEAN_CHOICES.has(normalizedChoice) || normalizedChoice.length < 3) {
    return null;
  }

  const rawQuestion = question.question.trim();
  const normalizedQuestion = normalizeEntityText(rawQuestion);

  // 1. Eponymous prefix check: Extract "In <Title>, ..." or "From <Title>, ..."
  const prefixMatch = rawQuestion.match(/^(?:In|From|According to|Within)\s+([^,:]+)[,:]/i);
  if (prefixMatch) {
    const rawPrefix = prefixMatch[1].trim();
    const normalizedPrefix = normalizeEntityText(rawPrefix);

    if (
      normalizedPrefix === normalizedChoice ||
      (normalizedPrefix.length >= 4 && normalizedPrefix.includes(normalizedChoice)) ||
      (normalizedChoice.length >= 4 && normalizedChoice.includes(normalizedPrefix))
    ) {
      return {
        type: "quality",
        message: `Stem-Option Leakage: Correct choice "${rawChoiceText}" matches eponymous franchise title "${rawPrefix}" in the question stem.`,
        details: {
          leakType: "eponymous_franchise_leak",
          franchiseTitle: rawPrefix,
          correctChoice: rawChoiceText,
        },
      };
    }
  }

  // 2. Full normalized choice word-boundary match in question stem
  const choicePatternString = escapeRegExp(normalizedChoice).replace(/[-\s]+/g, "[-\\s]+");
  const choiceRegex = new RegExp(`\\b${choicePatternString}\\b`, "i");

  if (choiceRegex.test(normalizedQuestion)) {
    return {
      type: "quality",
      message: `Stem-Option Leakage: Correct choice "${rawChoiceText}" appears verbatim in the question stem.`,
      details: {
        leakType: "verbatim_stem_leak",
        correctChoice: rawChoiceText,
        matchedInStem: true,
      },
    };
  }

  return null;
}
