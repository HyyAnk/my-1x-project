import { useState } from "react";
import type { MascotActionType, MascotProfile } from "@studio/shared";
import type { Notice } from "../../../components/types";
import { useTranslation } from "../../../i18n";
import { useMascotMotionPresets } from "./useMascotMotionPresets";
import { useMascotMotionCalibration } from "./useMascotMotionCalibration";

export type UseMascotMotionStudioProps = {
  editingMascot: MascotProfile | null;
  setEditingMascot: (mascot: MascotProfile | null) => void;
  onNotice: (notice: NonNullable<Notice>) => void;
  onRefreshChannels: () => Promise<void>;
  onMascotsChanged: () => Promise<void>;
  setBusyAction: (action: string | null) => void;
  setGeneratorStep: (step: 1 | 2 | 3) => void;
};

export function useMascotMotionStudio({
  editingMascot,
  setEditingMascot,
  onNotice,
  onRefreshChannels,
  onMascotsChanged,
  setBusyAction,
  setGeneratorStep,
}: UseMascotMotionStudioProps) {
  const { t } = useTranslation();

  const [activePreviewAction, setActivePreviewAction] = useState<MascotActionType>("idle");
  const [isPlaying, setIsPlaying] = useState(true);
  const [canvasBackground, setCanvasBackground] = useState<"dark" | "light" | "grid" | "clean">("dark");
  const [canvasZoom, setCanvasZoom] = useState<number>(1.0);
  const [flipHorizontal, setFlipHorizontal] = useState(false);

  const presets = useMascotMotionPresets(editingMascot, setEditingMascot, onNotice);

  const calibration = useMascotMotionCalibration({
    editingMascot,
    setEditingMascot,
    activePreviewAction,
    actionMotions: presets.actionMotions,
    actionSpeeds: presets.actionSpeeds,
    actionIntensities: presets.actionIntensities,
    onNotice,
    onRefreshChannels,
    onMascotsChanged,
    setBusyAction,
    setGeneratorStep,
    t,
  });

  return {
    activePreviewAction,
    setActivePreviewAction,
    isPlaying,
    setIsPlaying,
    canvasBackground,
    setCanvasBackground,
    canvasZoom,
    setCanvasZoom,
    flipHorizontal,
    setFlipHorizontal,
    ...presets,
    ...calibration,
  };
}
