import {
  type ResolvedTransitionSettings,
  type TransitionSettings,
  resolveTransitionSettings,
} from "@studio/shared";

export interface ProductionTransitionSettingsOptions {
  preset?: { transitions?: TransitionSettings } | null;
  channel?: { transitions?: TransitionSettings } | null;
  director?: TransitionSettings | null;
  draft?: TransitionSettings | null;
}

/**
 * Server adapter around the shared resolveTransitionSettings contract.
 * Preserves strict precedence: draft -> explicit/director -> preset -> channel -> defaults.
 */
export function resolveProductionTransitionSettings(
  options: ProductionTransitionSettingsOptions,
): ResolvedTransitionSettings {
  return resolveTransitionSettings({
    draft: options.draft ?? undefined,
    explicit: options.director ?? undefined,
    preset: options.preset?.transitions ?? undefined,
    channel: options.channel?.transitions ?? undefined,
  });
}