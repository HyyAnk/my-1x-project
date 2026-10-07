import {
  adaptMascotConfigV1ToV2,
  adaptMascotV1ToV2,
  resolveEffectiveMascotMediaMode,
  resolveMascotRenderSpec,
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
  type ProductionMascotRenderOptions as BaseProductionMascotRenderOptions,
  type ProductionMascotTimelineEvent,
} from "./productionMascotTimeline.js";

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

/** Production adapter for the canonical Mascot Render Contract V2 HTML layer. */
export function renderProductionMascotHtmlLayer(
  mascot: MascotProfile | null | undefined,
  config: ChannelMascotConfig | null | undefined,
  options: ProductionMascotRenderOptions,
): string {
  const effectiveMediaMode = resolveEffectiveMascotMediaMode(config, options.mediaMode);
  const effectiveMascot = adaptMascotForPhase(mascot, options.phase, options.styleId, effectiveMediaMode);
  const bundle = resolveEffectiveRenderBundle(effectiveMascot, config);
  if (!bundle) return "";
  const mediaBundle = sanitizeMascotRenderBundleForMediaMode(bundle, effectiveMediaMode);

  synchronizeBundleVisibility(mediaBundle, effectiveMascot);

  const clipStart = finiteNonNegative(options.clipStartSeconds);
  const clipDuration = Math.max(0.04, finiteNonNegative(options.clipDurationSeconds));
  const markers = resolveProductionMascotMarkers(options, clipStart, clipDuration);
  const rawStates = markers.map((marker, index) => ({
    phase: marker.phase,
    atSeconds: Math.max(0, marker.atSeconds),
    durationSeconds: Math.max(0.04, (markers[index + 1]?.atSeconds ?? clipStart + clipDuration) - marker.atSeconds),
    timelineTimeSeconds: marker.atSeconds,
    actionOverride: marker.actionOverride,
    revealOutcome: marker.revealOutcome,
    playing: true,
  }));

  const states = consolidateAdjacentMascotAnimationStates(
    mediaBundle,
    options.aspectRatio ?? "16:9",
    rawStates,
    effectiveMediaMode,
  );

  return renderMascotHtmlFromBundle({
    bundle: mediaBundle,
    aspectRatio: options.aspectRatio ?? "16:9",
    states,
    phaseClass: options.phase === "intro" ? "mascot-intro" : options.phase === "outro" ? "mascot-outro" : "mascot-stage",
    sourceMapper: options.sourceMapper,
    extraClass: options.extraClass,
    clipStartSeconds: clipStart,
    mediaMode: effectiveMediaMode,
  });
}

/**
 * Consolidates contiguous mascot animation states that share the same animated asset,
 * preventing HyperFrames and CSS animation restart stutters at marker boundaries.
 */
