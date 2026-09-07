import {
  BUILT_IN_PRESETS,
  QuizPaletteIdSchema,
  type QuizPreviewLayoutId,
  type VisualPresetItem,
} from "@studio/shared";
import type { SandboxDesignState } from "../hooks/useSandboxDesignState";
import type { SandboxMascotState } from "../hooks/useSandboxMascotState";
import type { SandboxBrandNameState } from "../hooks/useSandboxBrandNameState";

export const SANDBOX_PRESETS_STORAGE_KEY = "studio-visual-custom-presets";

export function loadStoredCustomPresets(): VisualPresetItem[] {
  try {
    const saved = localStorage.getItem(SANDBOX_PRESETS_STORAGE_KEY);
    return saved ? (JSON.parse(saved) as VisualPresetItem[]) : [];
  } catch {
    return [];
  }
}

export function saveStoredCustomPresets(presets: VisualPresetItem[]): void {
  try {
    localStorage.setItem(SANDBOX_PRESETS_STORAGE_KEY, JSON.stringify(presets));
  } catch {
    // The in-memory preset remains usable when storage is unavailable.
  }
}

export function localizeBuiltInPresets(t: (key: string) => string): VisualPresetItem[] {
  return BUILT_IN_PRESETS.map((preset) => ({
    ...preset,
    name: (preset.nameKey ? t(preset.nameKey) : "") || preset.name,
    description: (preset.descKey ? t(preset.descKey) : "") || preset.description,
  }));
}

export function findMatchedPreset(
  allPresets: VisualPresetItem[],
  design: SandboxDesignState,
  mascotId: string,
  channelBrandName?: string,
): VisualPresetItem | undefined {
  return allPresets.find(
    (preset) =>
      preset.palette_id === design.paletteId &&
      preset.thinking_bar_style === design.thinkingBarStyle &&
      preset.question_box_style === design.questionBoxStyle &&
      preset.answer_card_style === design.answerCardStyle &&
      preset.counter_style === design.counterStyle &&
      (preset.background_style === undefined || preset.background_style === design.backgroundStyle) &&
      (preset.mascot_id === undefined || preset.mascot_id === mascotId) &&
      (preset.channel_brand_name === undefined || preset.channel_brand_name === channelBrandName),
  );
}

export function resolvePresetStyles(design: SandboxDesignState) {
  const parsedPalette = QuizPaletteIdSchema.safeParse(design.paletteId);
  const resolvedPalette: VisualPresetItem["palette_id"] =
    parsedPalette.success && parsedPalette.data !== "auto" ? parsedPalette.data : "lime";
  const resolvedTb = design.thinkingBarStyle === "auto" ? "star_slider" : design.thinkingBarStyle;
  const resolvedQb = design.questionBoxStyle === "auto" ? "candy_pop" : design.questionBoxStyle;
  const resolvedAc = design.answerCardStyle === "auto" ? "glossy_arcade" : design.answerCardStyle;
  const resolvedCb = design.counterStyle === "auto" ? "hanging_woodsign" : design.counterStyle;
  const resolvedBg = design.backgroundStyle === "auto" ? "candy_rays" : design.backgroundStyle;

  return {
    palette_id: resolvedPalette,
    thinking_bar_style: resolvedTb,
    question_box_style: resolvedQb,
    answer_card_style: resolvedAc,
    counter_style: resolvedCb,
    background_style: resolvedBg,
  };
}

export function createCustomPreset({
  name,
  defaultDesc,
  design,
  mascot,
  channelBrandName,
}: {
  name: string;
  defaultDesc: string;
  design: SandboxDesignState;
  mascot: SandboxMascotState;
  channelBrandName?: string;
}): VisualPresetItem {
  const resolved = resolvePresetStyles(design);
  return {
    id: `custom_${Date.now()}`,
    name,
    icon: "🎨",
    description: defaultDesc,
    theme: design.theme,
    preview_layout_id: design.layoutId,
    ...resolved,
    mascot_id: mascot.mascotId,
    mascot_position: mascot.mascotPosition,
    mascot_scale: mascot.mascotScale,
    mascot_offset_x: mascot.mascotOffsetX,
    mascot_offset_y: mascot.mascotOffsetY,
    mascot_flip_x: mascot.mascotFlipX,
    channel_brand_name: channelBrandName,
    isBuiltIn: false,
  };
}

export function updateCustomPreset(
  presetToUpdate: VisualPresetItem,
  design: SandboxDesignState,
  mascot: SandboxMascotState,
  channelBrandName?: string,
): VisualPresetItem {
  const resolved = resolvePresetStyles(design);
  return {
    ...presetToUpdate,
    theme: design.theme,
    preview_layout_id: design.layoutId,
    ...resolved,
    mascot_id: mascot.mascotId,
    mascot_position: mascot.mascotPosition,
    mascot_scale: mascot.mascotScale,
    mascot_offset_x: mascot.mascotOffsetX,
    mascot_offset_y: mascot.mascotOffsetY,
    mascot_flip_x: mascot.mascotFlipX,
    channel_brand_name: channelBrandName,
  };
}

export function duplicateCustomPreset(preset: VisualPresetItem, suffix: string): VisualPresetItem {
  const newName = `${preset.name} (${suffix})`;
  return {
    ...preset,
    id: `custom_${Date.now()}`,
    name: newName,
    isBuiltIn: false,
  };
}

export function applyPresetToStudio({
  preset,
  design,
  mascot,
  brandName,
  onLayoutChange,
}: {
  preset: VisualPresetItem;
  design: SandboxDesignState;
  mascot: SandboxMascotState;
  brandName?: SandboxBrandNameState;
  onLayoutChange?: (layout: QuizPreviewLayoutId) => void;
}): void {
  design.setPaletteId(preset.palette_id);
  design.setThinkingBarStyle(preset.thinking_bar_style);
  design.setQuestionBoxStyle(preset.question_box_style);
  design.setAnswerCardStyle(preset.answer_card_style || "glossy_arcade");
  design.setCounterStyle(preset.counter_style);
  design.setBackgroundStyle(preset.background_style || "candy_rays");
  const targetLayout = (preset.preview_layout_id ?? preset.layout_id) as QuizPreviewLayoutId | undefined;
  if (targetLayout && targetLayout !== "baseline") {
    if (onLayoutChange) {
      onLayoutChange(targetLayout);
    } else {
      design.setLayoutId(targetLayout);
    }
  }
  if (preset.mascot_id !== undefined) mascot.setMascotId(preset.mascot_id || "none");
  if (preset.mascot_position) mascot.setMascotPosition(preset.mascot_position);
  if (preset.mascot_scale !== undefined) mascot.setMascotScale(preset.mascot_scale);
  if (preset.mascot_offset_x !== undefined) mascot.setMascotOffsetX(preset.mascot_offset_x);
  if (preset.mascot_offset_y !== undefined) mascot.setMascotOffsetY(preset.mascot_offset_y);
  if (preset.mascot_flip_x !== undefined) mascot.setMascotFlipX(preset.mascot_flip_x);
  if (preset.channel_brand_name !== undefined && brandName) {
    brandName.setChannelBrandName(preset.channel_brand_name);
  }
}
