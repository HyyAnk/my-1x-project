import { useMemo, useState, type MouseEvent } from "react";
import type { Notice } from "../../../components/types";
import { useTranslation } from "../../../i18n";
import type { SandboxDesignState } from "./useSandboxDesignState";
import type { SandboxMascotState } from "./useSandboxMascotState";
import type { SandboxBrandNameState } from "./useSandboxBrandNameState";
import type { SandboxTransitionState } from "./useSandboxTransitionState";
import type { QuizPreviewLayoutId, VisualPresetItem } from "@studio/shared";
import { useStylePresets } from "../../stylePresets/hooks/useStylePresets";
import { api } from "../../../api";
import {
  applyPresetToStudio,
  createCustomPreset,
  duplicateCustomPreset,
  findMatchedPreset,
  loadStoredCustomPresets,
  localizeBuiltInPresets,
  saveStoredCustomPresets,
  updateCustomPreset,
} from "../services/sandboxPresetService";

export type { VisualPresetItem };

type UseSandboxPresetsInput = {
  design: SandboxDesignState;
  mascot: SandboxMascotState;
  brandName?: SandboxBrandNameState;
  transition?: Pick<SandboxTransitionState, "syncFromPreset">;
  onNotice?: (notice: NonNullable<Notice>) => void;
  onLayoutChange?: (layout: QuizPreviewLayoutId) => void;
};

