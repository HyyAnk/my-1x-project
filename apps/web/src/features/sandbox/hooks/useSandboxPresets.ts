import { useMemo, useState } from "react";
import type { Notice } from "../../../components/types";
import { useTranslation } from "../../../i18n";
import type { SandboxDesignState } from "./useSandboxDesignState";
import type { SandboxMascotState } from "./useSandboxMascotState";
import type { SandboxBrandNameState } from "./useSandboxBrandNameState";
import type { SandboxTransitionState } from "./useSandboxTransitionState";
import type { QuizPreviewLayoutId, VisualPresetItem } from "@studio/shared";
import { applyPresetToStudio, findMatchedPreset, localizeBuiltInPresets } from "../services/sandboxPresetService";
import { useSandboxPresetCrud } from "./useSandboxPresetCrud";

export type { VisualPresetItem };

type UseSandboxPresetsInput = {
  design: SandboxDesignState;
  mascot: SandboxMascotState;
  brandName?: SandboxBrandNameState;
  transition?: Pick<SandboxTransitionState, "syncFromPreset"> &
    Partial<Pick<SandboxTransitionState, "transitionId" | "transitionDuration">>;
  onNotice?: (notice: NonNullable<Notice>) => void;
  onLayoutChange?: (layout: QuizPreviewLayoutId) => void;
};

export function useSandboxPresets({ design, mascot, brandName, transition, onNotice, onLayoutChange }: UseSandboxPresetsInput) {
  const { t } = useTranslation();
  const [presetModalOpen, setPresetModalOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");
  const [loadedPresetId, setLoadedPresetId] = useState<string | null>(null);

  const crud = useSandboxPresetCrud({
    design,
    mascot,
    brandName,
    transition,
    onNotice,
    loadedPresetId,
    onSelectLoadedPreset: setLoadedPresetId,
    newPresetName,
    onSaveSuccess: () => {
      setNewPresetName("");
      setPresetModalOpen(false);
    },
  });

  const builtInPresets = useMemo<VisualPresetItem[]>(() => localizeBuiltInPresets(t), [t]);
  const allPresets = useMemo(() => [...builtInPresets, ...crud.customPresets], [builtInPresets, crud.customPresets]);

  const matchedPreset = useMemo(
    () =>
      findMatchedPreset(
        allPresets,
        design,
        mascot.mascotId,
        brandName?.channelBrandName,
        transition?.transitionId,
        transition?.transitionDuration,
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
      transition?.transitionId,
      transition?.transitionDuration,
    ],
  );

  const activeCustomPreset = useMemo(
    () => crud.customPresets.find((preset) => preset.id === matchedPreset?.id) || null,
    [crud.customPresets, matchedPreset],
  );

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

  const isLoadedPresetCustom = Boolean(loadedPresetId && crud.customPresets.some((p) => p.id === loadedPresetId));
  const loadedPreset = allPresets.find((p) => p.id === loadedPresetId) || null;
  const canUpdateActivePreset = isLoadedPresetCustom && (!matchedPreset || matchedPreset.id !== loadedPresetId);

  return {
    ...crud,
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
  };
}

export type SandboxPresetsState = ReturnType<typeof useSandboxPresets>;
