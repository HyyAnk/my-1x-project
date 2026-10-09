import { KID_READING_LIMITS } from "../../audience/kidReadingLevel.js";
import { countWords, fleschKincaidGrade } from "../../audience/readability.js";
import { findKidUnsafeTerm } from "../../kidSafety/kidSafetyDetector.js";
import type { KidReadabilityRewriteInput } from "./kidReadabilityRewrite.types.js";

/** Rewrites must clearly beat the hard rejection line, not just scrape under it. */
const TARGET_EXPLANATION_GRADE = 8;
const CHOICE_LETTER_REFERENCE = /\b(?:choice|option|answer)\s+[ABC]\b|\([ABC]\)/i;

/**
 * Returns why a rewrite must be discarded (the original copy is then kept), or null when it is acceptable:
 * short, easy to follow, kid-safe, and free of choice-letter references.
 */
export function validateKidReadabilityRewrite(
  original: KidReadabilityRewriteInput,
  rewrite: { explanation: string; funFact: string },
): string | null {
  const { explanation, funFact } = rewrite;
  if (countWords(explanation) < 4) return "explanation is missing or too short";
  if (countWords(explanation) > KID_READING_LIMITS.maxExplanationWords) return "explanation is too long";
  if (fleschKincaidGrade(explanation) > TARGET_EXPLANATION_GRADE) return "explanation is still too hard to read";
  if (original.funFact.trim() && countWords(funFact) < 4) return "fun fact was dropped";
  if (countWords(funFact) > KID_READING_LIMITS.maxFunFactWords) return "fun fact is too long";
  if (CHOICE_LETTER_REFERENCE.test(`${explanation} ${funFact}`)) return "refers to a choice by letter";
  const unsafe = findKidUnsafeTerm(`${explanation} ${funFact}`);
  if (unsafe) return `contains unsuitable content (${unsafe.term})`;
  return null;
}