export function useSandboxPresets({ design, mascot, brandName, transition, onNotice, onLayoutChange }: UseSandboxPresetsInput) {
  const { t } = useTranslation();
  const stylePresetApi = useStylePresets();
  const [localDraftPresets, setLocalDraftPresets] = useState<VisualPresetItem[]>(loadStoredCustomPresets);

  const apiAvailable = typeof api.stylePresets === "function";
  const customPresets = apiAvailable
    ? stylePresetApi.loading
      ? localDraftPresets
      : stylePresetApi.error
        ? localDraftPresets
        : (stylePresetApi.presets as VisualPresetItem[])
    : localDraftPresets;

  const [presetModalOpen, setPresetModalOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");
  const [presetError, setPresetError] = useState<string | null>(null);
  const [loadedPresetId, setLoadedPresetId] = useState<string | null>(null);

  const builtInPresets = useMemo<VisualPresetItem[]>(() => localizeBuiltInPresets(t), [t]);
  const allPresets = useMemo(() => [...builtInPresets, ...customPresets], [builtInPresets, customPresets]);

  const matchedPreset = useMemo(
    () => findMatchedPreset(allPresets, design, mascot.mascotId, brandName?.channelBrandName),
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
    saveStoredCustomPresets(presets);
  };

  const handleLoadPreset = (preset: VisualPresetItem) => {
    setLoadedPresetId(preset.id);
    applyPresetToStudio({ preset, design, mascot, brandName, onLayoutChange });
    if (transition?.syncFromPreset) {
      transition.syncFromPreset(preset);
    }
    if (onNotice) {
      onNotice({ tone: "good", message: t("visualSandbox.noticeLoadedPreset", { name: preset.name }) });
    }
  };

  const handleSaveCustomPreset = async () => {
    const name = newPresetName.trim();
    if (!name) return;
    setPresetError(null);

    const newPreset = createCustomPreset({
      name,
      defaultDesc: t("visualSandbox.customPresetDefaultDesc"),
      design,
      mascot,
      channelBrandName: brandName?.channelBrandName,
    });

    setLoadedPresetId(newPreset.id);
    persistPresets([newPreset, ...customPresets]);

    try {
      await stylePresetApi.create({ ...newPreset, background_style: newPreset.background_style || "candy_rays" });
      setNewPresetName("");
      setPresetModalOpen(false);
      onNotice?.({ tone: "good", message: t("visualSandbox.noticeSavedPreset", { name }) });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save preset";
      setPresetError(message);
      onNotice?.({ tone: "bad", message });
    }
  };

  const handleUpdateActivePreset = async (targetId?: string) => {
    const idToUpdate = targetId || loadedPresetId;
    if (!idToUpdate) return;
    const presetToUpdate = customPresets.find((p) => p.id === idToUpdate);
    if (!presetToUpdate) return;

    setPresetError(null);
    const updatedPreset = updateCustomPreset(presetToUpdate, design, mascot, brandName?.channelBrandName);
    const nextPresets = customPresets.map((p) => (p.id === idToUpdate ? updatedPreset : p));
    persistPresets(nextPresets);

    if (stylePresetApi.presets.some((p) => p.id === idToUpdate)) {
      try {
        await stylePresetApi.update(idToUpdate, {
          theme: updatedPreset.theme,
          palette_id: updatedPreset.palette_id,
          thinking_bar_style: updatedPreset.thinking_bar_style,
          question_box_style: updatedPreset.question_box_style,
          answer_card_style: updatedPreset.answer_card_style,
          counter_style: updatedPreset.counter_style,
          background_style: updatedPreset.background_style,
        });
        onNotice?.({
          tone: "good",
          message: t("visualSandbox.noticeUpdatedPreset", { name: presetToUpdate.name }),
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to update preset";
        setPresetError(message);
        onNotice?.({ tone: "bad", message });
      }
    } else {
      onNotice?.({
        tone: "good",
        message: t("visualSandbox.noticeUpdatedPreset", { name: presetToUpdate.name }),
      });
    }
  };

  const handleDuplicateCustomPreset = async (preset: VisualPresetItem) => {
    setPresetError(null);
    const suffix = t("visualSandbox.copySuffix") || "Copy";
    const duplicatedPreset = duplicateCustomPreset(preset, suffix);
    persistPresets([duplicatedPreset, ...customPresets]);

    try {
      await stylePresetApi.create({
        ...duplicatedPreset,
        name: duplicatedPreset.name,
        background_style: duplicatedPreset.background_style || "candy_rays",
      });
      onNotice?.({ tone: "good", message: t("visualSandbox.noticeSavedPreset", { name: duplicatedPreset.name }) });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to duplicate preset";
      setPresetError(message);
      onNotice?.({ tone: "bad", message });
    }
  };

  const handleUpdatePresetMetadata = async (id: string, name: string, description?: string) => {
    setPresetError(null);
    const trimmed = name.trim();
    if (!trimmed) return;
    const nextPresets = customPresets.map((p) =>
      p.id === id ? { ...p, name: trimmed, description: description !== undefined ? description : p.description } : p,
    );
    persistPresets(nextPresets);

    if (stylePresetApi.presets.some((p) => p.id === id)) {
      try {
        await stylePresetApi.update(id, { name: trimmed, description });
        onNotice?.({ tone: "good", message: t("visualSandbox.noticeUpdatedPreset", { name: trimmed }) });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to update preset metadata";
        setPresetError(message);
        onNotice?.({ tone: "bad", message });
      }
    }
  };

  const handleDeleteCustomPreset = async (id: string, event?: MouseEvent) => {
    event?.stopPropagation();
    setPresetError(null);
    if (loadedPresetId === id) {
      setLoadedPresetId(null);
    }
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

  const isLoadedPresetCustom = Boolean(loadedPresetId && customPresets.some((p) => p.id === loadedPresetId));
  const loadedPreset = allPresets.find((p) => p.id === loadedPresetId) || null;
  const canUpdateActivePreset = isLoadedPresetCustom && (!matchedPreset || matchedPreset.id !== loadedPresetId);

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
    loadedPresetId,
    loadedPreset,
    isLoadedPresetCustom,
    canUpdateActivePreset,
    handleLoadPreset,
    handleSaveCustomPreset,
    handleUpdateActivePreset,
    handleDuplicateCustomPreset,
    handleUpdatePresetMetadata,
    handleDeleteCustomPreset,
    presetError,
    presetMutation: stylePresetApi.mutation,
    refreshPresets: stylePresetApi.refresh,
  };
}

export type SandboxPresetsState = ReturnType<typeof useSandboxPresets>;
