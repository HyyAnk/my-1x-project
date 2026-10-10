import {
  IMGSTUDIO_FALLBACK_LEVEL_1_MODEL_ID,
  IMGSTUDIO_FALLBACK_LEVEL_2_MODEL_ID,
  resolveImgStudioFallbackLevel2Model,
  resolveImgStudioFallbackLevel3Model,
  resolveImgStudioModelName,
} from "@studio/shared";

export interface ImgStudioFallbackModelPlan {
  level1: string;
  level2: string;
  level3: string;
}

export interface ImgStudioFallbackModelOptions {
  level1_model?: string;
  level2_model?: string;
  level3_model?: string;
  model?: string;
}

export function resolveImgStudioFallbackModels(
  optionsOrLevel1?: ImgStudioFallbackModelOptions | string,
  configuredLevel2Model?: string,
  configuredLevel3Model?: string,
): ImgStudioFallbackModelPlan {
  if (typeof optionsOrLevel1 === "object" && optionsOrLevel1 !== null) {
    return {
      level1: optionsOrLevel1.level1_model?.trim() || IMGSTUDIO_FALLBACK_LEVEL_1_MODEL_ID,
      level2: optionsOrLevel1.level2_model?.trim() || resolveImgStudioFallbackLevel2Model(optionsOrLevel1.model),
      level3: resolveImgStudioFallbackLevel3Model(optionsOrLevel1.level3_model),
    };
  }

  if (configuredLevel3Model !== undefined) {
    return {
      level1: optionsOrLevel1?.trim() || IMGSTUDIO_FALLBACK_LEVEL_1_MODEL_ID,
      level2: configuredLevel2Model?.trim() || IMGSTUDIO_FALLBACK_LEVEL_2_MODEL_ID,
      level3: resolveImgStudioFallbackLevel3Model(configuredLevel3Model),
    };
  }

  return {
    level1: IMGSTUDIO_FALLBACK_LEVEL_1_MODEL_ID,
    level2: optionsOrLevel1?.trim() || IMGSTUDIO_FALLBACK_LEVEL_2_MODEL_ID,
    level3: resolveImgStudioFallbackLevel3Model(configuredLevel2Model),
  };
}

export function describeImgStudioModel(modelId: string): string {
  return `${resolveImgStudioModelName(modelId)} (${modelId})`;
}
