import {
  adaptMascotConfigV1ToV2,
  adaptMascotV1ToV2,
  resolveEffectiveMascotMediaMode,
  type ChannelMascotConfig,
  type MascotProfile,
  type MascotRenderAspectRatio,
  type MascotRenderBundleV2,
  type MascotStateMediaMode,
} from "@studio/shared";
import { renderMascotHtmlFromBundle, type MascotHtmlState } from "./mascotHtmlRenderer.js";
import {
  adaptMascotForPhase,
  adaptMascotForQuestion,
  hasDedicatedAction,
  resolveMascotQuestionStyle,
  resolveQuestionBundleAction,
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
  type MascotMarker,
  type ProductionMascotRenderOptions as BaseProductionMascotRenderOptions,
  type ProductionMascotTimelineEvent,
} from "./productionMascotTimeline.js";
import { findActiveMarkerIndex, resolveMarkerRenderSpec } from "./productionMascotTimelineAnimation.js";
import { consolidateAdjacentMascotAnimationStates, resolveSeekSegmentStart } from "./productionMascotStateConsolidation.js";

export type ProductionMascotRenderOptions = BaseProductionMascotRenderOptions & {
  styleId?: string | null;
  mediaMode?: MascotStateMediaMode;
};

export type {
  ProductionMascotTimelineEvent,
  MascotQuestionAdaptOptions,
  MascotAnimationRenderSnapshot,
  MascotAnimationRenderSnapshotEntry,
};

