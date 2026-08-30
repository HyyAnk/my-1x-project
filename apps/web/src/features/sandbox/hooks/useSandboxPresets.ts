import { useMemo, useState, type MouseEvent } from "react";
import type { Notice } from "../../../components/types";
import { useTranslation } from "../../../i18n";
import type { SandboxDesignState } from "./useSandboxDesignState";
import type { SandboxMascotState } from "./useSandboxMascotState";
import type { SandboxBrandNameState } from "./useSandboxBrandNameState";

import { BUILT_IN_PRESETS, QuizPaletteIdSchema, resolvePresetPreviewLayoutId, type VisualPresetItem } from "@studio/shared";
export type { VisualPresetItem };

const STORAGE_KEY = "studio-visual-custom-presets";

type UseSandboxPresetsInput = {
  design: SandboxDesignState;
  mascot: SandboxMascotState;
  brandName?: SandboxBrandNameState;
  onNotice?: (notice: NonNullable<Notice>) => void;
};

export function useSandboxPresets({ design, mascot, brandName, onNotice }: UseSandboxPresetsInput) {
  const { t } = useTranslation();
  const [customPresets, setCustomPresets] = useState<VisualPresetItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? (JSON.parse(saved) as VisualPresetItem[]) : [];
    } catch {
      return [];
    }
  });
  const [presetModalOpen, setPresetModalOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");

  const builtInPresets = useMemo<VisualPresetItem[]>(
    () =>
      BUILT_IN_PRESETS.map((preset) => ({
        ...preset,
        name: (preset.nameKey ? t(preset.nameKey) : "") || preset.name,
        description: (preset.descKey ? t(preset.descKey) : "") || preset.description,
      })),
    [t],
  );
  const allPresets = useMemo(() => [...builtInPresets, ...customPresets], [builtInPresets, customPresets]);
  const matchedPreset = useMemo(
    () =>
      allPresets.find(
        (preset) =>
          preset.palette_id === design.paletteId &&
          preset.thinking_bar_style === design.thinkingBarStyle &&
          preset.question_box_style === design.questionBoxStyle &&
          preset.answer_card_style === design.answerCardStyle &&
          preset.counter_style === design.counterStyle &&
          (preset.mascot_id === undefined || preset.mascot_id === mascot.mascotId) &&
          (preset.channel_brand_name === undefined || preset.channel_brand_name === brandName?.channelBrandName),
      ),
    [
      allPresets,
      design.paletteId,
      design.thinkingBarStyle,
      design.questionBoxStyle,
      design.answerCardStyle,
      design.counterStyle,
      mascot.mascotId,
      brandName?.channelBrandName,
    ],
  );
  const activeCustomPreset = useMemo(
    () => customPresets.find((preset) => preset.id === matchedPreset?.id) || null,
    [customPresets, matchedPreset],
  );

  const persistPresets = (presets: VisualPresetItem[]) => {
    setCustomPresets(presets);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
    } catch {
      // The in-memory preset remains usable when storage is unavailable.
    }
  };

  const handleLoadPreset = (preset: VisualPresetItem) => {
    design.setPaletteId(preset.palette_id);
    design.setThinkingBarStyle(preset.thinking_bar_style);
    design.setQuestionBoxStyle(preset.question_box_style);
    design.setAnswerCardStyle(preset.answer_card_style || "glossy_arcade");
    design.setCounterStyle(preset.counter_style);
    if (preset.mascot_id !== undefined) mascot.setMascotId(preset.mascot_id || "none");
    if (preset.mascot_position) mascot.setMascotPosition(preset.mascot_position);
    if (preset.mascot_scale !== undefined) mascot.setMascotScale(preset.mascot_scale);
    if (preset.mascot_offset_x !== undefined) mascot.setMascotOffsetX(preset.mascot_offset_x);
    if (preset.mascot_offset_y !== undefined) mascot.setMascotOffsetY(preset.mascot_offset_y);
    if (preset.mascot_flip_x !== undefined) mascot.setMascotFlipX(preset.mascot_flip_x);
    if (preset.channel_brand_name !== undefined && brandName) {
      brandName.setChannelBrandName(preset.channel_brand_name);
    }
    if (onNotice) onNotice({ tone: "good", message: t("visualSandbox.noticeLoadedPreset", { name: preset.name }) });
  };

  const handleSaveCustomPreset = () => {
    const name = newPresetName.trim();
    if (!name) return;
    const parsedPalette = QuizPaletteIdSchema.safeParse(design.paletteId);
    const resolvedPalette: VisualPresetItem["palette_id"] =
      parsedPalette.success && parsedPalette.data !== "auto" ? parsedPalette.data : "lime";
    const resolvedTb = design.thinkingBarStyle === "auto" ? "star_slider" : design.thinkingBarStyle;
    const resolvedQb = design.questionBoxStyle === "auto" ? "candy_pop" : design.questionBoxStyle;
    const resolvedAc = design.answerCardStyle === "auto" ? "glossy_arcade" : design.answerCardStyle;
    const resolvedCb = design.counterStyle === "auto" ? "hanging_woodsign" : design.counterStyle;

    const newPreset: VisualPresetItem = {
      id: `custom_${Date.now()}`,
      name,
      icon: "🎨",
      description: t("visualSandbox.customPresetDefaultDesc"),
      theme: design.theme,
      palette_id: resolvedPalette,
      preview_layout_id: design.layoutId,
      thinking_bar_style: resolvedTb,
      question_box_style: resolvedQb,
      answer_card_style: resolvedAc,
      counter_style: resolvedCb,
      mascot_id: mascot.mascotId,
      mascot_position: mascot.mascotPosition,
      mascot_scale: mascot.mascotScale,
      mascot_offset_x: mascot.mascotOffsetX,
      mascot_offset_y: mascot.mascotOffsetY,
      mascot_flip_x: mascot.mascotFlipX,
      channel_brand_name: brandName?.channelBrandName,
      isBuiltIn: false,
    };
    persistPresets([newPreset, ...customPresets]);
    setNewPresetName("");
    setPresetModalOpen(false);
    if (onNotice) onNotice({ tone: "good", message: t("visualSandbox.noticeSavedPreset", { name }) });
  };

  const handleDeleteCustomPreset = (id: string, event?: MouseEvent) => {
    event?.stopPropagation();
    persistPresets(customPresets.filter((preset) => preset.id !== id));
    if (onNotice) onNotice({ tone: "neutral", message: t("visualSandbox.noticeDeletedPreset") });
  };

  return {
    customPresets,
    presetModalOpen,
    setPresetModalOpen,
    newPresetName,
    setNewPresetName,
    builtInPresets,
    allPresets,
    matchedPreset,
    activeCustomPreset,
    handleLoadPreset,
    handleSaveCustomPreset,
    handleDeleteCustomPreset,
  };
}

export type SandboxPresetsState = ReturnType<typeof useSandboxPresets>;
