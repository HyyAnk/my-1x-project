import {
  adaptMascotConfigV1ToV2,
  adaptMascotV1ToV2,
  type ChannelMascotConfig,
  type MascotProfile,
  type MascotRenderBundleV2,
} from "@studio/shared";
import { renderMascotHtmlFromBundle } from "./mascotHtmlRenderer.js";
import {
  adaptMascotForPhase,
  adaptMascotForQuestion,
  hasDedicatedAction,
  resolveMascotQuestionStyle,
  type MascotQuestionAdaptOptions,
} from "./mascot/productionMascotStateAdapter.js";
import {
  createMascotAnimationRenderSnapshot,
  findSnapshotEntry,
  recordMascotAnimationSnapshotEntry,
  type MascotAnimationRenderSnapshot,
  type MascotAnimationRenderSnapshotEntry,
} from "./animationRenderSnapshot.js";
import {
  resolveProductionMascotMarkers,
  type ProductionMascotRenderOptions as BaseProductionMascotRenderOptions,
  type ProductionMascotTimelineEvent,
} from "./productionMascotTimeline.js";

export type ProductionMascotRenderOptions = BaseProductionMascotRenderOptions & {
  styleId?: string | null;
};

export type {
  ProductionMascotTimelineEvent,
  MascotQuestionAdaptOptions,
  MascotAnimationRenderSnapshot,
  MascotAnimationRenderSnapshotEntry,
};

export {
  resolveMascotQuestionStyle,
  hasDedicatedAction,
  adaptMascotForQuestion,
  adaptMascotForPhase,
  createMascotAnimationRenderSnapshot,
  findSnapshotEntry,
  recordMascotAnimationSnapshotEntry,
};

/**
 * Resolves the effective MascotRenderBundleV2 for production or preview rendering.
 * Primarily consumes effectiveMascot.render_bundle, applying channel layout and visibility rules.
 * Falls back to adaptMascotV1ToV2 for unmigrated legacy mascots.
 */
export function resolveEffectiveRenderBundle(
  effectiveMascot: MascotProfile | null | undefined,
  config?: ChannelMascotConfig | null,
): MascotRenderBundleV2 | null {
  if (!effectiveMascot) return null;

  if (effectiveMascot.render_bundle) {
    const bundle = effectiveMascot.render_bundle;
    if (!config) return bundle;

    const channelConfig = adaptMascotConfigV1ToV2(config);
    const mergedPhaseRules = { ...channelConfig.visibility.phase_rules };
    for (const phase of ["thinking", "choices", "reveal", "explain"] as const) {
      if (bundle.config.visibility.phase_rules[phase]?.visible === false) {
        mergedPhaseRules[phase] = {
          ...mergedPhaseRules[phase],
          visible: false,
        };
      }
    }

    return {
      ...bundle,
      config: {
        ...bundle.config,
        placements: channelConfig.placements,
        visibility: {
          ...bundle.config.visibility,
          enabled: channelConfig.visibility.enabled,
          phase_rules: mergedPhaseRules,
          reveal_outcome_actions: bundle.config.visibility.reveal_outcome_actions ?? channelConfig.visibility.reveal_outcome_actions,
        },
      },
    };
  }

  return adaptMascotV1ToV2(effectiveMascot, config);
}

/** Production adapter for the canonical Mascot Render Contract V2 HTML layer. */
export function renderProductionMascotHtmlLayer(
  mascot: MascotProfile | null | undefined,
  config: ChannelMascotConfig | null | undefined,
  options: ProductionMascotRenderOptions,
): string {
  const effectiveMascot = adaptMascotForPhase(mascot, options.phase, options.styleId);
  const bundle = resolveEffectiveRenderBundle(effectiveMascot, config);
  if (!bundle) return "";

  synchronizeBundleVisibility(bundle, effectiveMascot);

  const clipStart = finiteNonNegative(options.clipStartSeconds);
  const clipDuration = Math.max(0.04, finiteNonNegative(options.clipDurationSeconds));
  const markers = resolveProductionMascotMarkers(options, clipStart, clipDuration);
  const states = markers.map((marker, index) => ({
    phase: marker.phase,
    atSeconds: Math.max(0, marker.atSeconds),
    durationSeconds: Math.max(0.04, (markers[index + 1]?.atSeconds ?? clipStart + clipDuration) - marker.atSeconds),
    timelineTimeSeconds: marker.atSeconds,
    actionOverride: marker.actionOverride,
    revealOutcome: marker.revealOutcome,
    playing: true,
  }));

  return renderMascotHtmlFromBundle({
    bundle,
    aspectRatio: options.aspectRatio ?? "16:9",
    states,
    phaseClass: options.phase === "intro" ? "mascot-intro" : options.phase === "outro" ? "mascot-outro" : "mascot-stage",
    sourceMapper: options.sourceMapper,
    extraClass: options.extraClass,
    clipStartSeconds: clipStart,
  });
}

