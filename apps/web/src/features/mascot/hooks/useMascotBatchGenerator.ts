import { ALL_MASCOT_ACTIONS, type MascotActionType, type MascotProfile } from "@studio/shared";
import { api } from "../../../api";
import type { Notice } from "../../../components/types";
import { useTranslation } from "../../../i18n";
import { CORE_GAMEPLAY_ACTIONS, getLocalizedActionMeta } from "../constants";
import type { BatchState } from "./useMascotProgress";

export type UseMascotBatchGeneratorProps = {
  editingMascot: MascotProfile | null;
  setEditingMascot: (mascot: MascotProfile | null) => void;
  selectedActions: Record<MascotActionType, boolean>;
  actionPrompts: Record<MascotActionType, string>;
  actionFrames: Record<MascotActionType, number>;
  actionFps: Record<MascotActionType, number>;
  onNotice: (notice: NonNullable<Notice>) => void;
  onMascotsChanged: () => Promise<void>;
  setBusyAction: (action: string | null) => void;
  setBatchState: (state: BatchState | null) => void;
  setGeneratorStep: (step: 1 | 2 | 3) => void;
};

export function useMascotBatchGenerator({
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
}: UseMascotBatchGeneratorProps) {
  const { t } = useTranslation();

  const handleBatchGenerateSprites = async () => {
    if (!editingMascot) {
      onNotice({ tone: "bad", message: t("notices.mascotNameRequired") });
      return;
    }
    const actionsToGen = ALL_MASCOT_ACTIONS.filter((act) => selectedActions[act]);
    if (actionsToGen.length === 0) {
      onNotice({ tone: "bad", message: t("notices.selectActionRequired") });
      return;
    }
    setBusyAction("batch");
    setBatchState({
      currentIndex: 0,
      total: actionsToGen.length,
      currentAction: actionsToGen[0],
      queue: actionsToGen,
    });
    try {
      for (let i = 0; i < actionsToGen.length; i++) {
        const action = actionsToGen[i];
        setBatchState({
          currentIndex: i,
          total: actionsToGen.length,
          currentAction: action,
          queue: actionsToGen.slice(i + 1),
        });
        const actionMeta = getLocalizedActionMeta(action, t);
        onNotice({ tone: "good", message: t("notices.generatingSprite", { action: actionMeta.label }) });
        const res = await api.generateMascotSprite(editingMascot.id, {
          action,
          prompt: actionPrompts[action]?.trim() || undefined,
          frames_count: actionFrames[action] || 1,
          fps: actionFps[action] || 8,
          loop: true,
        });
        setEditingMascot(res.mascot);
      }
      onNotice({ tone: "good", message: t("notices.batchCompleted", { count: actionsToGen.length }) });
      await onMascotsChanged();
      setGeneratorStep(3);
    } catch (err) {
      onNotice({ tone: "bad", message: err instanceof Error ? err.message : t("notices.batchFailed") });
    } finally {
      setBusyAction(null);
      setBatchState(null);
    }
  };

  const handleBatchGenerateCoreSprites = async () => {
    if (!editingMascot) {
      onNotice({ tone: "bad", message: t("notices.mascotNameRequired") });
      return;
    }
    setBusyAction("batch-core");
    setBatchState({
      currentIndex: 0,
      total: CORE_GAMEPLAY_ACTIONS.length,
      currentAction: CORE_GAMEPLAY_ACTIONS[0],
      queue: [...CORE_GAMEPLAY_ACTIONS],
    });
    try {
      for (let i = 0; i < CORE_GAMEPLAY_ACTIONS.length; i++) {
        const action = CORE_GAMEPLAY_ACTIONS[i];
        setBatchState({
          currentIndex: i,
          total: CORE_GAMEPLAY_ACTIONS.length,
          currentAction: action,
          queue: CORE_GAMEPLAY_ACTIONS.slice(i + 1),
        });
        const actionMeta = getLocalizedActionMeta(action, t);
        onNotice({ tone: "good", message: t("notices.generatingSprite", { action: actionMeta.label }) });
        const res = await api.generateMascotSprite(editingMascot.id, {
          action,
          prompt: actionPrompts[action]?.trim() || undefined,
          frames_count: actionFrames[action] || 1,
          fps: actionFps[action] || (action === "celebrate" ? 10 : 8),
          loop: true,
        });
        setEditingMascot(res.mascot);
      }
      onNotice({ tone: "good", message: t("notices.batchCompleted", { count: CORE_GAMEPLAY_ACTIONS.length }) });
      await onMascotsChanged();
      setGeneratorStep(3);
    } catch (err) {
      onNotice({ tone: "bad", message: err instanceof Error ? err.message : t("notices.batchFailed") });
    } finally {
      setBusyAction(null);
      setBatchState(null);
    }
  };

  return {
    handleBatchGenerateSprites,
    handleBatchGenerateCoreSprites,
  };
}
