import { useEffect, useState } from "react";
import { ALL_MASCOT_ACTIONS, type MascotActionType, type MascotProfile } from "@studio/shared";
import { api } from "../../../api";
import type { Notice } from "../../../components/types";
import { useTranslation } from "../../../i18n";
import {
  DEFAULT_ACTION_INTENSITIES,
  DEFAULT_ACTION_MOTIONS,
  DEFAULT_ACTION_SPEEDS,
  getLocalizedActionMeta,
  type MascotMotionIntensity,
  type MascotMotionPreset,
} from "../constants";

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
  const [actionMotions, setActionMotions] = useState<Record<MascotActionType, MascotMotionPreset>>({ ...DEFAULT_ACTION_MOTIONS });
  const [actionSpeeds, setActionSpeeds] = useState<Record<MascotActionType, number>>({ ...DEFAULT_ACTION_SPEEDS });
  const [actionIntensities, setActionIntensities] = useState<Record<MascotActionType, MascotMotionIntensity>>({
    ...DEFAULT_ACTION_INTENSITIES,
  });
  const [calibrating, setCalibrating] = useState(false);

  // Sync action motions when editingMascot loads
  useEffect(() => {
    if (!editingMascot) return;
    const initialMotions: Record<MascotActionType, MascotMotionPreset> = { ...DEFAULT_ACTION_MOTIONS };
    const initialSpeeds: Record<MascotActionType, number> = { ...DEFAULT_ACTION_SPEEDS };
    const initialIntensities: Record<MascotActionType, MascotMotionIntensity> = { ...DEFAULT_ACTION_INTENSITIES };

    for (const act of ALL_MASCOT_ACTIONS) {
      const sprite = editingMascot.actions[act];
      if (sprite?.motion_preset) {
        initialMotions[act] = sprite.motion_preset;
      }
      if (typeof sprite?.motion_speed === "number") {
        initialSpeeds[act] = sprite.motion_speed;
      }
      if (sprite?.motion_intensity) {
        initialIntensities[act] = sprite.motion_intensity;
      }
    }
    setActionMotions(initialMotions);
    setActionSpeeds(initialSpeeds);
    setActionIntensities(initialIntensities);
  }, [editingMascot?.id]);

  const handleChangeMotionPreset = (action: MascotActionType, preset: MascotMotionPreset) => {
    setActionMotions((prev) => ({ ...prev, [action]: preset }));
    if (editingMascot) {
      const existingAction = editingMascot.actions[action];
      const updatedAction = existingAction
        ? { ...existingAction, motion_preset: preset }
        : {
            action,
            sprite_url: "",
            frames_count: 1,
            fps: 8,
            loop: true,
            frame_width: 512,
            frame_height: 512,
            offset_x: 0,
            offset_y: 0,
            motion_preset: preset,
            motion_speed: actionSpeeds[action] || 1.0,
            motion_intensity: actionIntensities[action] || "normal",
          };
      setEditingMascot({
        ...editingMascot,
        actions: {
          ...editingMascot.actions,
          [action]: updatedAction,
        },
      });
    }
  };

  const handleChangeMotionSpeed = (action: MascotActionType, speed: number) => {
    setActionSpeeds((prev) => ({ ...prev, [action]: speed }));
    if (editingMascot) {
      const existingAction = editingMascot.actions[action];
      if (existingAction) {
        setEditingMascot({
          ...editingMascot,
          actions: {
            ...editingMascot.actions,
            [action]: {
              ...existingAction,
              motion_speed: speed,
            },
          },
        });
      }
    }
  };

  const handleChangeMotionIntensity = (action: MascotActionType, intensity: MascotMotionIntensity) => {
    setActionIntensities((prev) => ({ ...prev, [action]: intensity }));
    if (editingMascot) {
      const existingAction = editingMascot.actions[action];
      if (existingAction) {
        setEditingMascot({
          ...editingMascot,
          actions: {
            ...editingMascot.actions,
            [action]: {
              ...existingAction,
              motion_intensity: intensity,
            },
          },
        });
      }
    }
  };

  const handleResetDefaultMotions = () => {
    setActionMotions({ ...DEFAULT_ACTION_MOTIONS });
    setActionSpeeds({ ...DEFAULT_ACTION_SPEEDS });
    setActionIntensities({ ...DEFAULT_ACTION_INTENSITIES });
    if (editingMascot) {
      const updatedActions = { ...editingMascot.actions };
      for (const act of ALL_MASCOT_ACTIONS) {
        const existing = updatedActions[act];
        updatedActions[act] = existing
          ? {
              ...existing,
              motion_preset: DEFAULT_ACTION_MOTIONS[act],
              motion_speed: DEFAULT_ACTION_SPEEDS[act],
              motion_intensity: DEFAULT_ACTION_INTENSITIES[act],
            }
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
              motion_preset: DEFAULT_ACTION_MOTIONS[act],
              motion_speed: DEFAULT_ACTION_SPEEDS[act],
              motion_intensity: DEFAULT_ACTION_INTENSITIES[act],
            };
      }
      setEditingMascot({
        ...editingMascot,
        actions: updatedActions,
      });
    }
    onNotice({ tone: "good", message: "Restored recommended motion presets!" });
  };

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
    actionMotions,
    setActionMotions,
    actionSpeeds,
    setActionSpeeds,
    actionIntensities,
    setActionIntensities,
    calibrating,
    handleChangeMotionPreset,
    handleChangeMotionSpeed,
    handleChangeMotionIntensity,
    handleResetDefaultMotions,
    handleSaveMotion,
    handleFinishMascot,
  };
}
