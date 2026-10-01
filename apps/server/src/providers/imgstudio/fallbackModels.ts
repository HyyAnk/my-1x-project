import {
  IMGSTUDIO_FALLBACK_LEVEL_1_MODEL_ID,
  IMGSTUDIO_GEMINI_3_1_FLASH_MODEL_ID,
  IMGSTUDIO_KREA_2_TURBO_MODEL_ID,
  resolveImgStudioModelName,
} from "@studio/shared";

export interface ImgStudioFallbackModelPlan {
  level1: string;
  level2: string;
  level3: string;
}

export function resolveImgStudioFallbackModels(
  configuredLevel2Model?: string,
  configuredLevel3Model?: string,
): ImgStudioFallbackModelPlan {
  return {
    level1: IMGSTUDIO_FALLBACK_LEVEL_1_MODEL_ID,
    level2: configuredLevel2Model?.trim() || IMGSTUDIO_GEMINI_3_1_FLASH_MODEL_ID,
    level3: configuredLevel3Model?.trim() || IMGSTUDIO_KREA_2_TURBO_MODEL_ID,
  };
}

export function describeImgStudioModel(modelId: string): string {
  return `${resolveImgStudioModelName(modelId)} (${modelId})`;
}
