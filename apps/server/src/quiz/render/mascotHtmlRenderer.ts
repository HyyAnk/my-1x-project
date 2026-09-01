import {
  MASCOT_BASE_BOX_PX,
  MASCOT_CANVAS_SIZES,
  MASCOT_MOTION_PERIODS,
  resolveMascotMotionTransform,
  resolveMascotRenderGeometry,
  resolveMascotRenderSpec,
  type MascotMotionTransform,
  type MascotRenderActionOverride,
  type MascotRenderAspectRatio,
  type MascotRenderBundleV2,
  type MascotRenderPhase,
  type MascotRevealOutcome,
} from "@studio/shared";
import { escAttr } from "./candyArcade/candyArcadeSvg.js";

export type MascotHtmlState = {
  phase: MascotRenderPhase;
  atSeconds: number;
  durationSeconds: number;
  timelineTimeSeconds?: number;
  actionOverride?: MascotRenderActionOverride | null;
  revealOutcome?: MascotRevealOutcome | null;
  playing: boolean;
};

export type MascotHtmlRenderInput = {
  bundle: MascotRenderBundleV2;
  aspectRatio: MascotRenderAspectRatio;
  states: readonly MascotHtmlState[];
  phaseClass: string;
  sourceMapper?: (url: string) => string;
  extraClass?: string;
  preview?: boolean;
};

export function renderMascotHtmlFromBundle(input: MascotHtmlRenderInput): string {
  const sourceMapper = input.sourceMapper ?? ((url: string) => url);
  const layers = input.states
    .map((state) => renderState(input.bundle, input.aspectRatio, state, sourceMapper, Boolean(input.preview)))
    .filter((layer): layer is string => Boolean(layer));
  if (layers.length === 0) return "";

  const canvas = MASCOT_CANVAS_SIZES[input.aspectRatio];
  const placement = input.bundle.config.placements[input.aspectRatio];
  const className = [
    "candy-mascot-container",
    "mascot-v2-container",
    input.preview ? "mascot-v2-preview" : "",
    input.phaseClass,
    `anchor-${placement.anchor}`,
    input.extraClass ?? "",
  ]
    .filter(Boolean)
    .join(" ");
  const style = [
    `--mascot-placement-offset-x:${px(placement.offset_x)}`,
    `--mascot-placement-offset-y:${px(placement.offset_y)}`,
    `--mascot-scale:${numberValue(placement.scale)}`,
    `--mascot-flip-sign:${placement.flip_x ? -1 : 1}`,
  ].join(";");

  return `<div class="${className}" style="${style}" data-mascot-contract-version="2" data-mascot-aspect-ratio="${input.aspectRatio}" data-mascot-canvas="${canvas.width}x${canvas.height}" data-mascot-anchor="${placement.anchor}" data-mascot-scale="${numberValue(placement.scale)}" data-mascot-offset-x="${numberValue(placement.offset_x)}" data-mascot-offset-y="${numberValue(placement.offset_y)}" data-mascot-flip-x="${String(placement.flip_x)}" data-mascot-preview="${String(Boolean(input.preview))}" data-mascot-visible="true" data-layout-ignore aria-hidden="true">${layers.join("")}</div>`;
}

function renderState(
  bundle: MascotRenderBundleV2,
  aspectRatio: MascotRenderAspectRatio,
  state: MascotHtmlState,
  sourceMapper: (url: string) => string,
  preview: boolean,
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
    ...motionStyle(spec.motion, timelineTime, duration, stateDelay, preview),
  ].join(";");
  const art = renderArt(spec, timelineTime, duration, stateDelay, state.playing, preview, sourceMapper);
  const bounds = geometry.visible_content;

  return `<div class="mascot-v2-state state-${spec.asset.action}" style="${stateStyle}" data-legacy-class="mascot-state-layer" data-mascot-visible="true" data-mascot-playing="${String(state.playing)}" data-mascot-phase="${state.phase}" data-mascot-action="${spec.asset.action}" data-mascot-asset-action="${spec.asset.action}" data-mascot-asset-url="${escAttr(sourceMapper(spec.asset.image_url))}" data-mascot-motion-preset="${spec.motion.preset}" data-mascot-motion-speed="${numberValue(spec.motion.speed)}" data-mascot-motion-intensity="${spec.motion.intensity}" data-mascot-registration-offset="${formatPoint(spec.asset.registration.offset_x, spec.asset.registration.offset_y)}" data-mascot-enter-transition="${phaseTransition(bundle, state.phase, "enter")}" data-mascot-exit-transition="${phaseTransition(bundle, state.phase, "exit")}" data-mascot-box="${formatBounds(geometry.box_x, geometry.box_y, geometry.box_width, geometry.box_height)}" data-mascot-pivot="${formatPoint(geometry.pivot_x, geometry.pivot_y)}" data-mascot-visible-bounds="${formatBounds(bounds.x, bounds.y, bounds.width, bounds.height)}"><div class="mascot-v2-motion motion-${spec.motion.preset}" style="--mascot-motion-delay:${numberValue(stateDelay)}s">${art}</div></div>`;
}

