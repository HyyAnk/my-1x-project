import { useCallback, useEffect, useRef, useState } from "react";
import {
  type MascotPlacementPreset,
  RECOMMENDED_MASCOT_PLACEMENT_PRESETS,
  resolveMascotStageDefaultPlacement,
} from "@studio/shared";
import { api } from "../../../api";
import type { Notice } from "../../../components/types";
import type { StageAspectRatio, StagePosition } from "../types";

type PlacementPresetOptions = {
  isOpen: boolean;
  aspectRatio?: StageAspectRatio;
  position: StagePosition;
  scale: number;
  offsetX: number;
  offsetY: number;
  flipHorizontal: boolean;
  applyPlacement?: (preset: MascotPlacementPreset) => void;
  setPosition: (position: StagePosition) => void;
  setScale: (scale: number) => void;
  setOffsetX: (offset: number) => void;
  setOffsetY: (offset: number) => void;
  setFlipHorizontal: (flipped: boolean) => void;
  onNotice: (notice: NonNullable<Notice>) => void;
  t: (path: string, params?: Record<string, string | number>) => string;
};

export function useMascotPlacementPreset(options: PlacementPresetOptions) {
  const activeAspect: StageAspectRatio = options.aspectRatio ?? "16:9";

  const [defaultPlacements, setDefaultPlacements] = useState<Record<StageAspectRatio, MascotPlacementPreset>>({
    "16:9": { ...RECOMMENDED_MASCOT_PLACEMENT_PRESETS["16:9"] },
    "9:16": { ...RECOMMENDED_MASCOT_PLACEMENT_PRESETS["9:16"] },
  });

  const defaultPlacement = defaultPlacements[activeAspect] ?? RECOMMENDED_MASCOT_PLACEMENT_PRESETS[activeAspect];

  const [presetReady, setPresetReady] = useState(false);
  const [presetLoading, setPresetLoading] = useState(false);
  const [presetSaving, setPresetSaving] = useState(false);
  const [presetLoadFailed, setPresetLoadFailed] = useState(false);
  const loadRevisionRef = useRef(0);
  const savingRef = useRef(false);

  const loadPreset = useCallback(async () => {
    const revision = ++loadRevisionRef.current;
    setPresetLoading(true);
    setPresetLoadFailed(false);
    try {
      const config = await api.config();
      if (revision !== loadRevisionRef.current) return;
      const stageSettings = config.mascot_stage;
      const p16 = resolveMascotStageDefaultPlacement(stageSettings, "16:9");
      const p9 = resolveMascotStageDefaultPlacement(stageSettings, "9:16");
      setDefaultPlacements({ "16:9": p16, "9:16": p9 });
    } catch {
      if (revision !== loadRevisionRef.current) return;
      setDefaultPlacements({
        "16:9": { ...RECOMMENDED_MASCOT_PLACEMENT_PRESETS["16:9"] },
        "9:16": { ...RECOMMENDED_MASCOT_PLACEMENT_PRESETS["9:16"] },
      });
      setPresetLoadFailed(true);
    } finally {
      if (revision === loadRevisionRef.current) {
        setPresetLoading(false);
        setPresetReady(true);
      }
    }
  }, []);

  useEffect(() => {
    if (!options.isOpen) {
      loadRevisionRef.current += 1;
      setPresetReady(false);
      setPresetLoading(false);
      setPresetLoadFailed(false);
      return;
    }
    void loadPreset();
    return () => {
      loadRevisionRef.current += 1;
    };
  }, [options.isOpen, loadPreset]);

  const applyPlacement = useCallback(
    (preset: MascotPlacementPreset) => {
      if (options.applyPlacement) {
        options.applyPlacement(preset);
        return;
      }
      options.setPosition(preset.position);
      options.setScale(preset.scale);
      options.setOffsetX(preset.offset_x);
      options.setOffsetY(preset.offset_y);
      options.setFlipHorizontal(preset.flip_x);
    },
    [options.applyPlacement, options.setFlipHorizontal, options.setOffsetX, options.setOffsetY, options.setPosition, options.setScale],
  );

  const applyDefaultPlacement = useCallback(() => {
    applyPlacement(defaultPlacement);
  }, [applyPlacement, defaultPlacement]);

  const saveCurrentAsDefault = useCallback(async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    loadRevisionRef.current += 1;
    setPresetLoading(false);
    setPresetSaving(true);
    const placement: MascotPlacementPreset = {
      position: options.position,
      scale: options.scale,
      offset_x: options.offsetX,
      offset_y: options.offsetY,
      flip_x: options.flipHorizontal,
    };
    try {
      const next16 = activeAspect === "16:9" ? placement : defaultPlacements["16:9"];
      const next9 = activeAspect === "9:16" ? placement : defaultPlacements["9:16"];

      const response = await api.saveMascotStageSettings({
        default_placement: next16,
        default_placements: {
          "16:9": next16,
          "9:16": next9,
        },
      });
      const stageSettings = response.mascot_stage;
      const p16 = resolveMascotStageDefaultPlacement(stageSettings, "16:9");
      const p9 = resolveMascotStageDefaultPlacement(stageSettings, "9:16");
      setDefaultPlacements({ "16:9": p16, "9:16": p9 });
      options.onNotice({ tone: "good", message: options.t("stageStudio.noticeDefaultPresetSaved") });
    } catch (error) {
      options.onNotice({
        tone: "bad",
        message: error instanceof Error ? error.message : options.t("stageStudio.noticeDefaultPresetSaveFailed"),
      });
    } finally {
      savingRef.current = false;
      setPresetSaving(false);
    }
  }, [activeAspect, defaultPlacements, options]);

  return {
    defaultPlacement,
    defaultPlacements,
    presetReady,
    presetLoading,
    presetSaving,
    presetLoadFailed,
    loadPreset,
    applyPlacement,
    applyDefaultPlacement,
    saveCurrentAsDefault,
  };
}
