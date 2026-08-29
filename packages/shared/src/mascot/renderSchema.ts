import { z } from "zod";
import { MascotActionTypeSchema, MascotMotionIntensitySchema, MascotMotionPresetSchema, MascotPositionSchema } from "../enums.js";

export const MascotRenderAspectRatioSchema = z.enum(["16:9", "9:16"]);

export const MascotRenderPhaseSchema = z.enum(["intro", "question", "choices", "thinking", "reveal", "explain", "outro"]);

export const MascotRevealOutcomeSchema = z.enum(["correct", "wrong", "timeout"]);

export const MascotTransitionSchema = z.enum(["none", "fade", "pop", "slide"]);

const MascotCanvasSizeSchema = z.object({
  width: z.number().int().positive().max(8192),
  height: z.number().int().positive().max(8192),
});

const MascotPointSchema = z.object({
  x: z.number().finite().min(0).max(8192),
  y: z.number().finite().min(0).max(8192),
});

const MascotBoundsSchema = z.object({
  x: z.number().finite().min(0).max(8192),
  y: z.number().finite().min(0).max(8192),
  width: z.number().finite().positive().max(8192),
  height: z.number().finite().positive().max(8192),
});

export const MascotMotionConfigV2Schema = z.object({
  preset: MascotMotionPresetSchema,
  speed: z.number().finite().min(0.1).max(5),
  intensity: MascotMotionIntensitySchema,
});

export const MascotAssetRegistrationSchema = z.object({
  source_width: z.number().int().positive().max(8192),
  source_height: z.number().int().positive().max(8192),
  content_bounds: MascotBoundsSchema,
  pivot: MascotPointSchema,
  offset_x: z.number().finite().min(-8192).max(8192),
  offset_y: z.number().finite().min(-8192).max(8192),
});

export const MascotActionAssetV2Schema = z.object({
  version: z.literal(2),
  action: MascotActionTypeSchema,
  image_url: z.string().trim().min(1),
  registration: MascotAssetRegistrationSchema,
  motion: MascotMotionConfigV2Schema,
});

export const MascotPlacementV2Schema = z.object({
  anchor: MascotPositionSchema,
  scale: z.number().finite().min(0.3).max(3),
  offset_x: z.number().finite().min(-1500).max(1500),
  offset_y: z.number().finite().min(-1500).max(1500),
  flip_x: z.boolean(),
});

export const MascotPhaseRuleV2Schema = z.object({
  visible: z.boolean(),
  action: MascotActionTypeSchema,
  enter_transition: MascotTransitionSchema,
  exit_transition: MascotTransitionSchema,
});

export const MascotPhaseRulesV2Schema = z.object({
  intro: MascotPhaseRuleV2Schema,
  question: MascotPhaseRuleV2Schema,
  choices: MascotPhaseRuleV2Schema,
  thinking: MascotPhaseRuleV2Schema,
  reveal: MascotPhaseRuleV2Schema,
  explain: MascotPhaseRuleV2Schema,
  outro: MascotPhaseRuleV2Schema,
});

export const MascotVisibilityPolicyV2Schema = z.object({
  enabled: z.boolean(),
  phase_rules: MascotPhaseRulesV2Schema,
  reveal_outcome_actions: z.object({
    correct: MascotActionTypeSchema,
    wrong: MascotActionTypeSchema,
    timeout: MascotActionTypeSchema,
  }),
});

export const MascotRenderConfigV2Schema = z.object({
  version: z.literal(2),
  placements: z.object({
    "16:9": MascotPlacementV2Schema,
    "9:16": MascotPlacementV2Schema,
  }),
  visibility: MascotVisibilityPolicyV2Schema,
});

export const MascotRenderContextSchema = z.object({
  aspect_ratio: MascotRenderAspectRatioSchema,
  phase: MascotRenderPhaseSchema,
  reveal_outcome: MascotRevealOutcomeSchema.nullable(),
  timeline_time_seconds: z.number().finite().min(0),
  playing: z.boolean(),
});

export const MascotRenderSpecV2Schema = z.object({
  version: z.literal(2),
  canvas: MascotCanvasSizeSchema,
  phase: MascotRenderPhaseSchema,
  reveal_outcome: MascotRevealOutcomeSchema.nullable(),
  visible: z.literal(true),
  placement: MascotPlacementV2Schema,
  asset: MascotActionAssetV2Schema,
  motion: MascotMotionConfigV2Schema,
  timeline_time_seconds: z.number().finite().min(0),
  playing: z.boolean(),
});
