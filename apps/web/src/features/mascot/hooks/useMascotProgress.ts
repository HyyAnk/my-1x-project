import { useEffect, useMemo, useState } from "react";
import { ALL_MASCOT_ACTIONS, type MascotActionType } from "@studio/shared";
import { useTranslation } from "../../../i18n";
import { getLocalizedActionMeta } from "../constants";

export type BatchState = {
  currentIndex: number;
  total: number;
  currentAction: MascotActionType | null;
  queue: MascotActionType[];
};

export function useMascotProgress() {
  const { t } = useTranslation();
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [generationElapsed, setGenerationElapsed] = useState<number>(0);
  const [batchState, setBatchState] = useState<BatchState | null>(null);

  const activeBatchAction = batchState?.currentAction;

  // Live generation timer
  useEffect(() => {
    if (!busyAction) {
      setGenerationElapsed(0);
      return;
    }
    const start = Date.now();
    setGenerationElapsed(0);

    const interval = setInterval(() => {
      setGenerationElapsed(Math.max(0.1, (Date.now() - start) / 1000));
    }, 120);

    return () => clearInterval(interval);
  }, [busyAction, activeBatchAction]);

  const isMatting = Boolean(busyAction?.startsWith("matting"));
  const expectedDuration = isMatting ? 15 : 60;

  // Smooth, continuous interpolation tailored for 60s generation time
  const itemProgress = useMemo(() => {
    if (!busyAction) return 0;
    const tSec = generationElapsed;
    if (tSec <= 0) return 4;
    const ratio = tSec / expectedDuration;

    let progress: number;
    if (ratio < 0.2) {
      progress = Math.round(4 + (ratio / 0.2) * 18);
    } else if (ratio < 0.5) {
      const subRatio = (ratio - 0.2) / 0.3;
      progress = Math.round(22 + subRatio * 33);
    } else if (ratio < 0.85) {
      const subRatio = (ratio - 0.5) / 0.35;
      progress = Math.round(55 + subRatio * 30);
    } else if (ratio < 1.1) {
      const subRatio = (ratio - 0.85) / 0.25;
      progress = Math.round(85 + subRatio * 8);
    } else {
      const overtime = tSec - expectedDuration * 1.1;
      const crawl = 4 * (1 - Math.exp(-overtime / 20));
      progress = Math.min(97, Math.round(93 + crawl));
    }
    return Math.min(97, Math.max(4, progress));
  }, [busyAction, generationElapsed, expectedDuration]);

  const overallProgress = useMemo(() => {
    if (!busyAction) return 0;
    if (batchState && batchState.total > 0) {
      const completed = batchState.currentIndex;
      const total = batchState.total;
      const currentPortion = itemProgress / 100;
      const pct = Math.round(((completed + currentPortion) / total) * 100);
      return Math.min(97, Math.max(4, pct));
    }
    return itemProgress;
  }, [busyAction, batchState, itemProgress]);

  const currentStageMessage = useMemo(() => {
    if (!busyAction) return "";
    if (busyAction === "concept") {
      if (generationElapsed < 12) return t("mascots.genStageInit");
      if (generationElapsed < 28) return t("mascots.genStageDiffusion");
      if (generationElapsed < 50) return t("mascots.genStageRendering");
      return t("mascots.genStageFinalizing");
    }
    if (busyAction.startsWith("matting")) {
      if (generationElapsed < 6) return t("mascots.genMattingScan");
      return t("mascots.genMattingAlpha");
    }
    if (busyAction === "batch" || busyAction === "batch-core") {
      if (batchState?.currentAction) {
        const actionMeta = getLocalizedActionMeta(batchState.currentAction, t);
        if (generationElapsed < 12) return t("mascots.genPoseInit");
        if (generationElapsed < 45) return t("mascots.genPoseRendering", { action: actionMeta.label.split(" ")[0] });
        return t("mascots.genPoseFinalizing", { action: actionMeta.label.split(" ")[0] });
      }
      return t("mascots.batchGeneratingBtn");
    }
    if (ALL_MASCOT_ACTIONS.includes(busyAction as MascotActionType)) {
      const actionMeta = getLocalizedActionMeta(busyAction as MascotActionType, t);
      if (generationElapsed < 12) return t("mascots.genPoseInit");
      if (generationElapsed < 45) return t("mascots.genPoseRendering", { action: actionMeta.label.split(" ")[0] });
      return t("mascots.genPoseFinalizing", { action: actionMeta.label.split(" ")[0] });
    }
    return t("mascots.activeAiGenerating");
  }, [busyAction, generationElapsed, batchState, t]);

  return {
    busyAction,
    setBusyAction,
    generationElapsed,
    setGenerationElapsed,
    batchState,
    setBatchState,
    itemProgress,
    overallProgress,
    currentStageMessage,
  };
}
