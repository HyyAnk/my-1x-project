import type { MascotRenderAspectRatio, MascotPhaseRuleV2, MascotPlacementV2, MascotRenderPhase } from "./renderTypes.js";

export const MASCOT_RENDER_CONTRACT_VERSION = 2 as const;

export const MASCOT_CANVAS_SIZES: Record<MascotRenderAspectRatio, { width: number; height: number }> = {
  "16:9": { width: 1920, height: 1080 },
  "9:16": { width: 1080, height: 1920 },
};

export const MASCOT_BASE_BOX_PX = 220;
export const MASCOT_SCALE_MIN = 0.3;
export const MASCOT_SCALE_MAX = 3;

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
  explain: { visible: true, action: "point", enter_transition: "fade", exit_transition: "fade" },
  outro: { visible: false, action: "outro", enter_transition: "fade", exit_transition: "fade" },
};

export const DEFAULT_MASCOT_REVEAL_OUTCOME_ACTIONS = {
  correct: "celebrate",
  wrong: "oops",
  timeout: "oops",
} as const;
