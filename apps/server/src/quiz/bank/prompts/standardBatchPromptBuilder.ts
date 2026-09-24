import type { BuildBatchPromptOptions } from "./strategies/promptStrategy.types.js";
import { resolvePromptStrategy } from "./strategies/promptStrategyRegistry.js";

export type { BuildBatchPromptOptions };

/**
 * Standard topic-based batch generation prompt builder.
 * Dispatches directly to the tailored archetype prompt strategy.
 */
export function buildBatchGenerationPrompt(options: BuildBatchPromptOptions): string {
  const strategy = resolvePromptStrategy(options.archetypeId);
  return strategy.buildBatchPrompt(options);
}
