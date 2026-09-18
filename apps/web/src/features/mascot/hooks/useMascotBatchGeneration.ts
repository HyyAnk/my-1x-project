import { useRef, useEffect } from "react";
import { useBeforeUnloadWarning } from "./useBeforeUnloadWarning";
import { useMascotBatchState, useMascotBatchPolling, useMascotBatchRecovery, useMascotBatchMutations } from "./batchGeneration";
import type {
  BatchProgressState,
  QueuedSlotTask,
  UseMascotBatchGenerationProps,
  UseMascotBatchGenerationResult,
} from "../types/mascotBatch.types";

export type { BatchProgressState, QueuedSlotTask, UseMascotBatchGenerationProps, UseMascotBatchGenerationResult };

/**
 * Orchestrator hook for managing mascot slot batch generation lifecycle.
 * Coordinates batch state, background polling, mount recovery, and generation mutations.
 */
export function useMascotBatchGeneration({
  mascot,
  activeStyleId,
  activeStyle,
  onMascotUpdated,
  onNotice,
}: UseMascotBatchGenerationProps): UseMascotBatchGenerationResult {
  const state = useMascotBatchState();

  useBeforeUnloadWarning(Boolean(state.batchProgress || state.busySlotKey));

  const mascotRef = useRef(mascot);
  const activeStyleIdRef = useRef(activeStyle?.id || activeStyleId || "core");
  const onMascotUpdatedRef = useRef(onMascotUpdated);
  const onNoticeRef = useRef(onNotice);

  useEffect(() => {
    mascotRef.current = mascot;
    activeStyleIdRef.current = activeStyle?.id || activeStyleId || "core";
    onMascotUpdatedRef.current = onMascotUpdated;
    onNoticeRef.current = onNotice;
  }, [mascot, activeStyle?.id, activeStyleId, onMascotUpdated, onNotice]);

  const refs = {
    isMountedRef: state.isMountedRef,
    mascotRef,
    activeStyleIdRef,
    onMascotUpdatedRef,
    onNoticeRef,
    activeBatchIdRef: state.activeBatchIdRef,
    lastCompletedCountRef: state.lastCompletedCountRef,
  };

  const { startPolling, stopPolling, pollBatchStatus } = useMascotBatchPolling({
    state,
    refs,
  });

  useMascotBatchRecovery({
    mascot,
    activeStyle,
    activeStyleId,
    state,
    refs,
    startPolling,
    stopPolling,
  });

  const { handleStopBatchGeneration, handleGenerateSlot, handleBatchGenerateStyle, handleRegenerateSelectedSlots } =
    useMascotBatchMutations({
      state,
      refs,
      startPolling,
      pollBatchStatus,
    });

  return {
    busySlotKey: state.busySlotKey,
    setBusySlotKey: state.setBusySlotKey,
    queuedSlotKeys: state.queuedSlotKeys,
    batchProgress: state.batchProgress,
    setBatchProgress: state.setBatchProgress,
    handleStopBatchGeneration,
    handleGenerateSlot,
    handleBatchGenerateStyle,
    handleRegenerateSelectedSlots,
  };
}
