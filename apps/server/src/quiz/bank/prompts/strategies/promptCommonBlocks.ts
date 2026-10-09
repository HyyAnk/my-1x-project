import type { TargetEntityForGeneration } from "./promptStrategy.types.js";
import {
  FRANCHISE_ANCHOR_MANDATE_LINES,
  VISUAL_ANCHOR_MANDATE_LINES,
} from "../archetypePromptGuidelines.js";
import { KID_AUDIENCE_POLICY_LINES } from "../kidAudiencePolicy.js";

export { FRANCHISE_ANCHOR_MANDATE_LINES, VISUAL_ANCHOR_MANDATE_LINES };

export function formatExistingSamplesBlock(samples?: string[]): string {
  if (!samples || samples.length === 0) return "";
  return (
    `\n[EXISTING QUESTIONS IN BANK - DO NOT DUPLICATE]:\n` +
    samples.map((s, idx) => `  ${idx + 1}. "${s}"`).join("\n") +
    `\n`
  );
}

export function formatTargetEntitiesBlock(targets: TargetEntityForGeneration[]): string {
  return targets
    .map((target, idx) => {
      const traits = target.core_traits.slice(0, 4).join(" | ");
      const distractors = target.distractor_pool?.slice(0, 4).join(", ") || "None specified";
      const facts = target.facts_and_myths
        .slice(0, 2)
        .map((f) => {
          const isTrue = f.verdict.toLowerCase() === "fact" || f.verdict.toLowerCase() === "true";
          const label = isTrue ? "TRUE" : "FALSE";
          return `  * [${label}] "${f.claim}" -> ${f.explanation}`;
        })
        .join("\n");
      const rivals = target.versus_candidates?.slice(0, 3).join(", ") || "None specified";

      return [
        `[Target Entity #${idx + 1}]`,
        `- Entity ID: "${target.entity_id}"`,
        `- Canonical Name: "${target.name}"`,
        `- Domain: "${target.domain_id}", Subtopic: "${target.subtopic_id}"`,
        `- Visual Anchor (Use directly for visual_spec.prompt): "${target.visual_anchor}"`,
        `- Core Traits / Clues: ${traits}`,
        `- Distractor Pool: ${distractors}`,
        `- Versus Rivals: ${rivals}`,
        `- True / False Claims:`,
        facts || "  (None)",
      ].join("\n");
    })
    .join("\n\n");
}

export const ANSWER_INTEGRITY_MANDATE_LINES: string[] = [
  "=== ANSWER INTEGRITY MANDATE (ZERO GIVEAWAYS) ===",
  "1. NO ANSWER WORDS IN THE STEM: The question must NEVER contain the correct answer, any distinctive word of it, or any form of that word.",
  "   - NEVER: 'Which one glides engine-free?' -> Hang Glider | 'Name the timepiece strapped to wrists' -> Wristwatch | 'What straw accessory did Shanks give Luffy?' -> Straw Hat.",
  "   - INSTEAD: describe the answer through clues it does not share words with ('Which one soars with no engine at all?' -> Hang Glider).",
  "2. NO GIVEAWAY BY ELIMINATION: Every wrong choice must belong to the same category as the correct answer and be equally plausible to a casual viewer.",
  "   - Never let the stem's category word match only the correct choice (e.g. NEVER ask 'which flask...' when only the correct choice is a flask).",
  "   - Never make the correct choice noticeably longer, more specific, or more formal than the distractors.",
  "3. ANSWER POSITION: Choice order does not matter; the system shuffles answer positions automatically. Never refer to a choice by its letter (A, B, C) in the question, explanation, or fun fact; always name it.",
];

export const COMMON_BATCH_CONTENT_POLICY_LINES: string[] = [
  ...KID_AUDIENCE_POLICY_LINES,
  "=== STRICT CONTENT POLICY ===",
  "1. DO NOT create offensive, gory, or dangerous content.",
  "2. ANTI-OBSCURITY NEGATIVE CONSTRAINTS:",
  "   - NEVER test obscure manga chapter numbers, release dates, or background animator names.",
  "   - NEVER test secondary character family lineages, blood types, or obscure minor jutsu/spells.",
  "   - ALWAYS focus questions on world-famous hallmarks: signature attacks, legendary relics, iconic character traits, or universal plot premises that casual viewers and social media audiences immediately recognize and celebrate.",
];

export const COMMON_REVERSE_CONTENT_POLICY_LINES: string[] = [
  ...KID_AUDIENCE_POLICY_LINES,
  "6. STRICT CONTENT POLICY & ANTI-OBSCURITY CONSTRAINTS:",
  "   - DO NOT create offensive, gory, or dangerous content.",
  "   - NEVER test obscure manga chapter numbers, release dates, or background animator names.",
  "   - NEVER test secondary character family lineages, blood types, or obscure minor jutsu/spells.",
  "   - ALWAYS focus questions on world-famous hallmarks: signature attacks, legendary relics, iconic character traits, or universal plot premises that casual viewers and social media audiences immediately recognize and celebrate.",
];
