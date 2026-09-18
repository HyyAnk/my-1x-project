import { useCallback, useMemo } from "react";
import { type MascotPlacementPreset, RECOMMENDED_MASCOT_PLACEMENT_PRESETS, resolveMascotStageDefaultPlacement } from "@studio/shared";
import { api } from "../../../api";
import type { Notice } from "../../../components/types";
import type { StageAspectRatio, StagePosition } from "../types";
import { useMascotPlacementPreset } from "./useMascotPlacementPreset";

export interface UseStageStudioPresetsOptions {
  isOpen: boolean;
  aspectRatio?: StageAspectRatio;
  position: StagePosition;
  scale: number;
  offsetX: number;
  offsetY: number;
  flipHorizontal: boolean;
  applyPlacement?: (preset: MascotPlacementPreset) => void;
  resetPlacement: (aspectRatio?: StageAspectRatio, preset?: MascotPlacementPreset) => void;
  setPosition: (position: StagePosition) => void;
  setScale: (scale: number) => void;
  setOffsetX: (offset: number) => void;
  setOffsetY: (offset: number) => void;
  setFlipHorizontal: (flipped: boolean) => void;
  setShowInIntro?: (show: boolean) => void;
  setShowInOutro?: (show: boolean) => void;
  setShowInQuestion?: (show: boolean) => void;
  onNotice: (notice: NonNullable<Notice>) => void;
  t: (path: string, params?: Record<string, string | number>) => string;
}

export function useStageStudioPresets({
  isOpen,
  aspectRatio = "16:9",
  position,
  scale,
  offsetX,
  offsetY,
  flipHorizontal,
  applyPlacement,
  resetPlacement,
  setPosition,
  setScale,
  setOffsetX,
  setOffsetY,
  setFlipHorizontal,
  setShowInIntro,
  setShowInOutro,
  setShowInQuestion,
  onNotice,
  t,
}: UseStageStudioPresetsOptions) {
  const placementPreset = useMascotPlacementPreset({
    isOpen,
    aspectRatio,
    position,
    scale,
    offsetX,
    offsetY,
    flipHorizontal,
    applyPlacement,
    setPosition,
    setScale,
    setOffsetX,
    setOffsetY,
    setFlipHorizontal,
    onNotice,
    t,
  });

  const isPresetDirty = useMemo(() => {
    if (!placementPreset.defaultPlacement) return false;
    const def = placementPreset.defaultPlacement;
    return (
      position !== def.position ||
      scale !== def.scale ||
      offsetX !== def.offset_x ||
      offsetY !== def.offset_y ||
      flipHorizontal !== def.flip_x
    );
  }, [position, scale, offsetX, offsetY, flipHorizontal, placementPreset.defaultPlacement]);

  const handleResetLayout = useCallback(() => {
    resetPlacement(aspectRatio, placementPreset.defaultPlacement);
    setShowInIntro?.(false);
    setShowInOutro?.(false);
    setShowInQuestion?.(true);
  }, [aspectRatio, placementPreset.defaultPlacement, resetPlacement, setShowInIntro, setShowInOutro, setShowInQuestion]);

  const deleteOrResetCustomPreset = useCallback(async () => {
    const factoryDefault = RECOMMENDED_MASCOT_PLACEMENT_PRESETS["16:9"];
    try {
      const response = await api.saveMascotStageSettings({
        default_placement: factoryDefault,
        default_placements: { "16:9": factoryDefault },
      });
      const stageSettings = response.mascot_stage;
      const p16 = resolveMascotStageDefaultPlacement(stageSettings, "16:9");
      placementPreset.applyPlacement(p16);
      onNotice({ tone: "good", message: t("stageStudio.noticeDefaultPresetSaved") });
    } catch (error) {
      onNotice({
        tone: "bad",
        message: error instanceof Error ? error.message : t("stageStudio.noticeDefaultPresetSaveFailed"),
      });
    }
  }, [onNotice, placementPreset, t]);

  return {
    ...placementPreset,
    isPresetDirty,
    handleResetLayout,
    deleteOrResetCustomPreset,
  };
}
