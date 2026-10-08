import type { IntroOutroSnapshot, QuizConfig } from "@studio/shared";

export interface BookendEnablement {
  intro: boolean;
  outro: boolean;
}

/** Legacy episodes predate the toggles, so a missing flag means enabled. */
export function resolveBookendEnablement(config: Pick<QuizConfig, "intro_enabled" | "outro_enabled">): BookendEnablement {
  return { intro: config.intro_enabled !== false, outro: config.outro_enabled !== false };
}

/**
 * Applies the toggles on top of the pinned snapshot instead of re-pinning,
 * so toggling one bookend never re-rolls the pair chosen for the other.
 */
export function applyBookendEnablement(snapshot: IntroOutroSnapshot, enablement: BookendEnablement): IntroOutroSnapshot {
  return {
    ...snapshot,
    ...(enablement.intro ? {} : { intro_duration_seconds: 0, intro_has_audio: false }),
    ...(enablement.outro ? {} : { outro_duration_seconds: 0, outro_has_audio: false }),
  };
}
