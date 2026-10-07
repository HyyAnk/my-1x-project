import type { MotionTemplateId, MotionTemplateOptions, MotionTemplatePlacement } from "./motionTemplate.types.js";

export type MotionPromptStyleMood =
  | "cyberpunk"
  | "high_energy"
  | "minimal_luxury"
  | "arcade_playful"
  | "epic_cinematic"
  | "educational_clean";

export interface MotionPromptRequest {
  topicTitle: string;
  channelName?: string;
  placement?: MotionTemplatePlacement;
  mood?: MotionPromptStyleMood;
  preferredTemplateId?: MotionTemplateId;
  targetDurationSeconds?: number;
  audienceAgeBand?: "4-6" | "7-9" | "10-12" | "family" | "general";
  mascotName?: string;
  hasCustomLogo?: boolean;
}

export interface MotionPromptOutput {
  recommendedTemplateId: MotionTemplateId;
  placement: MotionTemplatePlacement;
  mood: MotionPromptStyleMood;
  generatedOptions: MotionTemplateOptions;
  animationPhilosophy: string;
  llmPromptRecipe: string;
}
