export type VisualSpottingContrastCategory =
  | "diet_nutrition"
  | "biome_habitat"
  | "locomotion_physics"
  | "anatomy_hallmark"
  | "era_evolution"
  | "behavior_activity"
  | "popculture_power"
  | "material_element";

export interface VisualSpottingContrastDimension {
  id: string;
  category: VisualSpottingContrastCategory;
  label: string;
  description: string;
  example: string;
  applicableDomains?: string[];
}

export interface VisualSpottingHookTemplate {
  id: string;
  label: string;
  templateFormat: string;
  sampleQuestion: string;
  forbiddenKeywords: string[];
}

export interface VisualSpottingItemSeed {
  itemIndex: number;
  contrastDimension: VisualSpottingContrastDimension;
  hookTemplate: VisualSpottingHookTemplate;
  guidanceLine: string;
}
