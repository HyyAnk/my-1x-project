import type { QuizQuestionCounterStyle } from "@studio/shared";
import type { CounterBadgeVariant } from "./types.js";
import { BUILT_IN_COUNTER_MODULES } from "../../styleModules/builtins.js";
import { renderValidatedModuleCss } from "../../styleModules/namespaceCss.js";

export const COUNTER_BADGE_VARIANTS: Record<Exclude<QuizQuestionCounterStyle, "auto">, CounterBadgeVariant> = {
  hanging_woodsign: BUILT_IN_COUNTER_MODULES[0].renderer,
  neon_badge: BUILT_IN_COUNTER_MODULES[1].renderer,
  floating_balloon: BUILT_IN_COUNTER_MODULES[2].renderer,
  golden_shield: BUILT_IN_COUNTER_MODULES[3].renderer,
};

export const DEFAULT_COUNTER_BADGE_STYLE: Exclude<QuizQuestionCounterStyle, "auto"> = "hanging_woodsign";

export function getCounterBadgeVariant(style: Exclude<QuizQuestionCounterStyle, "auto">): CounterBadgeVariant {
  return COUNTER_BADGE_VARIANTS[style] ?? COUNTER_BADGE_VARIANTS[DEFAULT_COUNTER_BADGE_STYLE];
}

export function resolveCounterBadgeVariant(
  requested?: QuizQuestionCounterStyle | null,
  fallback: Exclude<QuizQuestionCounterStyle, "auto"> = DEFAULT_COUNTER_BADGE_STYLE,
): CounterBadgeVariant {
  if (!requested || requested === "auto") {
    return COUNTER_BADGE_VARIANTS[fallback] ?? COUNTER_BADGE_VARIANTS[DEFAULT_COUNTER_BADGE_STYLE];
  }
  return COUNTER_BADGE_VARIANTS[requested] ?? COUNTER_BADGE_VARIANTS[fallback] ?? COUNTER_BADGE_VARIANTS[DEFAULT_COUNTER_BADGE_STYLE];
}

export function getCounterBadgesCss(): string {
  return BUILT_IN_COUNTER_MODULES.map(renderValidatedModuleCss).filter(Boolean).join("\n");
}
