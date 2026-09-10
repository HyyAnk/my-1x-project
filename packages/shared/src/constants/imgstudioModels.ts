/**
 * Catalog and helper utilities for ImgStudio fallback image models.
 */

export type ImgStudioResolution = "1K" | "2K" | "4K";

export interface ImgStudioModelDefinition {
  readonly id: string;
  readonly name: string;
  readonly max_resolution: ImgStudioResolution;
}

export const IMGSTUDIO_DEFAULT_MODEL_ID = "2d059365-a09a-4fd5-aa9e-b5335d09bbe9";

export const IMGSTUDIO_MODELS: readonly ImgStudioModelDefinition[] = [
  {
    id: "2d059365-a09a-4fd5-aa9e-b5335d09bbe9",
    name: "Qwen Image 3.0 Pro",
    max_resolution: "2K",
  },
  {
    id: "686ef278-e903-49a0-9e3c-2401fd396d22",
    name: "GPT-Image-2",
    max_resolution: "2K",
  },
  {
    id: "2924ac96-8708-4e2a-8700-df3eebbfa380",
    name: "GPT-Image-2-Quality-Slow",
    max_resolution: "2K",
  },
  {
    id: "c604136c-0756-49a0-a826-cfc72b68cb9a",
    name: "Gemini-3.1-Flash-Image",
    max_resolution: "2K",
  },
  {
    id: "301fed0f-82b9-47f7-b2a0-e710ae5e4d55",
    name: "Gemini-3-Pro-Image",
    max_resolution: "2K",
  },
  {
    id: "3a869437-b87a-460b-9fe7-23c27d234f3a",
    name: "Gemini-2.5-Flash-Image",
    max_resolution: "2K",
  },
  {
    id: "618e7813-24e8-462c-a3d4-0a0a509be700",
    name: "Grok-Imagine-Image-2.0",
    max_resolution: "1K",
  },
  {
    id: "flow-nano-banana-2",
    name: "Flow · Nano Banana 2",
    max_resolution: "2K",
  },
  {
    id: "flow-nano-banana-pro",
    name: "Flow · Nano Banana Pro",
    max_resolution: "2K",
  },
  {
    id: "flow-nano-banana-2-lite",
    name: "Flow · Nano Banana 2 Lite",
    max_resolution: "2K",
  },
] as const;

const RESOLUTION_LEVEL_MAP: Record<string, number> = {
  "1K": 1,
  "2K": 2,
  "4K": 3,
};

/**
 * Resolves the display name for a given ImgStudio model ID.
 * Returns the provided modelId if not found in the catalog.
 */
export function resolveImgStudioModelName(modelId: string): string {
  const model = IMGSTUDIO_MODELS.find((m) => m.id === modelId);
  return model ? model.name : modelId;
}

/**
 * Checks whether the requested resolution is supported by the specified ImgStudio model.
 */
export function isSupportedImgStudioResolution(modelId: string, resolution: string): boolean {
  const model = IMGSTUDIO_MODELS.find((m) => m.id === modelId);
  if (!model) {
    return false;
  }

  const requestedLevel = RESOLUTION_LEVEL_MAP[resolution.trim().toUpperCase()];
  const maxLevel = RESOLUTION_LEVEL_MAP[model.max_resolution];

  if (!requestedLevel || !maxLevel) {
    return false;
  }

  return requestedLevel <= maxLevel;
}
