import {
  MASCOT_MOTION_INTENSITY_MULTIPLIERS,
  MASCOT_MOTION_PERIODS,
  MASCOT_MOTION_SPEED_MAX,
  MASCOT_MOTION_SPEED_MIN,
} from "./renderConstants.js";
import type { MascotMotionConfig, MascotMotionTransform } from "./renderTypes.js";

const TWO_PI = Math.PI * 2;
/**
 * Produces a deterministic transform from motion metadata and a composition
 * timestamp. The browser preview and video renderer can call this function
 * with the same inputs and receive the same pose.
 */
export function resolveMascotMotionTransform(motion: MascotMotionConfig, timeSeconds: number): MascotMotionTransform {
  const preset = motion.preset;
  if (preset === "none") return identityMotionTransform();
  const speed = clamp(motion.speed, MASCOT_MOTION_SPEED_MIN, MASCOT_MOTION_SPEED_MAX);
  const intensity = MASCOT_MOTION_INTENSITY_MULTIPLIERS[motion.intensity] ?? 1;
  const time = Number.isFinite(timeSeconds) ? Math.max(0, timeSeconds) : 0;
  const phase = (time * speed * TWO_PI) / MASCOT_MOTION_PERIODS[preset];
  const oscillation = Math.sin(phase);
  const lift = 0.5 - 0.5 * Math.cos(phase);
  const amplitude = intensity;

  switch (preset) {
    case "breathe":
      return {
        translate_x: 0,
        translate_y: -4 * amplitude * lift,
        scale_x: 1 + 0.018 * amplitude * oscillation,
        scale_y: 1 - 0.018 * amplitude * oscillation,
        rotate_deg: 0,
      };
    case "sway":
      return {
        translate_x: 4 * amplitude * oscillation,
        translate_y: -6 * amplitude * lift,
        scale_x: 1,
        scale_y: 1,
        rotate_deg: 3 * amplitude * oscillation,
      };
    case "jump":
      return {
        translate_x: 0,
        translate_y: -24 * amplitude * lift,
        scale_x: 1 + 0.04 * amplitude * lift,
        scale_y: 1 + 0.05 * amplitude * lift,
        rotate_deg: 2 * amplitude * oscillation,
      };
    case "shake":
      return { translate_x: 5 * amplitude * oscillation, translate_y: 0, scale_x: 1, scale_y: 1, rotate_deg: 4 * amplitude * oscillation };
    case "wave":
      return { translate_x: 0, translate_y: -8 * amplitude * lift, scale_x: 1, scale_y: 1, rotate_deg: 5 * amplitude * oscillation };
    case "point":
      return {
        translate_x: 3 * amplitude * oscillation,
        translate_y: -2 * amplitude * lift,
        scale_x: 1,
        scale_y: 1,
        rotate_deg: 1.5 * amplitude * oscillation,
      };
    case "pulse":
      return {
        translate_x: 2 * amplitude * oscillation,
        translate_y: -1 * amplitude * lift,
        scale_x: 1 + 0.035 * amplitude * lift,
        scale_y: 1 + 0.035 * amplitude * lift,
        rotate_deg: 0,
      };
    case "float":
      return { translate_x: 0, translate_y: -14 * amplitude * lift, scale_x: 1, scale_y: 1, rotate_deg: 1.5 * amplitude * oscillation };
  }

  return identityMotionTransform();
}

function identityMotionTransform(): MascotMotionTransform {
  return { translate_x: 0, translate_y: 0, scale_x: 1, scale_y: 1, rotate_deg: 0 };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
