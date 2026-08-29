import { useCallback, useEffect, useRef, useState } from "react";
import { RECOMMENDED_MASCOT_PLACEMENT_PRESET, type MascotPlacementPreset } from "@studio/shared";
import { api } from "../../../api";
import type { Notice } from "../../../components/types";
import type { StagePosition } from "../types";

type PlacementPresetOptions = {
  isOpen: boolean;
  position: StagePosition;
  scale: number;
  offsetX: number;
  offsetY: number;
  setPosition: (position: StagePosition) => void;
  setScale: (scale: number) => void;
  setOffsetX: (offset: number) => void;
  setOffsetY: (offset: number) => void;
  onNotice: (notice: NonNullable<Notice>) => void;
  t: (path: string, params?: Record<string, string | number>) => string;
};

const FALLBACK_PRESET: MascotPlacementPreset = { ...RECOMMENDED_MASCOT_PLACEMENT_PRESET };

export function useMascotPlacementPreset(options: PlacementPresetOptions) {
  const [defaultPlacement, setDefaultPlacement] = useState<MascotPlacementPreset>(FALLBACK_PRESET);
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
      setDefaultPlacement(config.mascot_stage?.default_placement ?? FALLBACK_PRESET);
    } catch {
      if (revision !== loadRevisionRef.current) return;
      setDefaultPlacement(FALLBACK_PRESET);
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
      options.setPosition(preset.position);
      options.setScale(preset.scale);
      options.setOffsetX(preset.offset_x);
      options.setOffsetY(preset.offset_y);
    },
    [options.setOffsetX, options.setOffsetY, options.setPosition, options.setScale],
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
    };
    try {
      const response = await api.saveMascotStageSettings({ default_placement: placement });
      setDefaultPlacement(response.mascot_stage.default_placement);
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
  }, [options]);

  return {
    defaultPlacement,
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
