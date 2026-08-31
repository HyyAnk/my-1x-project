import { useEffect, useState } from "react";
import { ALL_MASCOT_ACTIONS, type MascotActionType, type MascotProfile } from "@studio/shared";
import type { Notice } from "../../../components/types";
import {
  DEFAULT_ACTION_INTENSITIES,
  DEFAULT_ACTION_MOTIONS,
  DEFAULT_ACTION_SPEEDS,
  type MascotMotionIntensity,
  type MascotMotionPreset,
} from "../constants";

export function useMascotMotionPresets(
  editingMascot: MascotProfile | null,
  setEditingMascot: (mascot: MascotProfile | null) => void,
  onNotice: (notice: NonNullable<Notice>) => void,
) {
  const [actionMotions, setActionMotions] = useState<Record<MascotActionType, MascotMotionPreset>>({ ...DEFAULT_ACTION_MOTIONS });
  const [actionSpeeds, setActionSpeeds] = useState<Record<MascotActionType, number>>({ ...DEFAULT_ACTION_SPEEDS });
  const [actionIntensities, setActionIntensities] = useState<Record<MascotActionType, MascotMotionIntensity>>({
    ...DEFAULT_ACTION_INTENSITIES,
  });

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

  return {
    actionMotions,
    setActionMotions,
    actionSpeeds,
    setActionSpeeds,
    actionIntensities,
    setActionIntensities,
    handleChangeMotionPreset,
    handleChangeMotionSpeed,
    handleChangeMotionIntensity,
    handleResetDefaultMotions,
  };
}
