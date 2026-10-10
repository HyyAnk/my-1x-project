import {
  resolveMascotRenderSpec,
  type MascotRenderAspectRatio,
  type MascotRenderBundleV2,
  type MascotStateMediaMode,
} from "@studio/shared";
import type { MascotHtmlState } from "./mascotHtmlRenderer.js";
import {
  hasSameAnimationIdentity,
  hasSamePlacement,
  hasSameStaticImage,
  isAnimatableSpec,
  type MascotMarkerRenderSpec,
} from "./mascotRenderSpecMatching.js";
import type { MascotMarker } from "./productionMascotTimeline.js";
import { resolveMarkerRenderSpec } from "./productionMascotTimelineAnimation.js";

function resolveStateRenderSpec(
  bundle: MascotRenderBundleV2,
  aspectRatio: MascotRenderAspectRatio,
  state: MascotHtmlState,
): MascotMarkerRenderSpec | null {
  return resolveMascotRenderSpec(bundle, {
    aspect_ratio: aspectRatio,
    phase: state.phase,
    reveal_outcome: state.revealOutcome ?? null,
    action_override: state.actionOverride ?? null,
    timeline_time_seconds: state.timelineTimeSeconds ?? state.atSeconds,
    playing: state.playing,
  });
}

function canMergeAnimationStates(previous: MascotMarkerRenderSpec | null, current: MascotMarkerRenderSpec | null): boolean {
  if (!isAnimatableSpec(current) || !isAnimatableSpec(previous)) return false;
  return hasSameAnimationIdentity(previous, current) && hasSamePlacement(previous, current);
}

/**
 * Static stills have no motion to restart, so two adjacent states of the same phase that show the
 * same image (for example the reveal and the reward beat) are one state. Keeping both emits two
 * identical <img> layers, which HyperFrames reports as a duplicate media discovery risk.
 */
function canMergeStaticStates(
  previous: { state: MascotHtmlState; spec: MascotMarkerRenderSpec | null },
  state: MascotHtmlState,
  spec: MascotMarkerRenderSpec | null,
): boolean {
  if (!previous.spec || !spec || previous.state.phase !== state.phase) return false;
  return hasSameStaticImage(previous.spec, spec) && hasSamePlacement(previous.spec, spec);
}

/**
 * Consolidates contiguous mascot states that show the same asset: animated states that share the
 * same animation (preventing restart stutters at marker boundaries) and, in static mode, adjacent
 * states of one phase that share the same still image.
 */
export function consolidateAdjacentMascotAnimationStates(
  bundle: MascotRenderBundleV2,
  aspectRatio: MascotRenderAspectRatio,
  states: MascotHtmlState[],
  mediaMode?: MascotStateMediaMode,
): MascotHtmlState[] {
  if (states.length <= 1) return states;
  const isStatic = mediaMode === "static";

  const result: MascotHtmlState[] = [];
  let currentGroup: { state: MascotHtmlState; spec: MascotMarkerRenderSpec | null } | null = null;
  for (const state of states) {
    const spec = resolveStateRenderSpec(bundle, aspectRatio, state);
    const mergeable =
      currentGroup && (isStatic ? canMergeStaticStates(currentGroup, state, spec) : canMergeAnimationStates(currentGroup.spec, spec));
    if (currentGroup && mergeable) {
      currentGroup.state.durationSeconds += state.durationSeconds;
      continue;
    }
    currentGroup = { state: { ...state }, spec };
    result.push(currentGroup.state);
  }
  return result;
}

function isSegmentContinuation(previous: MascotMarkerRenderSpec | null, active: MascotMarkerRenderSpec, isStatic: boolean): boolean {
  if (!previous) return false;
  const sameAsset = isStatic ? hasSameStaticImage(previous, active) : hasSameAnimationIdentity(previous, active);
  return sameAsset && hasSamePlacement(previous, active);
}

export type SeekSegmentStartInput = {
  bundle: MascotRenderBundleV2;
  aspectRatio: MascotRenderAspectRatio;
  markers: readonly MascotMarker[];
  activeIndex: number;
  activeSpec: MascotMarkerRenderSpec | null;
  mediaMode: MascotStateMediaMode;
};

/** Start of the run of earlier markers that show the same image (static) or animation (animated) as the active one. */
export function resolveSeekSegmentStart(input: SeekSegmentStartInput): number {
  const { activeSpec, markers } = input;
  let segmentStartTime = markers[input.activeIndex].atSeconds;
  if (!activeSpec) return segmentStartTime;
  const isStatic = input.mediaMode === "static" || !activeSpec.asset.animation;
  for (let i = input.activeIndex - 1; i >= 0; i--) {
    const previousMarker = markers[i];
    const previousSpec = resolveMarkerRenderSpec(input.bundle, input.aspectRatio, previousMarker, previousMarker.atSeconds);
    if (!isSegmentContinuation(previousSpec, activeSpec, isStatic)) break;
    segmentStartTime = previousMarker.atSeconds;
  }
  return segmentStartTime;
}
