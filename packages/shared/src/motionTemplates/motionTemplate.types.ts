export type MotionTemplatePlacement = "intro" | "outro" | "both";

export type MotionTemplateCategory = "kinetic" | "cyber" | "minimal" | "gamified";

export type MotionTemplateId =
  | "kinetic_punch"
  | "cyber_neon"
  | "minimal_sleek"
  | "interactive_cta"
  | "scorecard_recap";

export interface MotionTemplateOptions {
  accentColor?: string;
  headlineText?: string;
  subheadlineText?: string;
  showMascot?: boolean;
  showParticles?: boolean;
  soundEffectCue?: boolean;
  customParameters?: Record<string, string | number | boolean>;
}

export interface MotionTemplateDefinition {
  id: MotionTemplateId;
  name: string;
  description: string;
  placement: MotionTemplatePlacement;
  category: MotionTemplateCategory;
  defaultDurationSeconds: number;
  minDurationSeconds: number;
  maxDurationSeconds: number;
}
