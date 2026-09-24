import type {
  BuildReverseBatchPromptOptions,
  TargetEntityForGeneration,
} from "./strategies/promptStrategy.types.js";
import { resolvePromptStrategy } from "./strategies/promptStrategyRegistry.js";

export type { BuildReverseBatchPromptOptions, TargetEntityForGeneration };

/**
 * Deterministic Reverse Matrix prompt builder.
 * Injects concrete Knowledge Base entities and instructs the LLM to create questions
 * tailored specifically for each archetype via its dedicated prompt strategy.
 */
export function buildReverseGenerationPrompt(options: BuildReverseBatchPromptOptions): string {
  const strategy = resolvePromptStrategy(options.archetypeId);
  return strategy.buildReversePrompt(options);
}
