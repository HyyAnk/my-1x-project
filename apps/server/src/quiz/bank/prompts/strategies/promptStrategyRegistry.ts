import type { BankGameplayArchetypeId } from "@studio/shared";
import type { ArchetypePromptStrategy } from "./promptStrategy.types.js";
import { speedBlitzPromptStrategy } from "./speedBlitzPromptStrategy.js";
import { deepTriviaPromptStrategy } from "./deepTriviaPromptStrategy.js";
import { versusFaceoffPromptStrategy } from "./versusFaceoffPromptStrategy.js";
import { visualSpottingPromptStrategy } from "./visualSpottingPromptStrategy.js";
import { mysteryRevealPromptStrategy } from "./mysteryRevealPromptStrategy.js";
import { visualIdentificationPromptStrategy } from "./visualIdentificationPromptStrategy.js";
import { verdictPromptStrategy } from "./verdictPromptStrategy.js";

const STRATEGY_MAP = new Map<BankGameplayArchetypeId, ArchetypePromptStrategy>();

function registerStrategy(strategy: ArchetypePromptStrategy): void {
  const ids = Array.isArray(strategy.archetypeId) ? strategy.archetypeId : [strategy.archetypeId];
  for (const id of ids) {
    STRATEGY_MAP.set(id, strategy);
  }
}

registerStrategy(speedBlitzPromptStrategy);
registerStrategy(deepTriviaPromptStrategy);
registerStrategy(versusFaceoffPromptStrategy);
registerStrategy(visualSpottingPromptStrategy);
registerStrategy(mysteryRevealPromptStrategy);
registerStrategy(visualIdentificationPromptStrategy);
registerStrategy(verdictPromptStrategy);

/**
 * Resolves the tailored prompt strategy for a specific gameplay archetype.
 * Falls back safely to speed_blitz strategy if an unrecognized archetype is requested.
 */
export function resolvePromptStrategy(archetypeId: BankGameplayArchetypeId): ArchetypePromptStrategy {
  return STRATEGY_MAP.get(archetypeId) ?? speedBlitzPromptStrategy;
}

export {
  speedBlitzPromptStrategy,
  deepTriviaPromptStrategy,
  versusFaceoffPromptStrategy,
  visualSpottingPromptStrategy,
  mysteryRevealPromptStrategy,
  visualIdentificationPromptStrategy,
  verdictPromptStrategy,
};
