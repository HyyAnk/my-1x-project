import {
  resolveMascotRenderGeometry,
  resolveMascotRenderSpec,
  type MascotMotionConfig,
  type MascotRenderActionOverride,
  type MascotRenderAspectRatio,
  type MascotRenderBundleV2,
  type MascotRenderPhase,
  type MascotRevealOutcome,
} from "@studio/shared";
import { escAttr } from "../candyArcade/candyArcadeSvg.js";
import {
  finiteNonNegative,
  formatBounds,
  formatPoint,
  localPivot,
  motionStyle,
  numberValue,
  phaseTransition,
  px,
} from "./mascotHtmlStyles.js";
import { renderArt } from "./mascotHtmlArt.js";

export type MascotHtmlState = {
  phase: MascotRenderPhase;
  atSeconds: number;
  durationSeconds: number;
  timelineTimeSeconds?: number;
  actionOverride?: MascotRenderActionOverride | null;
  revealOutcome?: MascotRevealOutcome | null;
  playing: boolean;
};

export function renderState(
  bundle: MascotRenderBundleV2,
  aspectRatio: MascotRenderAspectRatio,
  state: MascotHtmlState,
  sourceMapper: (url: string) => string,
  preview: boolean,
  clipStartSeconds = 0,
): string {
  const timelineTime = finiteNonNegative(state.timelineTimeSeconds ?? state.atSeconds);
  const spec = resolveMascotRenderSpec(bundle, {
    aspect_ratio: aspectRatio,
    phase: state.phase,
    reveal_outcome: state.revealOutcome ?? null,
    action_override: state.actionOverride ?? null,
    timeline_time_seconds: timelineTime,
    playing: state.playing,
  });
  if (!spec) return "";

  if (state.phase === "reveal" && !bundle.assets.actions.celebrate?.image_url?.trim()) {
    return "";
  }
  if (state.phase === "thinking" && !bundle.assets.actions.thinking?.image_url?.trim()) {
    return "";
  }

  const hasAnimation = Boolean(spec.asset.animation);
  const effectiveMotion: MascotMotionConfig = hasAnimation ? { preset: "none", speed: 1, intensity: "normal" } : spec.motion;

  const geometry = resolveMascotRenderGeometry(spec);
  const pivot = localPivot(spec, geometry);
  const duration = Math.max(0.04, finiteNonNegative(state.durationSeconds));
  const stateDelay = preview ? 0 : finiteNonNegative(state.atSeconds);
  const stateStyle = [
    `--mascot-state-delay:${numberValue(stateDelay)}s`,
    `--mascot-state-span:${numberValue(duration)}s`,
    `--mascot-pivot-x:${px(pivot.x)}`,
    `--mascot-pivot-y:${px(pivot.y)}`,
    `--mascot-registration-x:${px(spec.asset.registration.offset_x)}`,
    `--mascot-registration-y:${px(spec.asset.registration.offset_y)}`,
    ...motionStyle(effectiveMotion, timelineTime, duration, stateDelay, preview),
  ].join(";");
  const art = renderArt(
    spec,
    timelineTime,
    duration,
    stateDelay,
    state.playing,
    preview,
    sourceMapper,
    finiteNonNegative(state.atSeconds),
    clipStartSeconds,
  );
  const bounds = geometry.visible_content;
  const assetUrl = spec.asset.animation
    ? spec.asset.animation.atlas_url || spec.asset.animation.transparent_video_url || spec.asset.image_url
    : spec.asset.image_url;

  return `<div class="mascot-v2-state state-${spec.asset.action}" style="${stateStyle}" data-legacy-class="mascot-state-layer" data-mascot-visible="true" data-mascot-playing="${String(state.playing)}" data-mascot-phase="${state.phase}" data-mascot-action="${spec.asset.action}" data-mascot-asset-action="${spec.asset.action}" data-mascot-asset-url="${escAttr(sourceMapper(assetUrl))}" data-mascot-motion-preset="${effectiveMotion.preset}" data-mascot-motion-speed="${numberValue(effectiveMotion.speed)}" data-mascot-motion-intensity="${effectiveMotion.intensity}" data-mascot-registration-offset="${formatPoint(spec.asset.registration.offset_x, spec.asset.registration.offset_y)}" data-mascot-enter-transition="${phaseTransition(bundle, state.phase, "enter")}" data-mascot-exit-transition="${phaseTransition(bundle, state.phase, "exit")}" data-mascot-box="${formatBounds(geometry.box_x, geometry.box_y, geometry.box_width, geometry.box_height)}" data-mascot-pivot="${formatPoint(geometry.pivot_x, geometry.pivot_y)}" data-mascot-visible-bounds="${formatBounds(bounds.x, bounds.y, bounds.width, bounds.height)}"><div class="mascot-v2-motion motion-${effectiveMotion.preset}" style="--mascot-motion-delay:${numberValue(stateDelay)}s">${art}</div></div>`;
}

export { renderArt };
