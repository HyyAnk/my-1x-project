import { useState } from "react";
import { ALL_MASCOT_ACTIONS, type MascotProfile } from "@studio/shared";
import type { Notice } from "../../../components/types";
import { DEFAULT_ACTION_INTENSITIES, DEFAULT_ACTION_MOTIONS, DEFAULT_ACTION_SPEEDS } from "../constants";
import { useMascotProgress } from "./useMascotProgress";
import { useMascotConceptForm } from "./useMascotConceptForm";
import { useMascotSpriteGenerator } from "./useMascotSpriteGenerator";
import { useMascotMotionStudio } from "./useMascotMotionStudio";

type UseMascotGeneratorProps = {
  onNotice: (notice: NonNullable<Notice>) => void;
  onRefreshChannels: () => Promise<void>;
  onMascotsChanged: () => Promise<void>;
};

export function useMascotGenerator({ onNotice, onRefreshChannels, onMascotsChanged }: UseMascotGeneratorProps) {
  const [generatorStep, setGeneratorStep] = useState<1 | 2 | 3>(1);
  const [editingMascot, setEditingMascot] = useState<MascotProfile | null>(null);

  const progress = useMascotProgress();

  const conceptForm = useMascotConceptForm({
    editingMascot,
    setEditingMascot,
    onNotice,
    onMascotsChanged,
    setBusyAction: progress.setBusyAction,
    setBatchState: progress.setBatchState,
  });

  const motionStudio = useMascotMotionStudio({
    editingMascot,
    setEditingMascot,
    onNotice,
    onRefreshChannels,
    onMascotsChanged,
    setBusyAction: progress.setBusyAction,
    setGeneratorStep,
    getIdentitySnapshot: () => ({
      name: conceptForm.genName.trim(),
      description: conceptForm.genDescription.trim(),
      visual_style: conceptForm.genStyle,
      color_theme: conceptForm.genColor,
      master_prompt: conceptForm.genPrompt.trim(),
    }),
  });

  const spriteGen = useMascotSpriteGenerator({
    editingMascot,
    setEditingMascot,
    onNotice,
    onMascotsChanged,
    setBusyAction: progress.setBusyAction,
    setBatchState: progress.setBatchState,
    setActivePreviewAction: motionStudio.setActivePreviewAction,
    setGeneratorStep,
  });

  const handleStartNew = () => {
    setEditingMascot(null);
    conceptForm.setGenName("Milo the Explorer");
    conceptForm.setGenDescription("");
    conceptForm.setGenStyle("pixar_3d");
    conceptForm.setGenColor("#06b6d4");
    conceptForm.setGenPrompt(
      "Cute wise baby owl with big sparkling eyes and small red glasses, fluffy feathers, friendly and enthusiastic expression",
    );
    motionStudio.setActionMotions({ ...DEFAULT_ACTION_MOTIONS });
    motionStudio.setActionSpeeds({ ...DEFAULT_ACTION_SPEEDS });
    motionStudio.setActionIntensities({ ...DEFAULT_ACTION_INTENSITIES });
    setGeneratorStep(1);
  };

  const handleEditMascot = (mascot: MascotProfile) => {
    setEditingMascot(mascot);
    conceptForm.setGenName(mascot.name);
    conceptForm.setGenDescription(mascot.description);
    conceptForm.setGenStyle(mascot.visual_style);
    conceptForm.setGenColor(mascot.color_theme || "#06b6d4");
    conceptForm.setGenPrompt(mascot.master_prompt || "");

    const initialMotions = { ...DEFAULT_ACTION_MOTIONS };
    const initialSpeeds = { ...DEFAULT_ACTION_SPEEDS };
    const initialIntensities = { ...DEFAULT_ACTION_INTENSITIES };

    for (const act of ALL_MASCOT_ACTIONS) {
      const sprite = mascot.actions[act];
      if (sprite?.motion_preset) initialMotions[act] = sprite.motion_preset;
      if (typeof sprite?.motion_speed === "number") initialSpeeds[act] = sprite.motion_speed;
      if (sprite?.motion_intensity) initialIntensities[act] = sprite.motion_intensity;
    }
    motionStudio.setActionMotions(initialMotions);
    motionStudio.setActionSpeeds(initialSpeeds);
    motionStudio.setActionIntensities(initialIntensities);

    const availableAction = ALL_MASCOT_ACTIONS.find((act) => mascot.actions[act]?.sprite_url) || "wave";
    motionStudio.setActivePreviewAction(availableAction);
    setGeneratorStep(1);
  };

  return {
    generatorStep,
    setGeneratorStep,
    editingMascot,
    setEditingMascot,
    ...conceptForm,
    ...progress,
    ...spriteGen,
    ...motionStudio,
    handleStartNew,
    handleEditMascot,
  };
}
