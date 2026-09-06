import { useEffect, useMemo, useState } from "react";
import { ALL_MASCOT_ACTIONS, resolveMascotStyle, type MascotActionType, type MascotProfile, type MascotStyle } from "@studio/shared";
import type { Notice } from "../../../components/types";
import { useTranslation } from "../../../i18n";
import { useMascotMotionPresets } from "./useMascotMotionPresets";
import { useMascotMotionCalibration } from "./useMascotMotionCalibration";
import { DEFAULT_ACTION_INTENSITIES, DEFAULT_ACTION_MOTIONS, DEFAULT_ACTION_SPEEDS } from "../constants";
import { api } from "../../../api";
import {
  applyVariantPreviewOverrides,
  collectFilledVariants,
  getActionVariants,
  isVariantAction,
  resolveSelectedVariant,
} from "../utils/motionVariantPreview";

export type UseMascotMotionStudioProps = {
  editingMascot: MascotProfile | null;
  setEditingMascot: (mascot: MascotProfile | null) => void;
  onNotice: (notice: NonNullable<Notice>) => void;
  onRefreshChannels: () => Promise<void>;
  onMascotsChanged: () => Promise<void>;
  setBusyAction: (action: string | null) => void;
  setGeneratorStep: (step: 1 | 2 | 3) => void;
  getIdentitySnapshot?: () => {
    name?: string;
    description?: string;
    visual_style?: MascotProfile["visual_style"];
    color_theme?: string;
    master_prompt?: string;
  };
};

export function useMascotMotionStudio({
  editingMascot,
  setEditingMascot,
  onNotice,
  onRefreshChannels,
  onMascotsChanged,
  setBusyAction,
  setGeneratorStep,
  getIdentitySnapshot,
}: UseMascotMotionStudioProps) {
  const { t } = useTranslation();

  const [activePreviewAction, setActivePreviewAction] = useState<MascotActionType>("idle");
  const [isPlaying, setIsPlaying] = useState(true);
  const [canvasBackground, setCanvasBackground] = useState<"dark" | "light" | "grid" | "clean">("dark");
  const [canvasZoom, setCanvasZoom] = useState<number>(1.0);
  const [flipHorizontal, setFlipHorizontal] = useState(false);
  const [activeVariantIndex, setActiveVariantIndex] = useState<number>(0);
  // Local preview-only style override; never persisted to the server from this step.
  const [previewStyleId, setPreviewStyleId] = useState<string | null>(null);

  const presets = useMascotMotionPresets(editingMascot, setEditingMascot, onNotice);

  const activeStyle: MascotStyle | null = useMemo(() => {
    if (!editingMascot) return null;
    return resolveMascotStyle(editingMascot, previewStyleId);
  }, [editingMascot, previewStyleId]);

  const activeVariants = useMemo(() => getActionVariants(activeStyle, activePreviewAction), [activeStyle, activePreviewAction]);

  const selectedVariant = useMemo(() => resolveSelectedVariant(activeVariants, activeVariantIndex), [activeVariants, activeVariantIndex]);

  // Keep the variant selection valid when the previewed action or style changes
  useEffect(() => {
    if (!isVariantAction(activePreviewAction) || activeVariants.length === 0) {
      if (activeVariantIndex !== 0) setActiveVariantIndex(0);
      return;
    }
    if (activeVariantIndex > activeVariants.length - 1) {
      setActiveVariantIndex(activeVariants.length - 1);
    }
  }, [activePreviewAction, activeVariants.length, activeVariantIndex]);

  // Load the selected variant's motion settings into the editing buffer (per-variant calibration)
  useEffect(() => {
    if (!editingMascot || !isVariantAction(activePreviewAction)) return;
    const existing = editingMascot.actions[activePreviewAction];
    if (selectedVariant?.motion_preset || existing?.motion_preset) {
      presets.setActionMotions((prev) => ({
        ...prev,
        [activePreviewAction]: selectedVariant?.motion_preset ?? existing?.motion_preset ?? prev[activePreviewAction],
      }));
    }
    if (typeof selectedVariant?.motion_speed === "number" || typeof existing?.motion_speed === "number") {
      presets.setActionSpeeds((prev) => ({
        ...prev,
        [activePreviewAction]: selectedVariant?.motion_speed ?? existing?.motion_speed ?? prev[activePreviewAction],
      }));
    }
    if (selectedVariant?.motion_intensity || existing?.motion_intensity) {
      presets.setActionIntensities((prev) => ({
        ...prev,
        [activePreviewAction]: selectedVariant?.motion_intensity ?? existing?.motion_intensity ?? prev[activePreviewAction],
      }));
    }
  }, [editingMascot?.id, activePreviewAction, selectedVariant?.id]);

  const effectiveMascot = useMemo<MascotProfile | null>(() => {
    if (!editingMascot) return null;
    return applyVariantPreviewOverrides(editingMascot, activeStyle, activePreviewAction, activeVariantIndex);
  }, [editingMascot, activeStyle, activePreviewAction, activeVariantIndex]);

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
    getIdentitySnapshot,
  });

  const handleSaveMotion = async (action?: unknown) => {
    const targetAction: MascotActionType =
      typeof action === "string" && (ALL_MASCOT_ACTIONS as readonly string[]).includes(action)
        ? (action as MascotActionType)
        : activePreviewAction;

    // For thinking/celebrate, persist motion to the selected filled variant slot first
    if (editingMascot?.id && activeStyle?.id && isVariantAction(targetAction)) {
      const filled = collectFilledVariants(activeStyle, targetAction);
      const activeSlot = resolveSelectedVariant(filled, targetAction === activePreviewAction ? activeVariantIndex : 0);
      if (activeSlot && typeof api.updateMascotSlot === "function") {
        try {
          const preset = presets.actionMotions[targetAction] || DEFAULT_ACTION_MOTIONS[targetAction];
          const speed = presets.actionSpeeds[targetAction] ?? DEFAULT_ACTION_SPEEDS[targetAction];
          const intensity = presets.actionIntensities[targetAction] || DEFAULT_ACTION_INTENSITIES[targetAction];
          const res = await api.updateMascotSlot(editingMascot.id, activeStyle.id, {
            style_id: activeStyle.id,
            state: targetAction,
            slot_index: activeSlot.slot_index,
            motion_preset: preset,
            motion_speed: speed,
            motion_intensity: intensity,
          });
          if (res?.mascot) {
            setEditingMascot(res.mascot);
          }
        } catch {
          // Gracefully continue to calibrateMascotAction
        }
      }
    }

    return calibration.handleSaveMotion(action);
  };

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
    activeStyle,
    previewStyleId,
    setPreviewStyleId,
    activeVariantIndex,
    setActiveVariantIndex,
    activeVariants,
    selectedVariant,
    effectiveMascot,
    ...presets,
    ...calibration,
    handleSaveMotion,
  };
}
