/**
 * Question Bank Prompt Engineering Barrel Facade.
 * Re-exports guidelines, prompt builders, and output parsers for 100% backward compatibility.
 */

export {
  ARCHETYPE_GUIDELINES,
  FRANCHISE_ANCHOR_MANDATE,
  FRANCHISE_ANCHOR_MANDATE_LINES,
  VISUAL_ANCHOR_MANDATE,
  VISUAL_ANCHOR_MANDATE_LINES,
  type ArchetypePromptGuideline,
} from "./prompts/archetypePromptGuidelines.js";

export { buildBatchGenerationPrompt, type BuildBatchPromptOptions } from "./prompts/standardBatchPromptBuilder.js";

export {
  buildReverseGenerationPrompt,
  type BuildReverseBatchPromptOptions,
  type TargetEntityForGeneration,
} from "./prompts/reverseMatrixPromptBuilder.js";

export {
  parseBatchGenerationOutput,
  parseReverseBatchGenerationOutput,
  normalizeGenerationLanguage,
  sanitizeBankQuestionText,
} from "./prompts/batchPromptOutputParser.js";
