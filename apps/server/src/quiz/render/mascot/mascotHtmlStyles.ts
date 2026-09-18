import {
  MASCOT_BASE_BOX_PX,
  MASCOT_MOTION_PERIODS,
  resolveMascotMotionTransform,
  type MascotMotionConfig,
  type MascotMotionTransform,
  type MascotRenderBundleV2,
  type MascotRenderPhase,
  type MascotPlacementV2,
} from "@studio/shared";

export function px(value: number): string {
  return `${numberValue(value)}px`;
}

export function numberValue(value: number): string {
  return Number.isFinite(value) ? Number(value.toFixed(3)).toString() : "0";
}

export function finiteNonNegative(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

export function formatBounds(x: number, y: number, width: number, height: number): string {
  return [x, y, width, height].map(numberValue).join(",");
}

export function formatPoint(x: number, y: number): string {
  return `${numberValue(x)},${numberValue(y)}`;
}

export function toTransform(transform: MascotMotionTransform): string {
  return `translate(${px(transform.translate_x)},${px(transform.translate_y)}) rotate(${numberValue(transform.rotate_deg)}deg) scale(${numberValue(transform.scale_x)},${numberValue(transform.scale_y)})`;
}

export function buildContainerClass(phaseClass: string, anchor: string, preview?: boolean, extraClass?: string): string {
  return [
    "candy-mascot-container",
    "mascot-v2-container",
    preview ? "mascot-v2-preview" : "",
    phaseClass,
    `anchor-${anchor}`,
    extraClass ?? "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function buildContainerStyle(placement: MascotPlacementV2): string {
  return [
    `--mascot-placement-offset-x:${px(placement.offset_x)}`,
    `--mascot-placement-offset-y:${px(placement.offset_y)}`,
    `--mascot-scale:${numberValue(placement.scale)}`,
    `--mascot-flip-sign:${placement.flip_x ? -1 : 1}`,
  ].join(";");
}

export function motionStyle(motion: MascotMotionConfig, timelineTime: number, duration: number, delay: number, preview: boolean): string[] {
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

export function localPivot(
  spec: { placement: { anchor: string; offset_x: number; offset_y: number }; canvas: { width: number; height: number } },
  geometry: { pivot_x: number; pivot_y: number },
): { x: number; y: number } {
  const originX = (spec.placement.anchor === "bottom_right" ? spec.canvas.width - MASCOT_BASE_BOX_PX : 0) + spec.placement.offset_x;
  const originY = spec.canvas.height - MASCOT_BASE_BOX_PX + spec.placement.offset_y;
  return { x: geometry.pivot_x - originX, y: geometry.pivot_y - originY };
}

export function phaseTransition(bundle: MascotRenderBundleV2, phase: MascotRenderPhase, direction: "enter" | "exit"): string {
  const rule = bundle.config.visibility.phase_rules[phase];
  return direction === "enter" ? rule.enter_transition : rule.exit_transition;
}
