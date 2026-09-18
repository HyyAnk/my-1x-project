import { useState, type MouseEvent } from "react";
import { useTranslation } from "../../../i18n";
import type { VisualPresetItem } from "@studio/shared";
import { useStylePresets } from "../../stylePresets/hooks/useStylePresets";
import { api } from "../../../api";
import {
  createCustomPresetItem,
  duplicateCustomPreset,
  loadStoredCustomPresets,
  saveStoredCustomPresets,
  updateCustomPreset,
  resolveCustomPresets,
  resolvePresetTransitions,
  toPresetCreatePayload,
  toPresetUpdatePayload,
  type UseSandboxPresetCrudInput,
} from "./useSandboxPresetCrudHelpers";

export type { UseSandboxPresetCrudInput };

export function useSandboxPresetCrud({
  design,
  mascot,
  brandName,
  transition,
  onNotice,
  loadedPresetId,
  onSelectLoadedPreset,
  newPresetName,
  onSaveSuccess,
}: UseSandboxPresetCrudInput) {
  const { t } = useTranslation();
  const stylePresetApi = useStylePresets();
  const [localDraftPresets, setLocalDraftPresets] = useState<VisualPresetItem[]>(loadStoredCustomPresets);
  const [presetError, setPresetError] = useState<string | null>(null);

  const apiAvailable = typeof api.stylePresets === "function";
  const customPresets = resolveCustomPresets(
    apiAvailable,
    stylePresetApi.loading,
    stylePresetApi.error,
    stylePresetApi.presets,
    localDraftPresets,
  );

  const persistPresets = (presets: VisualPresetItem[]) => {
    setLocalDraftPresets(presets);
    saveStoredCustomPresets(presets);
  };

  const handleError = (error: unknown, fallback: string) => {
    const message = error instanceof Error ? error.message : fallback;
    setPresetError(message);
    onNotice?.({ tone: "bad", message });
  };

  const handleSaveCustomPreset = async () => {
    const name = newPresetName.trim();
    if (!name) return;
    setPresetError(null);
    const { preset: newPreset, currentTransitions } = createCustomPresetItem({
      name,
      design,
      mascot,
      channelBrandName: brandName?.channelBrandName,
      transition,
      defaultDesc: t("visualSandbox.customPresetDefaultDesc"),
    });
    onSelectLoadedPreset(newPreset.id);
    persistPresets([newPreset, ...customPresets]);
    try {
      await stylePresetApi.create(toPresetCreatePayload(newPreset, currentTransitions));
      onSaveSuccess?.();
      onNotice?.({ tone: "good", message: t("visualSandbox.noticeSavedPreset", { name }) });
    } catch (error) {
      handleError(error, "Failed to save preset");
    }
  };

  const handleUpdateActivePreset = async (targetId?: string) => {
    const idToUpdate = targetId || loadedPresetId;
    if (!idToUpdate) return;
    const presetToUpdate = customPresets.find((p) => p.id === idToUpdate);
    if (!presetToUpdate) return;
    setPresetError(null);
    const currentTransitions = resolvePresetTransitions(transition) ?? presetToUpdate.transitions;
    const updatedPreset = updateCustomPreset(presetToUpdate, design, mascot, brandName?.channelBrandName, currentTransitions);
    persistPresets(customPresets.map((p) => (p.id === idToUpdate ? updatedPreset : p)));

    if (stylePresetApi.presets.some((p) => p.id === idToUpdate)) {
      try {
        await stylePresetApi.update(idToUpdate, toPresetUpdatePayload(updatedPreset));
      } catch (error) {
        handleError(error, "Failed to update preset");
        return;
      }
    }
    onNotice?.({ tone: "good", message: t("visualSandbox.noticeUpdatedPreset", { name: presetToUpdate.name }) });
  };

  const handleDuplicateCustomPreset = async (preset: VisualPresetItem) => {
    setPresetError(null);
    const duplicatedPreset = duplicateCustomPreset(preset, t("visualSandbox.copySuffix") || "Copy");
    persistPresets([duplicatedPreset, ...customPresets]);
    try {
      await stylePresetApi.create(toPresetCreatePayload(duplicatedPreset));
      onNotice?.({ tone: "good", message: t("visualSandbox.noticeSavedPreset", { name: duplicatedPreset.name }) });
    } catch (error) {
      handleError(error, "Failed to duplicate preset");
    }
  };

  const handleUpdatePresetMetadata = async (id: string, name: string, description?: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setPresetError(null);
    persistPresets(customPresets.map((p) => (p.id === id ? { ...p, name: trimmed, description: description ?? p.description } : p)));
    if (stylePresetApi.presets.some((p) => p.id === id)) {
      try {
        await stylePresetApi.update(id, { name: trimmed, description });
        onNotice?.({ tone: "good", message: t("visualSandbox.noticeUpdatedPreset", { name: trimmed }) });
      } catch (error) {
        handleError(error, "Failed to update preset metadata");
      }
    }
  };

  const handleDeleteCustomPreset = async (id: string, event?: MouseEvent) => {
    event?.stopPropagation();
    setPresetError(null);
    if (loadedPresetId === id) onSelectLoadedPreset(null);
    persistPresets(customPresets.filter((preset) => preset.id !== id));
    if (stylePresetApi.presets.some((preset) => preset.id === id)) {
      try {
        await stylePresetApi.remove(id);
      } catch (error) {
        persistPresets(customPresets);
        handleError(error, "Failed to delete preset");
        return;
      }
    }
    onNotice?.({ tone: "neutral", message: t("visualSandbox.noticeDeletedPreset") });
  };

  return {
    customPresets,
    presetError,
    presetMutation: stylePresetApi.mutation,
    refreshPresets: stylePresetApi.refresh,
    handleSaveCustomPreset,
    handleUpdateActivePreset,
    handleDuplicateCustomPreset,
    handleUpdatePresetMetadata,
    handleDeleteCustomPreset,
  };
}