function finiteNonNegative(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

/**
 * Renders production mascot HTML seeking directly to a specific composition timestamp.
 * Adheres strictly to HyperFrames constraints:
 * - Seekable from time alone
 * - Strictly zero render-time clocks (Date.now(), performance.now())
 * - Finite timeline duration with explicit frame state
 * - Verified asset localization through sourceMapper
 */
export function renderProductionMascotAtTime(
  mascot: MascotProfile | null | undefined,
  config: ChannelMascotConfig | null | undefined,
  options: ProductionMascotRenderOptions,
  timeSeconds: number,
): string {
  const effectiveMascot = adaptMascotForPhase(mascot, options.phase, options.styleId);
  const bundle = resolveEffectiveRenderBundle(effectiveMascot, config);
  if (!bundle) return "";

  synchronizeBundleVisibility(bundle, effectiveMascot);

  const clipStart = finiteNonNegative(options.clipStartSeconds);
  const clipDuration = Math.max(0.04, finiteNonNegative(options.clipDurationSeconds));
  const markers = resolveProductionMascotMarkers(options, clipStart, clipDuration);
  const targetTime = finiteNonNegative(timeSeconds);

  let activeMarker = markers[0];
  let activeIndex = 0;
  for (let i = 0; i < markers.length; i++) {
    if (markers[i].atSeconds <= targetTime) {
      activeMarker = markers[i];
      activeIndex = i;
    } else {
      break;
    }
  }

  const nextMarkerTime = markers[activeIndex + 1]?.atSeconds ?? clipStart + clipDuration;
  const state = {
    phase: activeMarker.phase,
    atSeconds: activeMarker.atSeconds,
    durationSeconds: Math.max(0.04, nextMarkerTime - activeMarker.atSeconds),
    timelineTimeSeconds: targetTime,
    actionOverride: activeMarker.actionOverride,
    revealOutcome: activeMarker.revealOutcome,
    playing: true,
  };

  return renderMascotHtmlFromBundle({
    bundle,
    aspectRatio: options.aspectRatio ?? "16:9",
    states: [state],
    phaseClass: options.phase === "intro" ? "mascot-intro" : options.phase === "outro" ? "mascot-outro" : "mascot-stage",
    sourceMapper: options.sourceMapper,
    extraClass: options.extraClass,
    preview: true,
    clipStartSeconds: clipStart,
  });
}

export function synchronizeBundleVisibility(bundle: MascotRenderBundleV2, effectiveMascot: MascotProfile | null | undefined): void {
  if (!effectiveMascot) return;
  if (hasDedicatedAction(effectiveMascot, "idle")) {
    bundle.config.visibility.phase_rules.question.action = "idle";
  }
  const hasThinking = hasDedicatedAction(effectiveMascot, "thinking");
  if (!hasThinking) {
    bundle.config.visibility.phase_rules.thinking.visible = false;
    bundle.config.visibility.phase_rules.choices.visible = false;
    if (!hasDedicatedAction(effectiveMascot, "idle")) {
      bundle.config.visibility.phase_rules.question.visible = false;
    }
  }
  const hasCelebrate = hasDedicatedAction(effectiveMascot, "celebrate");
  if (!hasCelebrate) {
    bundle.config.visibility.phase_rules.reveal.visible = false;
    bundle.config.visibility.phase_rules.explain.visible = false;
  }
}
