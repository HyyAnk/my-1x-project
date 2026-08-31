import { useState } from "react";
import type { MascotActionType, MascotProfile } from "@studio/shared";
import { api } from "../../../api";
import type { Notice } from "../../../components/types";
import { useTranslation } from "../../../i18n";
import { getLocalizedActionMeta } from "../constants";
import type { BatchState } from "./useMascotProgress";
import { useMascotBatchGenerator } from "./useMascotBatchGenerator";

export type UseMascotSpriteGeneratorProps = {
  editingMascot: MascotProfile | null;
  setEditingMascot: (mascot: MascotProfile | null) => void;
  onNotice: (notice: NonNullable<Notice>) => void;
  onMascotsChanged: () => Promise<void>;
  setBusyAction: (action: string | null) => void;
  setBatchState: (state: BatchState | null) => void;
  setActivePreviewAction: (action: MascotActionType) => void;
  setGeneratorStep: (step: 1 | 2 | 3) => void;
};

export function useMascotSpriteGenerator({
  editingMascot,
  setEditingMascot,
  onNotice,
  onMascotsChanged,
  setBusyAction,
  setBatchState,
  setActivePreviewAction,
  setGeneratorStep,
}: UseMascotSpriteGeneratorProps) {
  const { t } = useTranslation();

  const [selectedActions, setSelectedActions] = useState<Record<MascotActionType, boolean>>({
    wave: true,
    idle: true,
    thinking: true,
    point: true,
    celebrate: true,
    oops: true,
    outro: true,
  });

  const [actionPrompts, setActionPrompts] = useState<Record<MascotActionType, string>>({
    wave: "",
    idle: "",
    thinking: "",
    point: "",
    celebrate: "",
    oops: "",
    outro: "",
  });

  const [actionFps] = useState<Record<MascotActionType, number>>({
    wave: 8,
    idle: 6,
    thinking: 8,
    point: 8,
    celebrate: 10,
    oops: 8,
    outro: 8,
  });

  const [actionFrames] = useState<Record<MascotActionType, number>>({
    wave: 1,
    idle: 1,
    thinking: 1,
    point: 1,
    celebrate: 1,
    oops: 1,
    outro: 1,
  });

  const [dragOverAction, setDragOverAction] = useState<MascotActionType | null>(null);
  const [promptEditAction, setPromptEditAction] = useState<MascotActionType | null>(null);

  const { handleBatchGenerateSprites, handleBatchGenerateCoreSprites } = useMascotBatchGenerator({
    editingMascot,
    setEditingMascot,
    selectedActions,
    actionPrompts,
    actionFrames,
    actionFps,
    onNotice,
    onMascotsChanged,
    setBusyAction,
    setBatchState,
    setGeneratorStep,
  });

  const handleGenerateSprite = async (action: MascotActionType) => {
    if (!editingMascot) {
      onNotice({ tone: "bad", message: t("notices.mascotNameRequired") });
      return;
    }
    setBatchState(null);
    setBusyAction(action);
    const actionMeta = getLocalizedActionMeta(action, t);
    try {
      onNotice({ tone: "good", message: t("notices.generatingSprite", { action: actionMeta.label }) });
      const res = await api.generateMascotSprite(editingMascot.id, {
        action,
        prompt: actionPrompts[action]?.trim() || undefined,
        frames_count: actionFrames[action] || 1,
        fps: actionFps[action] || 8,
        loop: true,
      });
      setEditingMascot(res.mascot);
      setActivePreviewAction(action);
      onNotice({ tone: "good", message: t("notices.spriteCompleted", { action: actionMeta.label }) });
      await onMascotsChanged();
    } catch (err) {
      onNotice({ tone: "bad", message: err instanceof Error ? err.message : t("notices.spriteFailed", { action }) });
    } finally {
      setBusyAction(null);
      setBatchState(null);
    }
  };

  const handleUploadSprite = async (action: MascotActionType, file: File) => {
    if (!editingMascot) return;
    setBusyAction(`upload-${action}`);
    const actionMeta = getLocalizedActionMeta(action, t);
    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
      });
      reader.readAsDataURL(file);
      const base64 = await base64Promise;

      const res = await api.uploadMascotSprite(editingMascot.id, {
        action,
        data: base64,
        frames_count: actionFrames[action] || 1,
        fps: actionFps[action] || 8,
        loop: true,
        frame_width: 512,
        frame_height: 512,
      });

      setEditingMascot(res.mascot);
      setActivePreviewAction(action);
      onNotice({ tone: "good", message: t("notices.spriteUploaded", { action: actionMeta.label }) });
      await onMascotsChanged();
    } catch (err) {
      onNotice({ tone: "bad", message: err instanceof Error ? err.message : t("notices.uploadFailed") });
    } finally {
      setBusyAction(null);
    }
  };

  const handleDropSprite = (action: MascotActionType, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverAction(null);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      void handleUploadSprite(action, file);
    }
  };

  const handleRemoveBackground = async (target: "master" | "all" | MascotActionType = "all") => {
    if (!editingMascot) return;
    setBatchState(null);
    setBusyAction(`matting-${target}`);
    try {
      const res = await api.removeMascotBackground(editingMascot.id, target);
      setEditingMascot(res.mascot);
      const targetLabel =
        target === "master" ? "Master Concept" : target === "all" ? t("common.all") : getLocalizedActionMeta(target, t).label;
      onNotice({
        tone: "good",
        message: t("notices.mattingSuccess", { target: targetLabel }),
      });
      await onMascotsChanged();
    } catch (err) {
      onNotice({ tone: "bad", message: err instanceof Error ? err.message : t("notices.mattingFailed") });
    } finally {
      setBusyAction(null);
      setBatchState(null);
    }
  };

  return {
    selectedActions,
    setSelectedActions,
    actionPrompts,
    setActionPrompts,
    dragOverAction,
    setDragOverAction,
    promptEditAction,
    setPromptEditAction,
    handleGenerateSprite,
    handleBatchGenerateSprites,
    handleBatchGenerateCoreSprites,
    handleUploadSprite,
    handleDropSprite,
    handleRemoveBackground,
  };
}
