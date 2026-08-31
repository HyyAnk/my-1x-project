import { useState } from "react";
import { ALL_MASCOT_ACTIONS, type MascotActionType, type MascotProfile } from "@studio/shared";
import { api } from "../../../api";
import type { Notice } from "../../../components/types";
import {
  DEFAULT_ACTION_INTENSITIES,
  DEFAULT_ACTION_MOTIONS,
  DEFAULT_ACTION_SPEEDS,
  getLocalizedActionMeta,
  type MascotMotionIntensity,
  type MascotMotionPreset,
} from "../constants";

export function useMascotMotionCalibration(options: {
  editingMascot: MascotProfile | null;
  setEditingMascot: (mascot: MascotProfile | null) => void;
  activePreviewAction: MascotActionType;
  actionMotions: Record<MascotActionType, MascotMotionPreset>;
  actionSpeeds: Record<MascotActionType, number>;
  actionIntensities: Record<MascotActionType, MascotMotionIntensity>;
  onNotice: (notice: NonNullable<Notice>) => void;
  onRefreshChannels: () => Promise<void>;
  onMascotsChanged: () => Promise<void>;
  setBusyAction: (action: string | null) => void;
  setGeneratorStep: (step: 1 | 2 | 3) => void;
  t: (key: string, values?: Record<string, string | number>) => string;
}) {
  const {
    editingMascot,
    setEditingMascot,
    activePreviewAction,
    actionMotions,
    actionSpeeds,
    actionIntensities,
    onNotice,
    onRefreshChannels,
    onMascotsChanged,
    setBusyAction,
    setGeneratorStep,
    t,
  } = options;

  const [calibrating, setCalibrating] = useState(false);

  const handleSaveMotion = async (action?: MascotActionType | unknown) => {
    if (!editingMascot) return;
    const targetAction: MascotActionType =
      typeof action === "string" && (ALL_MASCOT_ACTIONS as readonly string[]).includes(action)
        ? (action as MascotActionType)
        : activePreviewAction;
    setCalibrating(true);
    const actionMeta = getLocalizedActionMeta(targetAction, t);
    const preset = actionMotions[targetAction] || DEFAULT_ACTION_MOTIONS[targetAction];
    const speed = actionSpeeds[targetAction] || DEFAULT_ACTION_SPEEDS[targetAction];
    const intensity = actionIntensities[targetAction] || DEFAULT_ACTION_INTENSITIES[targetAction];
    try {
      const res = await api.calibrateMascotAction(editingMascot.id, targetAction, {
        motion_preset: preset,
        motion_speed: speed,
        motion_intensity: intensity,
      });
      setEditingMascot(res.mascot);
      onNotice({ tone: "good", message: `Motion settings saved for ${actionMeta.label.split(" ")[0]}!` });
      await onMascotsChanged();
    } catch (err) {
      onNotice({ tone: "bad", message: err instanceof Error ? err.message : "Failed to save motion" });
    } finally {
      setCalibrating(false);
    }
  };

  const handleFinishMascot = async () => {
    if (!editingMascot) return;
    setBusyAction("finish");
    try {
      const updatedActions = { ...editingMascot.actions };
      for (const act of ALL_MASCOT_ACTIONS) {
        const preset = actionMotions[act] || DEFAULT_ACTION_MOTIONS[act];
        const speed = actionSpeeds[act] || DEFAULT_ACTION_SPEEDS[act];
        const intensity = actionIntensities[act] || DEFAULT_ACTION_INTENSITIES[act];
        const existing = updatedActions[act];
        updatedActions[act] = existing
          ? { ...existing, motion_preset: preset, motion_speed: speed, motion_intensity: intensity }
          : {
              action: act,
              sprite_url: "",
              frames_count: 1,
              fps: 8,
              loop: true,
              frame_width: 512,
              frame_height: 512,
              offset_x: 0,
              offset_y: 0,
              motion_preset: preset,
              motion_speed: speed,
              motion_intensity: intensity,
            };
      }

      const res = await api.updateMascot(editingMascot.id, { actions: updatedActions });
      setEditingMascot(res.mascot);

      onNotice({
        tone: "good",
        message: `Mascot "${editingMascot.name}" has been saved successfully!`,
      });
      await onRefreshChannels();
      await onMascotsChanged();
      setGeneratorStep(1);
    } catch (err) {
      onNotice({
        tone: "bad",
        message: err instanceof Error ? err.message : "Failed to finish mascot",
      });
    } finally {
      setBusyAction(null);
    }
  };

  return {
    calibrating,
    handleSaveMotion,
    handleFinishMascot,
  };
}
