import { useCallback, useState } from "react";
import { RECOMMENDED_MASCOT_PLACEMENT_PRESET, type MascotPlacementPreset } from "@studio/shared";
import type { StageAspectRatio, StagePosition } from "../types";

export function useStageTransformState(aspectRatio: StageAspectRatio = "16:9") {
  const [placements, setPlacements] = useState<Record<StageAspectRatio, MascotPlacementPreset>>({
    "16:9": { ...RECOMMENDED_MASCOT_PLACEMENT_PRESET },
    "9:16": { ...RECOMMENDED_MASCOT_PLACEMENT_PRESET },
  });

  const [showInIntro, setShowInIntro] = useState<boolean>(false);
  const [showInOutro, setShowInOutro] = useState<boolean>(false);
  const [showInQuestion, setShowInQuestion] = useState<boolean>(true);

  const currentPlacement = placements[aspectRatio] ?? RECOMMENDED_MASCOT_PLACEMENT_PRESET;

  const setPosition = useCallback(
    (position: StagePosition) => {
      setPlacements((prev) => ({
        ...prev,
        [aspectRatio]: { ...prev[aspectRatio], position },
      }));
    },
    [aspectRatio],
  );

  const setScale = useCallback(
    (scale: number) => {
      setPlacements((prev) => ({
        ...prev,
        [aspectRatio]: { ...prev[aspectRatio], scale },
      }));
    },
    [aspectRatio],
  );

  const setOffsetX = useCallback(
    (offset_x: number) => {
      setPlacements((prev) => ({
        ...prev,
        [aspectRatio]: { ...prev[aspectRatio], offset_x },
      }));
    },
    [aspectRatio],
  );

  const setOffsetY = useCallback(
    (offset_y: number) => {
      setPlacements((prev) => ({
        ...prev,
        [aspectRatio]: { ...prev[aspectRatio], offset_y },
      }));
    },
    [aspectRatio],
  );

  const setFlipHorizontal = useCallback(
    (updater: boolean | ((current: boolean) => boolean)) => {
      setPlacements((prev) => {
        const nextFlip = typeof updater === "function" ? updater(prev[aspectRatio].flip_x) : updater;
        return {
          ...prev,
          [aspectRatio]: { ...prev[aspectRatio], flip_x: nextFlip },
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

  const initPlacements = useCallback((newPlacements: Record<StageAspectRatio, MascotPlacementPreset>) => {
    setPlacements({ ...newPlacements });
  }, []);

  const copyPlacementFrom = useCallback(
    (sourceAspect: StageAspectRatio, targetAspect: StageAspectRatio) => {
      setPlacements((prev) => ({
        ...prev,
        [targetAspect]: { ...prev[sourceAspect] },
      }));
    },
    [],
  );

  return {
    placements,
    setPlacements,
    initPlacements,
    applyPlacement,
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