function motionStyle(
  motion: NonNullable<ReturnType<typeof resolveMascotRenderSpec>>["motion"],
  timelineTime: number,
  duration: number,
  delay: number,
  preview: boolean,
): string[] {
  const cycle = MASCOT_MOTION_PERIODS[motion.preset] / motion.speed;
  const iterations = preview ? "infinite" : String(motion.preset === "none" ? 1 : Math.max(1, Math.ceil(duration / cycle) + 1));
  const samples = [0, 0.25, 0.5, 0.75, 1].map((fraction) =>
    toTransform(resolveMascotMotionTransform(motion, timelineTime + cycle * fraction)),
  );
  return [
    `--mascot-motion-preset:${motion.preset}`,
    `--mascot-motion-speed:${numberValue(motion.speed)}`,
    `--mascot-motion-intensity:${motion.intensity}`,
    `--mascot-motion-cycle:${numberValue(cycle)}s`,
    `--mascot-motion-delay:${numberValue(delay)}s`,
    `--mascot-motion-iterations:${iterations}`,
    `--mascot-preview-transform:${samples[0]}`,
    `--mascot-motion-kf-0:${samples[0]}`,
    `--mascot-motion-kf-25:${samples[1]}`,
    `--mascot-motion-kf-50:${samples[2]}`,
    `--mascot-motion-kf-75:${samples[3]}`,
    `--mascot-motion-kf-100:${samples[4]}`,
  ];
}

function renderArt(
  spec: NonNullable<ReturnType<typeof resolveMascotRenderSpec>>,
  timelineTime: number,
  duration: number,
  delay: number,
  playing: boolean,
  preview: boolean,
  sourceMapper: (url: string) => string,
): string {
  const style = [`--mascot-art-url:url('${escAttr(sourceMapper(spec.asset.image_url))}')`];
  const legacy = spec.asset.legacy_animation;
  if (legacy) {
    const cycle = legacy.frames_count / legacy.fps;
    const previewFrame = Math.floor(timelineTime * legacy.fps) % legacy.frames_count;
    const previewPosition = legacy.frames_count === 1 ? 0 : (previewFrame / (legacy.frames_count - 1)) * 100;
    const iterations = preview
      ? playing && legacy.loop
        ? "infinite"
        : "1"
      : String(legacy.loop ? Math.max(1, Math.ceil(duration / cycle) + 1) : 1);
    const animationDelay = preview ? -(timelineTime % cycle) : delay;
    style.push(
      `--mascot-legacy-frames:${legacy.frames_count}`,
      `--mascot-legacy-fps:${numberValue(legacy.fps)}`,
      `--mascot-preview-frame-position:${numberValue(previewPosition)}%`,
      `animation:mascot-v2-legacy-frame ${numberValue(cycle)}s steps(${Math.max(1, legacy.frames_count - 1)},end) ${numberValue(animationDelay)}s ${iterations} both`,
    );
  }
  return `<div class="mascot-v2-frame${legacy ? " mascot-v2-legacy-art" : ""}" style="${style.join(";")}" data-mascot-legacy-frames="${legacy?.frames_count ?? 1}" data-mascot-legacy-fps="${legacy?.fps ?? 0}"></div>`;
}

function localPivot(
  spec: NonNullable<ReturnType<typeof resolveMascotRenderSpec>>,
  geometry: ReturnType<typeof resolveMascotRenderGeometry>,
): { x: number; y: number } {
  const originX = (spec.placement.anchor === "bottom_right" ? spec.canvas.width - MASCOT_BASE_BOX_PX : 0) + spec.placement.offset_x;
  const originY = spec.canvas.height - MASCOT_BASE_BOX_PX + spec.placement.offset_y;
  return { x: geometry.pivot_x - originX, y: geometry.pivot_y - originY };
}

function phaseTransition(bundle: MascotRenderBundleV2, phase: MascotRenderPhase, direction: "enter" | "exit"): string {
  const rule = bundle.config.visibility.phase_rules[phase];
  return direction === "enter" ? rule.enter_transition : rule.exit_transition;
}

function toTransform(transform: MascotMotionTransform): string {
  return `translate(${px(transform.translate_x)},${px(transform.translate_y)}) rotate(${numberValue(transform.rotate_deg)}deg) scale(${numberValue(transform.scale_x)},${numberValue(transform.scale_y)})`;
}

function formatBounds(x: number, y: number, width: number, height: number): string {
  return [x, y, width, height].map(numberValue).join(",");
}

function formatPoint(x: number, y: number): string {
  return `${numberValue(x)},${numberValue(y)}`;
}

function px(value: number): string {
  return `${numberValue(value)}px`;
}

function numberValue(value: number): string {
  return Number.isFinite(value) ? Number(value.toFixed(3)).toString() : "0";
}

function finiteNonNegative(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}
