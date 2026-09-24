import type { TargetEntityForGeneration } from "./promptStrategy.types.js";
import {
  FRANCHISE_ANCHOR_MANDATE_LINES,
  VISUAL_ANCHOR_MANDATE_LINES,
} from "../archetypePromptGuidelines.js";

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

export const COMMON_BATCH_CONTENT_POLICY_LINES: string[] = [
  "=== STRICT CONTENT POLICY ===",
  "1. DO NOT create offensive, gory, or dangerous content.",
  "2. ANTI-OBSCURITY NEGATIVE CONSTRAINTS:",
  "   - NEVER test obscure manga chapter numbers, release dates, or background animator names.",
  "   - NEVER test secondary character family lineages, blood types, or obscure minor jutsu/spells.",
  "   - ALWAYS focus questions on world-famous hallmarks: signature attacks, legendary relics, iconic character traits, or universal plot premises that casual viewers and social media audiences immediately recognize and celebrate.",
];

export const COMMON_REVERSE_CONTENT_POLICY_LINES: string[] = [
  "6. STRICT CONTENT POLICY & ANTI-OBSCURITY CONSTRAINTS:",
  "   - DO NOT create offensive, gory, or dangerous content.",
  "   - NEVER test obscure manga chapter numbers, release dates, or background animator names.",
  "   - NEVER test secondary character family lineages, blood types, or obscure minor jutsu/spells.",
  "   - ALWAYS focus questions on world-famous hallmarks: signature attacks, legendary relics, iconic character traits, or universal plot premises that casual viewers and social media audiences immediately recognize and celebrate.",
];
