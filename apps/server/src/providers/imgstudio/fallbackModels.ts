import { IMGSTUDIO_FALLBACK_LEVEL_1_MODEL_ID, resolveImgStudioFallbackLevel2Model, resolveImgStudioModelName } from "@studio/shared";

export interface ImgStudioFallbackModelPlan {
  level1: string;
  level2: string;
}

export function resolveImgStudioFallbackModels(configuredLevel2Model?: string): ImgStudioFallbackModelPlan {
  return {
    level1: IMGSTUDIO_FALLBACK_LEVEL_1_MODEL_ID,
    level2: resolveImgStudioFallbackLevel2Model(configuredLevel2Model),
  };
}

export function describeImgStudioModel(modelId: string): string {
  return `${resolveImgStudioModelName(modelId)} (${modelId})`;
}
