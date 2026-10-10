import type { ThumbnailLayoutType } from "@studio/shared";
import type { StudioLogger } from "../../logger.js";
import type { LLMClient } from "../../utils/promptSanitizer.js";
import type { MascotArchetypeDefinition } from "./thumbnailArchetypes.js";
import type { MascotThemedPersona, ResolveThumbnailInput } from "./thumbnailTypes.js";

export type PlanThumbnailWithAiInput = ResolveThumbnailInput & {
  llmClient?: LLMClient | null;
  signal?: AbortSignal;
  archetypesOverride?: MascotArchetypeDefinition[];
  logger?: StudioLogger;
  channelId?: string;
  episodeId?: string;
};

export interface AiThumbnailPersonaVariationOutput {
  id?: number;
  archetypeId?: number;
  archetypeName?: string;
  role?: string;
  costume?: string;
  prop?: string;
  expression?: string;
  poseDescription?: string;
}

export interface AiThumbnailPlanOutput {
  hook_text?: string;
  badge_text?: string;
  layout?: ThumbnailLayoutType;
  environment_atmosphere?: string;
  lighting_palette?: string;
  mascot_persona?: Partial<MascotThemedPersona>;
  mascot_persona_variations?: AiThumbnailPersonaVariationOutput[];
  subject_anchors?: Array<{ label?: string; visualPrompt?: string; badge?: string }>;
}
