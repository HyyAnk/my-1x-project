import type { QuizQuestionCounterStyle } from "@studio/shared";
import type { CounterBadgeVariant } from "./types.js";
import { hangingWoodSignVariant } from "./variants/hangingWoodSign.js";
import { neonBadgeVariant } from "./variants/neonBadge.js";
import { floatingBalloonVariant } from "./variants/floatingBalloon.js";
import { goldenShieldVariant } from "./variants/goldenShield.js";

export const COUNTER_BADGE_VARIANTS: Record<Exclude<QuizQuestionCounterStyle, "auto">, CounterBadgeVariant> = {
  hanging_woodsign: hangingWoodSignVariant,
  neon_badge: neonBadgeVariant,
  floating_balloon: floatingBalloonVariant,
  golden_shield: goldenShieldVariant,
};

export const DEFAULT_COUNTER_BADGE_STYLE: Exclude<QuizQuestionCounterStyle, "auto"> = "hanging_woodsign";

export function getCounterBadgeVariant(style: Exclude<QuizQuestionCounterStyle, "auto">): CounterBadgeVariant {
  return COUNTER_BADGE_VARIANTS[style] ?? hangingWoodSignVariant;
}

export function resolveCounterBadgeVariant(
  requested?: QuizQuestionCounterStyle | null,
  fallback: Exclude<QuizQuestionCounterStyle, "auto"> = DEFAULT_COUNTER_BADGE_STYLE,
): CounterBadgeVariant {
  if (!requested || requested === "auto") {
    return COUNTER_BADGE_VARIANTS[fallback] ?? hangingWoodSignVariant;
  }
  return COUNTER_BADGE_VARIANTS[requested] ?? COUNTER_BADGE_VARIANTS[fallback] ?? hangingWoodSignVariant;
}

export function getCounterBadgesCss(): string {
  return Object.values(COUNTER_BADGE_VARIANTS)
    .map((variant) => variant.renderCss?.() ?? "")
    .filter(Boolean)
    .join("\n");
}
