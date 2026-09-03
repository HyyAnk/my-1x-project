import { useMemo, useState, type MouseEvent } from "react";
import type { Notice } from "../../../components/types";
import { useTranslation } from "../../../i18n";
import type { SandboxDesignState } from "./useSandboxDesignState";
import type { SandboxMascotState } from "./useSandboxMascotState";
import type { SandboxBrandNameState } from "./useSandboxBrandNameState";

import { BUILT_IN_PRESETS, QuizPaletteIdSchema, type VisualPresetItem } from "@studio/shared";
import { useStylePresets } from "../../stylePresets/hooks/useStylePresets";
import { api } from "../../../api";
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
  const stylePresetApi = useStylePresets();
  const [localDraftPresets, setLocalDraftPresets] = useState<VisualPresetItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? (JSON.parse(saved) as VisualPresetItem[]) : [];
    } catch {
      return [];
    }
  });
  const apiAvailable = typeof api.stylePresets === "function";
  const customPresets = apiAvailable
    ? stylePresetApi.loading
      ? localDraftPresets
      : (stylePresetApi.presets as VisualPresetItem[])
    : localDraftPresets;
  const [presetModalOpen, setPresetModalOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");
  const [presetError, setPresetError] = useState<string | null>(null);

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
          (preset.background_style === undefined || preset.background_style === design.backgroundStyle) &&
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
      design.backgroundStyle,
      mascot.mascotId,
      brandName?.channelBrandName,
    ],
  );
  const activeCustomPreset = useMemo(
    () => customPresets.find((preset) => preset.id === matchedPreset?.id) || null,
    [customPresets, matchedPreset],
  );

  const persistPresets = (presets: VisualPresetItem[]) => {
    setLocalDraftPresets(presets);
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
    design.setBackgroundStyle(preset.background_style || "candy_rays");
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

  const handleSaveCustomPreset = async () => {
    const name = newPresetName.trim();
    if (!name) return;
    setPresetError(null);
    const parsedPalette = QuizPaletteIdSchema.safeParse(design.paletteId);
    const resolvedPalette: VisualPresetItem["palette_id"] =
      parsedPalette.success && parsedPalette.data !== "auto" ? parsedPalette.data : "lime";
    const resolvedTb = design.thinkingBarStyle === "auto" ? "star_slider" : design.thinkingBarStyle;
    const resolvedQb = design.questionBoxStyle === "auto" ? "candy_pop" : design.questionBoxStyle;
    const resolvedAc = design.answerCardStyle === "auto" ? "glossy_arcade" : design.answerCardStyle;
    const resolvedCb = design.counterStyle === "auto" ? "hanging_woodsign" : design.counterStyle;
    const resolvedBg = design.backgroundStyle === "auto" ? "candy_rays" : design.backgroundStyle;

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
      background_style: resolvedBg,
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
    try {
      await stylePresetApi.create({ ...newPreset, background_style: resolvedBg });
      setNewPresetName("");
      setPresetModalOpen(false);
      onNotice?.({ tone: "good", message: t("visualSandbox.noticeSavedPreset", { name }) });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save preset";
      setPresetError(message);
      onNotice?.({ tone: "bad", message });
    }
  };

  const handleDeleteCustomPreset = async (id: string, event?: MouseEvent) => {
    event?.stopPropagation();
    setPresetError(null);
    persistPresets(customPresets.filter((preset) => preset.id !== id));
    if (stylePresetApi.presets.some((preset) => preset.id === id)) {
      try {
        await stylePresetApi.remove(id);
      } catch (error) {
        persistPresets(customPresets);
        const message = error instanceof Error ? error.message : "Failed to delete preset";
        setPresetError(message);
        onNotice?.({ tone: "bad", message });
        return;
      }
    }
    onNotice?.({ tone: "neutral", message: t("visualSandbox.noticeDeletedPreset") });
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
    presetError,
    presetMutation: stylePresetApi.mutation,
  };
}

export type SandboxPresetsState = ReturnType<typeof useSandboxPresets>;
