import type { MascotActionType, MascotMotionIntensity, MascotMotionPreset, MascotPosition, MascotState } from "../enums.js";

export type MascotRenderAspectRatio = "16:9" | "9:16";

export type MascotRenderPhase = "intro" | "question" | "choices" | "thinking" | "reveal" | "explain" | "outro";

export type MascotRevealOutcome = "correct" | "wrong" | "timeout";

export type MascotTransition = "none" | "fade" | "pop" | "slide";

export type MascotRenderActionOverride = MascotActionType | MascotState;

export type MascotCanvasSize = {
  width: number;
  height: number;
};

export type MascotPoint = {
  x: number;
  y: number;
};

export type MascotBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type MascotMotionConfig = {
  preset: MascotMotionPreset;
  speed: number;
  intensity: MascotMotionIntensity;
};

export type MascotAssetRegistration = {
  source_width: number;
  source_height: number;
  content_bounds: MascotBounds;
  pivot: MascotPoint;
  offset_x: number;
  offset_y: number;
};

export type MascotActionAssetV2 = {
  version: 2;
  action: MascotActionType;
  image_url: string;
  registration: MascotAssetRegistration;
  motion: MascotMotionConfig;
  /**
   * Present only when a V1 multi-frame asset is being read through the
   * compatibility adapter. New V2 assets omit this field.
   */
  legacy_animation?: MascotLegacyAnimationV1;
};

export type MascotLegacyAnimationV1 = {
  frames_count: number;
  fps: number;
  loop: boolean;
  frame_width: number;
  frame_height: number;
};

export type MascotMasterAssetV2 = {
  version: 2;
  image_url: string;
  registration: MascotAssetRegistration;
};

export type MascotRenderAssetCatalogV2 = {
  actions: Partial<Record<MascotActionType, MascotActionAssetV2 | null>>;
  master: MascotMasterAssetV2 | null;
};

export type MascotRenderBundleV2 = {
  config: MascotRenderConfigV2;
  assets: MascotRenderAssetCatalogV2;
};

export type MascotPlacementV2 = {
  anchor: MascotPosition;
  scale: number;
  offset_x: number;
  offset_y: number;
  flip_x: boolean;
};

export type MascotPhaseRuleV2 = {
  visible: boolean;
  action: MascotActionType;
  enter_transition: MascotTransition;
  exit_transition: MascotTransition;
};

export type MascotVisibilityPolicyV2 = {
  enabled: boolean;
  phase_rules: Record<MascotRenderPhase, MascotPhaseRuleV2>;
  reveal_outcome_actions: Record<MascotRevealOutcome, MascotActionType>;
};

export type MascotRenderConfigV2 = {
  version: 2;
  placements: Record<MascotRenderAspectRatio, MascotPlacementV2>;
  visibility: MascotVisibilityPolicyV2;
};

export type MascotRenderContext = {
  aspect_ratio: MascotRenderAspectRatio;
  phase: MascotRenderPhase;
  reveal_outcome?: MascotRevealOutcome | null;
  action_override?: MascotRenderActionOverride | null;
  timeline_time_seconds: number;
  playing: boolean;
};

export type MascotRenderSpecV2 = {
  version: 2;
  canvas: MascotCanvasSize;
  phase: MascotRenderPhase;
  reveal_outcome: MascotRevealOutcome | null;
  visible: true;
  placement: MascotPlacementV2;
  asset: MascotActionAssetV2;
  motion: MascotMotionConfig;
  timeline_time_seconds: number;
  playing: boolean;
};

export type MascotMotionTransform = {
  translate_x: number;
  translate_y: number;
  scale_x: number;
  scale_y: number;
  rotate_deg: number;
};

export type MascotRenderGeometry = {
  box_x: number;
  box_y: number;
  box_width: number;
  box_height: number;
  pivot_x: number;
  pivot_y: number;
  visible_content: MascotBounds;
  registration_offset_x: number;
  registration_offset_y: number;
  flip_x: boolean;
};
