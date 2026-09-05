/**
 * Question Bank Prompt Engineering Barrel Facade.
 * Re-exports guidelines, prompt builders, and output parsers for 100% backward compatibility.
 */

export {
  ARCHETYPE_GUIDELINES,
  type ArchetypePromptGuideline,
} from "./prompts/archetypePromptGuidelines.js";

export {
  buildBatchGenerationPrompt,
  type BuildBatchPromptOptions,
} from "./prompts/standardBatchPromptBuilder.js";

export {
  buildReverseGenerationPrompt,
  type BuildReverseBatchPromptOptions,
  type TargetEntityForGeneration,
} from "./prompts/reverseMatrixPromptBuilder.js";

export {
  parseBatchGenerationOutput,
  parseReverseBatchGenerationOutput,
  sanitizeBankQuestionText,
} from "./prompts/batchPromptOutputParser.js";
