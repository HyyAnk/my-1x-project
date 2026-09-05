import { useCallback, useState } from "react";
import {
  type MascotPlacementPreset,
  RECOMMENDED_MASCOT_PLACEMENT_PRESETS,
} from "@studio/shared";
import type { StageAspectRatio, StagePosition } from "../types";

export function useStageTransformState(aspectRatio: StageAspectRatio = "16:9") {
  const [placements, setPlacements] = useState<Record<StageAspectRatio, MascotPlacementPreset>>({
    "16:9": { ...RECOMMENDED_MASCOT_PLACEMENT_PRESETS["16:9"] },
    "9:16": { ...RECOMMENDED_MASCOT_PLACEMENT_PRESETS["9:16"] },
  });

  const [showInIntro, setShowInIntro] = useState<boolean>(false);
  const [showInOutro, setShowInOutro] = useState<boolean>(false);
  const [showInQuestion, setShowInQuestion] = useState<boolean>(true);

  const currentPlacement = placements[aspectRatio] ?? RECOMMENDED_MASCOT_PLACEMENT_PRESETS[aspectRatio];

  const setPosition = useCallback(
    (position: StagePosition) => {
      setPlacements((prev) => {
        const current = prev[aspectRatio] ?? RECOMMENDED_MASCOT_PLACEMENT_PRESETS[aspectRatio];
        return {
          ...prev,
          [aspectRatio]: { ...current, position },
        };
      });
    },
    [aspectRatio],
  );

  const setScale = useCallback(
    (scale: number) => {
      setPlacements((prev) => {
        const current = prev[aspectRatio] ?? RECOMMENDED_MASCOT_PLACEMENT_PRESETS[aspectRatio];
        return {
          ...prev,
          [aspectRatio]: { ...current, scale },
        };
      });
    },
    [aspectRatio],
  );

  const setOffsetX = useCallback(
    (offset_x: number) => {
      setPlacements((prev) => {
        const current = prev[aspectRatio] ?? RECOMMENDED_MASCOT_PLACEMENT_PRESETS[aspectRatio];
        return {
          ...prev,
          [aspectRatio]: { ...current, offset_x },
        };
      });
    },
    [aspectRatio],
  );

  const setOffsetY = useCallback(
    (offset_y: number) => {
      setPlacements((prev) => {
        const current = prev[aspectRatio] ?? RECOMMENDED_MASCOT_PLACEMENT_PRESETS[aspectRatio];
        return {
          ...prev,
          [aspectRatio]: { ...current, offset_y },
        };
      });
    },
    [aspectRatio],
  );

  const setFlipHorizontal = useCallback(
    (updater: boolean | ((current: boolean) => boolean)) => {
      setPlacements((prev) => {
        const current = prev[aspectRatio] ?? RECOMMENDED_MASCOT_PLACEMENT_PRESETS[aspectRatio];
        const nextFlip = typeof updater === "function" ? updater(current.flip_x) : updater;
        return {
          ...prev,
          [aspectRatio]: { ...current, flip_x: nextFlip },
        };
      });
    },
    [aspectRatio],
  );

  const applyPlacement = useCallback(
    (preset: MascotPlacementPreset) => {
      setPlacements((prev) => ({
        ...prev,
        [aspectRatio]: { ...preset },
      }));
    },
    [aspectRatio],
  );

  const resetPlacement = useCallback(
    (targetAspect?: StageAspectRatio, preset?: MascotPlacementPreset) => {
      const target = targetAspect ?? aspectRatio;
      const fallback = preset ?? RECOMMENDED_MASCOT_PLACEMENT_PRESETS[target];
      setPlacements((prev) => ({
        ...prev,
        [target]: { ...fallback },
      }));
    },
    [aspectRatio],
  );

  const resetAllPlacements = useCallback(
    (presets?: Partial<Record<StageAspectRatio, MascotPlacementPreset>>) => {
      setPlacements({
        "16:9": presets?.["16:9"] ? { ...presets["16:9"] } : { ...RECOMMENDED_MASCOT_PLACEMENT_PRESETS["16:9"] },
        "9:16": presets?.["9:16"] ? { ...presets["9:16"] } : { ...RECOMMENDED_MASCOT_PLACEMENT_PRESETS["9:16"] },
      });
    },
    [],
  );

  const initPlacements = useCallback((newPlacements: Partial<Record<StageAspectRatio, MascotPlacementPreset>>) => {
    setPlacements((prev) => ({
      "16:9": newPlacements["16:9"] ? { ...newPlacements["16:9"] } : prev["16:9"] ?? { ...RECOMMENDED_MASCOT_PLACEMENT_PRESETS["16:9"] },
      "9:16": newPlacements["9:16"] ? { ...newPlacements["9:16"] } : prev["9:16"] ?? { ...RECOMMENDED_MASCOT_PLACEMENT_PRESETS["9:16"] },
    }));
  }, []);

  const copyPlacementFrom = useCallback(
    (sourceAspect: StageAspectRatio, targetAspect: StageAspectRatio) => {
      setPlacements((prev) => {
        const source = prev[sourceAspect] ?? RECOMMENDED_MASCOT_PLACEMENT_PRESETS[sourceAspect];
        return {
          ...prev,
          [targetAspect]: { ...source },
        };
      });
    },
    [],
  );

  return {
    placements,
    setPlacements,
    initPlacements,
    applyPlacement,
    resetPlacement,
    resetAllPlacements,
    copyPlacementFrom,
    position: currentPlacement.position,
    setPosition,
    scale: currentPlacement.scale,
    setScale,
    offsetX: currentPlacement.offset_x,
    setOffsetX,
    offsetY: currentPlacement.offset_y,
    setOffsetY,
    flipHorizontal: currentPlacement.flip_x,
    setFlipHorizontal,
    showInIntro,
    setShowInIntro,
    showInOutro,
    setShowInOutro,
    showInQuestion,
    setShowInQuestion,
  };
}