export function consolidateAdjacentMascotAnimationStates(
  bundle: MascotRenderBundleV2,
  aspectRatio: MascotRenderAspectRatio,
  states: MascotHtmlState[],
  mediaMode?: MascotStateMediaMode,
): MascotHtmlState[] {
  if (states.length <= 1 || mediaMode === "static") return states;

  const result: MascotHtmlState[] = [];
  let currentGroup: {
    state: MascotHtmlState;
    spec: ReturnType<typeof resolveMascotRenderSpec>;
  } | null = null;

  for (const state of states) {
    const spec = resolveMascotRenderSpec(bundle, {
      aspect_ratio: aspectRatio,
      phase: state.phase,
      reveal_outcome: state.revealOutcome ?? null,
      action_override: state.actionOverride ?? null,
      timeline_time_seconds: state.timelineTimeSeconds ?? state.atSeconds,
      playing: state.playing,
    });

    if (!currentGroup) {
      currentGroup = { state: { ...state }, spec };
      result.push(currentGroup.state);
      continue;
    }

    const prevSpec: ReturnType<typeof resolveMascotRenderSpec> = currentGroup.spec;
    const isAnimatable = Boolean(
      spec?.asset.animation && (spec.asset.animation.transparent_video_url || spec.asset.animation.atlas_url),
    );
    const isPrevAnimatable = Boolean(
      prevSpec?.asset.animation && (prevSpec.asset.animation.transparent_video_url || prevSpec.asset.animation.atlas_url),
    );

    const samePlacement =
      prevSpec?.placement.anchor === spec?.placement.anchor &&
      prevSpec?.placement.offset_x === spec?.placement.offset_x &&
      prevSpec?.placement.offset_y === spec?.placement.offset_y &&
      prevSpec?.placement.scale === spec?.placement.scale &&
      prevSpec?.placement.flip_x === spec?.placement.flip_x;

    const canMerge =
      isAnimatable &&
      isPrevAnimatable &&
      prevSpec?.asset.action === spec?.asset.action &&
      prevSpec?.asset.animation?.slot_index === spec?.asset.animation?.slot_index &&
      prevSpec?.asset.animation?.transparent_video_url === spec?.asset.animation?.transparent_video_url &&
      prevSpec?.asset.animation?.atlas_url === spec?.asset.animation?.atlas_url &&
      samePlacement;

    if (canMerge) {
      currentGroup.state.durationSeconds += state.durationSeconds;
    } else {
      currentGroup = { state: { ...state }, spec };
      result.push(currentGroup.state);
    }
  }

  return result;
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
  const effectiveMediaMode = resolveEffectiveMascotMediaMode(config, options.mediaMode);
  const effectiveMascot = adaptMascotForPhase(mascot, options.phase, options.styleId, effectiveMediaMode);
  const bundle = resolveEffectiveRenderBundle(effectiveMascot, config);
  if (!bundle) return "";
  const mediaBundle = sanitizeMascotRenderBundleForMediaMode(bundle, effectiveMediaMode);

  synchronizeBundleVisibility(mediaBundle, effectiveMascot);

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

  const activeSpec = resolveMascotRenderSpec(mediaBundle, {
    aspect_ratio: options.aspectRatio ?? "16:9",
    phase: activeMarker.phase,
    reveal_outcome: activeMarker.revealOutcome ?? null,
    action_override: activeMarker.actionOverride ?? null,
    timeline_time_seconds: targetTime,
    playing: true,
  });

  let segmentStartTime = activeMarker.atSeconds;
  if (activeSpec) {
    const isStatic = effectiveMediaMode === "static" || !activeSpec.asset.animation;
    for (let i = activeIndex - 1; i >= 0; i--) {
      const prevMarker = markers[i];
      const prevSpec = resolveMascotRenderSpec(mediaBundle, {
        aspect_ratio: options.aspectRatio ?? "16:9",
        phase: prevMarker.phase,
        reveal_outcome: prevMarker.revealOutcome ?? null,
        action_override: prevMarker.actionOverride ?? null,
        timeline_time_seconds: prevMarker.atSeconds,
        playing: true,
      });
      if (!prevSpec) break;

      const samePlacement =
        prevSpec.placement.anchor === activeSpec.placement.anchor &&
        prevSpec.placement.offset_x === activeSpec.placement.offset_x &&
        prevSpec.placement.offset_y === activeSpec.placement.offset_y &&
        prevSpec.placement.scale === activeSpec.placement.scale &&
        prevSpec.placement.flip_x === activeSpec.placement.flip_x;

      const matches = isStatic
        ? Boolean(prevSpec.asset.image_url) &&
          prevSpec.asset.image_url === activeSpec.asset.image_url &&
          samePlacement
        : prevSpec.asset.action === activeSpec.asset.action &&
          prevSpec.asset.animation?.slot_index === activeSpec.asset.animation?.slot_index &&
          prevSpec.asset.animation?.transparent_video_url === activeSpec.asset.animation?.transparent_video_url &&
          prevSpec.asset.animation?.atlas_url === activeSpec.asset.animation?.atlas_url &&
          samePlacement;

      if (matches) {
        segmentStartTime = prevMarker.atSeconds;
      } else {
        break;
      }
    }
  }

  const nextMarkerTime = markers[activeIndex + 1]?.atSeconds ?? clipStart + clipDuration;
  const state = {
    phase: activeMarker.phase,
    atSeconds: segmentStartTime,
    durationSeconds: Math.max(0.04, nextMarkerTime - activeMarker.atSeconds),
    timelineTimeSeconds: targetTime,
    actionOverride: activeMarker.actionOverride,
    revealOutcome: activeMarker.revealOutcome,
    playing: true,
  };

  return renderMascotHtmlFromBundle({
    bundle: mediaBundle,
    aspectRatio: options.aspectRatio ?? "16:9",
    states: [state],
    phaseClass: options.phase === "intro" ? "mascot-intro" : options.phase === "outro" ? "mascot-outro" : "mascot-stage",
    sourceMapper: options.sourceMapper,
    extraClass: options.extraClass,
    preview: true,
    clipStartSeconds: clipStart,
    mediaMode: effectiveMediaMode,
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
