import type {
  ResolvedTransitionSettings,
  TransitionPlacement,
  TransitionSelection,
  TransitionSettingSources,
} from "./transition.types.js";

const DEFAULT_INTRO_SELECTION: TransitionSelection = { id: "stinger_swipe" };
const DEFAULT_SCENE_SELECTION: TransitionSelection = { id: "bubble_splash" };

function resolvePlacementSelection(
  placement: TransitionPlacement,
  sources: TransitionSettingSources,
): TransitionSelection {
  const candidates: (TransitionSelection | undefined)[] = [
    sources.draft?.[placement],
    sources.explicit?.[placement],
    sources.preset?.[placement],
    sources.channel?.[placement],
    sources.defaults?.[placement],
  ];

  for (const candidate of candidates) {
    if (candidate && candidate.id && candidate.id !== "auto") {
      return {
        id: candidate.id,
        durationSeconds: candidate.durationSeconds,
      };
    }
  }

  return placement === "intro" ? DEFAULT_INTRO_SELECTION : DEFAULT_SCENE_SELECTION;
}

export function resolveTransitionSettings(sources: TransitionSettingSources): ResolvedTransitionSettings {
  return {
    intro: resolvePlacementSelection("intro", sources),
    scene: resolvePlacementSelection("scene", sources),
  };
}

/**
 * Adapter from legacy intro/outro fields into a structured TransitionSettings object.
 */
export function fromLegacyIntroTransition(
  transitionType?: string,
  transitionDurationSeconds?: number,
): TransitionSelection | undefined {
  if (!transitionType || transitionType === "auto") {
    return undefined;
  }
  return {
    id: transitionType,
    durationSeconds: transitionDurationSeconds,
  };
}
