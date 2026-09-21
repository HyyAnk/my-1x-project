import { useRef, useEffect, useMemo } from "react";
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
  onActivityChange,
  onActiveStyleRecovered,
}: UseMascotBatchGenerationProps): UseMascotBatchGenerationResult {
  const state = useMascotBatchState();

  useBeforeUnloadWarning(Boolean(state.batchProgress || state.busySlotKey));

  const mascotRef = useRef(mascot);
  const activeStyleIdRef = useRef(activeStyle?.id || activeStyleId || "core");
  const trackedStyleIdRef = useRef<string | null>(null);
  const pendingSlotKeysRef = useRef<Set<string>>(new Set());
  const lastBatchUpdatedAtRef = useRef<string | null>(null);
  const onMascotUpdatedRef = useRef(onMascotUpdated);
  const onNoticeRef = useRef(onNotice);
  const onActivityChangeRef = useRef(onActivityChange ?? (() => undefined));
  const onActiveStyleRecoveredRef = useRef(onActiveStyleRecovered ?? (() => undefined));

  useEffect(() => {
    mascotRef.current = mascot;
    activeStyleIdRef.current = activeStyle?.id || activeStyleId || "core";
    onMascotUpdatedRef.current = onMascotUpdated;
    onNoticeRef.current = onNotice;
    onActivityChangeRef.current = onActivityChange ?? (() => undefined);
    onActiveStyleRecoveredRef.current = onActiveStyleRecovered ?? (() => undefined);
  }, [mascot, activeStyle?.id, activeStyleId, onActiveStyleRecovered, onActivityChange, onMascotUpdated, onNotice]);

  const refs = useMemo(
    () => ({
      isMountedRef: state.isMountedRef,
      mascotRef,
      activeStyleIdRef,
      trackedStyleIdRef,
      onMascotUpdatedRef,
      onNoticeRef,
      onActivityChangeRef,
      onActiveStyleRecoveredRef,
      activeBatchIdRef: state.activeBatchIdRef,
      lastBatchUpdatedAtRef,
      lastCompletedCountRef: state.lastCompletedCountRef,
      pendingSlotKeysRef,
    }),
    [state.activeBatchIdRef, state.isMountedRef, state.lastCompletedCountRef],
  );

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

  const {
    handleStopBatchGeneration,
    handleGenerateSlot,
    handleBatchGenerateStyle,
    handleGenerateSelectedSlots,
    handleRegenerateSelectedSlots,
  } = useMascotBatchMutations({
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
    handleGenerateSelectedSlots,
    handleRegenerateSelectedSlots,
  };
}