export {
  resolveEffectiveMascotMediaMode,
  resolveMascotQuestionStyle,
  resolveQuestionBundleAction,
  hasDedicatedAction,
  adaptMascotForQuestion,
  adaptMascotForPhase,
  createMascotAnimationRenderSnapshot,
  findSnapshotEntry,
  recordMascotAnimationSnapshotEntry,
  consolidateAdjacentMascotAnimationStates,
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

export function sanitizeMascotRenderBundleForMediaMode(
  bundle: MascotRenderBundleV2,
  mediaMode: MascotStateMediaMode,
): MascotRenderBundleV2 {
  if (mediaMode !== "static") return bundle;

  const actions = Object.fromEntries(
    Object.entries(bundle.assets.actions).map(([action, asset]) => {
      if (!asset) return [action, asset];
      const imageUrl = /\.(?:webm|mp4)(?:$|[?#])/i.test(asset.image_url)
        ? bundle.assets.master?.image_url || asset.image_url
        : asset.image_url;
      const { animation: _animation, legacy_animation: _legacyAnimation, ...staticAsset } = asset;
      return [action, { ...staticAsset, image_url: imageUrl }];
    }),
  );

  return {
    ...bundle,
    assets: {
      ...bundle.assets,
      actions,
    },
  };
}

function phaseClassFor(phase: ProductionMascotRenderOptions["phase"]): string {
  if (phase === "intro") return "mascot-intro";
  if (phase === "outro") return "mascot-outro";
  return "mascot-stage";
}

type PreparedProductionMascotRender = {
  mediaBundle: MascotRenderBundleV2;
  mediaMode: MascotStateMediaMode;
  aspectRatio: MascotRenderAspectRatio;
  clipStart: number;
  clipDuration: number;
  markers: MascotMarker[];
};

function finiteNonNegative(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

/** Adapts the mascot for the phase, resolves its media-mode bundle and the clip's phase markers. */
function prepareProductionMascotRender(
  mascot: MascotProfile | null | undefined,
  config: ChannelMascotConfig | null | undefined,
  options: ProductionMascotRenderOptions,
): PreparedProductionMascotRender | null {
  const mediaMode = resolveEffectiveMascotMediaMode(config, options.mediaMode);
  const effectiveMascot = adaptMascotForPhase(mascot, options.phase, options.styleId, mediaMode);
  const bundle = resolveEffectiveRenderBundle(effectiveMascot, config);
  if (!bundle) return null;
  const mediaBundle = sanitizeMascotRenderBundleForMediaMode(bundle, mediaMode);
  synchronizeBundleVisibility(mediaBundle, effectiveMascot);

  const clipStart = finiteNonNegative(options.clipStartSeconds);
  const clipDuration = Math.max(0.04, finiteNonNegative(options.clipDurationSeconds));
  const markers = resolveProductionMascotMarkers(options, clipStart, clipDuration);
  return { mediaBundle, mediaMode, aspectRatio: options.aspectRatio ?? "16:9", clipStart, clipDuration, markers };
}

function markersToHtmlStates(prepared: PreparedProductionMascotRender): MascotHtmlState[] {
  const { markers, clipStart, clipDuration } = prepared;
  return markers.map((marker, index) => ({
    phase: marker.phase,
    atSeconds: Math.max(0, marker.atSeconds),
    durationSeconds: Math.max(0.04, (markers[index + 1]?.atSeconds ?? clipStart + clipDuration) - marker.atSeconds),
    timelineTimeSeconds: marker.atSeconds,
    actionOverride: marker.actionOverride,
    revealOutcome: marker.revealOutcome,
    playing: true,
  }));
}

/** Production adapter for the canonical Mascot Render Contract V2 HTML layer. */
export function renderProductionMascotHtmlLayer(
  mascot: MascotProfile | null | undefined,
  config: ChannelMascotConfig | null | undefined,
  options: ProductionMascotRenderOptions,
): string {
  const prepared = prepareProductionMascotRender(mascot, config, options);
  if (!prepared) return "";
  const { mediaBundle, mediaMode, aspectRatio } = prepared;
  const states = consolidateAdjacentMascotAnimationStates(mediaBundle, aspectRatio, markersToHtmlStates(prepared), mediaMode);

  return renderMascotHtmlFromBundle({
    bundle: mediaBundle,
    aspectRatio,
    states,
    phaseClass: phaseClassFor(options.phase),
    sourceMapper: options.sourceMapper,
    extraClass: options.extraClass,
    clipStartSeconds: prepared.clipStart,
    mediaMode,
  });
}

function resolveSeekState(prepared: PreparedProductionMascotRender, targetTime: number): MascotHtmlState {
  const { markers, mediaBundle, aspectRatio } = prepared;
  const activeIndex = findActiveMarkerIndex(markers, targetTime);
  const activeMarker = markers[activeIndex];
  const activeSpec = resolveMarkerRenderSpec(mediaBundle, aspectRatio, activeMarker, targetTime);
  const segmentStartTime = resolveSeekSegmentStart({
    bundle: mediaBundle,
    aspectRatio,
    markers,
    activeIndex,
    activeSpec,
    mediaMode: prepared.mediaMode,
  });
  const nextMarkerTime = markers[activeIndex + 1]?.atSeconds ?? prepared.clipStart + prepared.clipDuration;
  return {
    phase: activeMarker.phase,
    atSeconds: segmentStartTime,
    durationSeconds: Math.max(0.04, nextMarkerTime - activeMarker.atSeconds),
    timelineTimeSeconds: targetTime,
    actionOverride: activeMarker.actionOverride,
    revealOutcome: activeMarker.revealOutcome,
    playing: true,
  };
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
  const prepared = prepareProductionMascotRender(mascot, config, options);
  if (!prepared) return "";
  return renderMascotHtmlFromBundle({
    bundle: prepared.mediaBundle,
    aspectRatio: prepared.aspectRatio,
    states: [resolveSeekState(prepared, finiteNonNegative(timeSeconds))],
    phaseClass: phaseClassFor(options.phase),
    sourceMapper: options.sourceMapper,
    extraClass: options.extraClass,
    preview: true,
    clipStartSeconds: prepared.clipStart,
    mediaMode: prepared.mediaMode,
  });
}

export function synchronizeBundleVisibility(bundle: MascotRenderBundleV2, effectiveMascot: MascotProfile | null | undefined): void {
  if (!effectiveMascot) return;
  if (hasDedicatedAction(effectiveMascot, "idle")) {
    bundle.config.visibility.phase_rules.question.action = "idle";
    bundle.config.visibility.phase_rules.choices.action = "idle";
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
