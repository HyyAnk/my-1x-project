import type {
  MascotRenderAspectRatio,
  MotionPromptStyleMood,
  MotionTemplateCategory,
  MotionTemplateId,
  MotionTemplateOptions,
  MotionTemplatePlacement,
} from "@studio/shared";

export type MotionPlacementFilter = "all" | MotionTemplatePlacement;
export type MotionCategoryFilter = "all" | MotionTemplateCategory;

export interface MotionFilterState {
  placement: MotionPlacementFilter;
  category: MotionCategoryFilter;
  searchQuery: string;
}

export interface MotionPreviewState {
  isLoading: boolean;
  htmlMarkup: string | null;
  error: string | null;
  aspectRatio: MascotRenderAspectRatio;
  replayKey: number;
}

export interface MotionGeneratorFormState {
  topicTitle: string;
  headlineText?: string;
  subheadlineText?: string;
  mood: MotionPromptStyleMood;
  aspectRatio: MascotRenderAspectRatio;
  includeAudioCue: boolean;
}

export interface MotionSelectionState {
  introTemplateId?: MotionTemplateId;
  outroTemplateId?: MotionTemplateId;
  introOptions?: MotionTemplateOptions;
  outroOptions?: MotionTemplateOptions;
  presetId?: string;
}
