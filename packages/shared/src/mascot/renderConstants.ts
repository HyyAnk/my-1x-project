import type { MascotActionType, MascotMotionIntensity, MascotMotionPreset, MascotState } from "../enums.js";
import type { MascotRenderAspectRatio, MascotPhaseRuleV2, MascotPlacementV2, MascotRenderPhase } from "./renderTypes.js";

export const MASCOT_RENDER_CONTRACT_VERSION = 2 as const;

export const MASCOT_CANVAS_SIZES: Record<MascotRenderAspectRatio, { width: number; height: number }> = {
  "16:9": { width: 1920, height: 1080 },
  "9:16": { width: 1080, height: 1920 },
};

export const MASCOT_RENDER_ASPECT_RATIOS: MascotRenderAspectRatio[] = ["16:9", "9:16"];
export const MASCOT_RENDER_PHASES: MascotRenderPhase[] = ["intro", "question", "choices", "thinking", "reveal", "explain", "outro"];

export const MASCOT_BASE_BOX_PX = 220;
export const MASCOT_SCALE_MIN = 0.3;
export const MASCOT_SCALE_MAX = 3;
export const MASCOT_OFFSET_MIN = -1500;
export const MASCOT_OFFSET_MAX = 1500;
export const MASCOT_MOTION_SPEED_MIN = 0.1;
export const MASCOT_MOTION_SPEED_MAX = 5;
export const MASCOT_DEFAULT_MOTION_SPEED = 1;

export const MASCOT_DEFAULT_ACTION_MOTIONS: Record<MascotActionType, MascotMotionPreset> = {
  idle: "breathe",
  wave: "wave",
  thinking: "sway",
  point: "pulse",
  celebrate: "jump",
  oops: "shake",
  outro: "wave",
};

export const MASCOT_ACTION_FALLBACK_CHAINS: Record<MascotActionType, MascotActionType[]> = {
  idle: ["idle"],
  wave: ["wave", "idle"],
  thinking: ["thinking", "idle"],
  point: ["point", "idle"],
  celebrate: ["celebrate", "wave", "idle"],
  oops: ["oops", "thinking", "idle"],
  outro: ["outro", "wave", "celebrate", "idle"],
};

export const MASCOT_STATE_TO_ACTION: Record<MascotState, MascotActionType> = {
  idle: "idle",
  wave: "wave",
  curious: "thinking",
  thinking: "thinking",
  point: "point",
  surprised: "oops",
  celebrate: "celebrate",
  encourage: "point",
};

export const MASCOT_MOTION_INTENSITY_MULTIPLIERS: Record<MascotMotionIntensity, number> = {
  subtle: 0.35,
  normal: 1,
  dynamic: 2.2,
};

/**
 * Base cycle lengths used by the deterministic mascot motion resolver.
 *
 * Keeping these values in the shared contract lets HTML/CSS production
 * renderers schedule the same motion period as the editor and other clients.
 */
export const MASCOT_MOTION_PERIODS: Record<MascotMotionPreset, number> = {
  breathe: 3.2,
  sway: 2.4,
  jump: 0.85,
  shake: 2,
  wave: 2,
  point: 1.8,
  pulse: 1.8,
  float: 2.8,
  none: 1,
};

export const MASCOT_DEFAULT_PLACEMENT: MascotPlacementV2 = {
  anchor: "bottom_left",
  scale: 1,
  offset_x: 0,
  offset_y: 0,
  flip_x: false,
};

export const MASCOT_RECOMMENDED_PLACEMENT: MascotPlacementV2 = {
  anchor: "bottom_left",
  scale: 1.84,
  offset_x: 21,
  offset_y: 90,
  flip_x: false,
};

export const DEFAULT_MASCOT_PHASE_RULES: Record<MascotRenderPhase, MascotPhaseRuleV2> = {
  intro: { visible: false, action: "wave", enter_transition: "fade", exit_transition: "fade" },
  question: { visible: true, action: "thinking", enter_transition: "none", exit_transition: "fade" },
  choices: { visible: true, action: "thinking", enter_transition: "none", exit_transition: "fade" },
  thinking: { visible: true, action: "thinking", enter_transition: "none", exit_transition: "fade" },
  reveal: { visible: true, action: "celebrate", enter_transition: "pop", exit_transition: "fade" },
  explain: { visible: true, action: "celebrate", enter_transition: "fade", exit_transition: "fade" },
  outro: { visible: false, action: "outro", enter_transition: "fade", exit_transition: "fade" },
};

export const DEFAULT_MASCOT_REVEAL_OUTCOME_ACTIONS = {
  correct: "celebrate",
  wrong: "oops",
  timeout: "oops",
} as const;
