import {
  resolveAnimationFrameAtTime,
  resolveMascotRenderSpec,
  type MascotRenderAspectRatio,
  type MascotRenderBundleV2,
  type MascotRenderPhase,
} from "@studio/shared";
import { hasSameAnimationIdentity, type MascotMarkerRenderSpec } from "./mascotRenderSpecMatching.js";
import type { MascotMarker, ProductionTimelineResolvedFrame } from "./productionMascotTimeline.js";

type MascotMarkerAnimation = NonNullable<MascotMarkerRenderSpec["asset"]["animation"]>;

/** Index of the last marker at or before `targetTime`; the first marker when none has started yet. */
export function findActiveMarkerIndex(markers: readonly MascotMarker[], targetTime: number): number {
  let activeIndex = 0;
  for (let i = 0; i < markers.length; i++) {
    if (markers[i].atSeconds > targetTime) break;
    activeIndex = i;
  }
  return activeIndex;
}

export function resolveMarkerRenderSpec(
  bundle: MascotRenderBundleV2,
  aspectRatio: MascotRenderAspectRatio,
  marker: MascotMarker,
  timeSeconds: number,
): MascotMarkerRenderSpec | null {
  return resolveMascotRenderSpec(bundle, {
    aspect_ratio: aspectRatio,
    phase: marker.phase,
    reveal_outcome: marker.revealOutcome ?? null,
    action_override: marker.actionOverride ?? null,
    timeline_time_seconds: timeSeconds,
    playing: true,
  });
}

function hasActionImage(bundle: MascotRenderBundleV2, action: "celebrate" | "thinking" | "idle"): boolean {
  return Boolean(bundle.assets.actions[action]?.image_url?.trim());
}

/** Reveal and thinking phases render nothing when the bundle lacks their dedicated action art. */
export function isPhaseArtMissing(bundle: MascotRenderBundleV2, phase: MascotRenderPhase): boolean {
  if (phase === "reveal") return !hasActionImage(bundle, "celebrate");
  if (phase === "thinking") return !hasActionImage(bundle, "thinking");
  return false;
}

function isSameAnimationSlot(previous: MascotMarkerRenderSpec | null, current: MascotMarkerRenderSpec): boolean {
  return previous ? hasSameAnimationIdentity(previous, current) : false;
}

type SegmentStartInput = {
  bundle: MascotRenderBundleV2;
  aspectRatio: MascotRenderAspectRatio;
  markers: readonly MascotMarker[];
  activeIndex: number;
  spec: MascotMarkerRenderSpec;
};

/** Walks back over earlier markers that keep playing the same animation so the loop does not restart. */
export function resolveAnimationSegmentStart(input: SegmentStartInput): number {
  const activeMarker = input.markers[input.activeIndex];
  const stopsAtNonThinking = activeMarker.phase === "thinking" && hasActionImage(input.bundle, "idle");
  let segmentStartTime = activeMarker.atSeconds;
  for (let i = input.activeIndex - 1; i >= 0; i--) {
    const previousMarker = input.markers[i];
    if (stopsAtNonThinking && previousMarker.phase !== "thinking") break;
    const previousSpec = resolveMarkerRenderSpec(input.bundle, input.aspectRatio, previousMarker, previousMarker.atSeconds);
    if (!isSameAnimationSlot(previousSpec, input.spec)) break;
    segmentStartTime = previousMarker.atSeconds;
  }
  return segmentStartTime;
}

function resolveVideoSeekSeconds(animation: MascotMarkerAnimation, elapsedSeconds: number): number {
  const isOneShot = animation.loop_policy === "one_shot_rest" || (!animation.loop && animation.loop_policy !== "loop");
  const cycle = animation.duration_ms ? animation.duration_ms / 1000 : animation.frame_count / animation.fps;
  const rawSeek = isOneShot ? Math.min(elapsedSeconds, cycle) : elapsedSeconds % cycle;
  return Number(rawSeek.toFixed(3));
}

/** Writes the sprite frame (and transparent video seek point, when present) for `elapsedSeconds` into the result. */
export function applyAnimationFrame(
  result: ProductionTimelineResolvedFrame,
  animation: MascotMarkerAnimation,
  elapsedSeconds: number,
): void {
  const resolved = resolveAnimationFrameAtTime(animation, elapsedSeconds);
  result.animationFrameIndex = resolved.frameIndex;
  result.animationFrame = resolved.frame;
  result.atlasOffsets = resolved.atlasOffsets;
  result.isClamped = resolved.isClamped;
  if (animation.transparent_video_url) {
    result.transparentVideoUrl = animation.transparent_video_url;
    result.seekTimeSeconds = resolveVideoSeekSeconds(animation, elapsedSeconds);
  }
}
