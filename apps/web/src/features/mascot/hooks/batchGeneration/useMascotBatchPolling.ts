import { useCallback, useEffect, useRef } from "react";
import type { MascotSlotBatchJob, SlotBatchStatusResponse } from "@studio/shared";
import { api } from "../../../../api";
import { inferBatchTargetState, formatSlotStreamMessage, formatQueuedKeys } from "../../utils/mascotBatchHelpers";
import { emitBatchOutcome } from "./batchOutcomeEmitter";
import type { BatchStateRefs, MascotBatchStateReturn } from "./types";

const POLLING_INTERVAL_MS = 1200;

export interface UseMascotBatchPollingProps {
  state: MascotBatchStateReturn;
  refs: BatchStateRefs;
}

/**
 * Manages the periodic polling loop, active batch updates, and terminal cleanup.
 */
export function useMascotBatchPolling({ state, refs }: UseMascotBatchPollingProps) {
  const pollingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isPollingInFlightRef = useRef(false);

  const stopPolling = useCallback(() => {
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
        pollingTimerRef.current = null;
      }
    };
  }, []);

  const handleActiveBatchUpdate = useCallback(
    async (activeBatch: MascotSlotBatchJob, statusRes: SlotBatchStatusResponse, mascotId: string, styleId: string) => {
      refs.activeBatchIdRef.current = activeBatch.id;
      if (activeBatch.completed_count > refs.lastCompletedCountRef.current) {
        refs.lastCompletedCountRef.current = activeBatch.completed_count;
        try {
          const res = await api.mascot(mascotId);
          if (refs.isMountedRef.current && res?.mascot) {
            refs.onMascotUpdatedRef.current(res.mascot);
          }
        } catch {
          // Non-fatal mascot refresh error
        }
      }

      const activeKeys = statusRes.active_slot_keys.length > 0 ? statusRes.active_slot_keys : activeBatch.active_slot_keys || [];
      const queuedKeys = statusRes.queued_slot_keys || [];
      const targetState = inferBatchTargetState(activeBatch);

      state.setQueuedSlotKeys(formatQueuedKeys(queuedKeys, styleId));
      if (activeBatch.total_slots === 1 && activeKeys.length > 0) {
        state.setBusySlotKey(activeKeys[0] ?? null);
      } else {
        state.setBusySlotKey("batch");
      }

      state.setBatchProgress((prev) => ({
        total: activeBatch.total_slots,
        completed: activeBatch.completed_count,
        failed: activeBatch.failed_count,
        activeSlotKeys: activeKeys,
        statusMessage: formatSlotStreamMessage(activeKeys, activeBatch.total_slots, prev?.isStopping),
        startTime: prev?.startTime ?? (new Date(activeBatch.created_at).getTime() || Date.now()),
        isStopping: prev?.isStopping ?? false,
        targetState: prev?.targetState ?? targetState,
        mode: prev?.mode ?? (activeBatch.total_slots === 1 ? "single" : "batch_empty"),
      }));
    },
    [refs, state],
  );

  const handleTerminalBatchCleanup = useCallback(
    async (activeBatch: MascotSlotBatchJob | null, statusRes: SlotBatchStatusResponse, mascotId: string, isInitialMount: boolean) => {
      stopPolling();

      const finishedBatch =
        activeBatch ??
        statusRes.recent_batches?.find((b) => b.id === refs.activeBatchIdRef.current) ??
        statusRes.recent_batches?.[0] ??
        null;

      const hadActiveBatch = Boolean(finishedBatch || refs.activeBatchIdRef.current || refs.lastCompletedCountRef.current > 0);

      if (hadActiveBatch && !isInitialMount) {
        try {
          const res = await api.mascot(mascotId);
          if (refs.isMountedRef.current && res?.mascot) {
            refs.onMascotUpdatedRef.current(res.mascot);
          }
        } catch {
          // Non-fatal final mascot refresh error
        }

        if (finishedBatch) {
          emitBatchOutcome(finishedBatch, refs.onNoticeRef.current);
        }
      }

      refs.activeBatchIdRef.current = null;
      refs.lastCompletedCountRef.current = 0;

      if (!isInitialMount) {
        state.resetBatchState();
      }
    },
    [refs, state, stopPolling],
  );

  const pollBatchStatus = useCallback(
    async (isInitialMount = false) => {
      if (!refs.isMountedRef.current || isPollingInFlightRef.current) return;
      const currentMascot = refs.mascotRef.current;
      if (!currentMascot?.id) return;
      const mascotId = currentMascot.id;
      const styleId = refs.activeStyleIdRef.current;

      try {
        isPollingInFlightRef.current = true;
        const statusRes = await api.getSlotGenerationStatus(mascotId, styleId);
        if (!refs.isMountedRef.current) return;

        const activeBatch = statusRes.active_batch;
        if (activeBatch && (activeBatch.status === "queued" || activeBatch.status === "processing")) {
          await handleActiveBatchUpdate(activeBatch, statusRes, mascotId, styleId);
        } else {
          await handleTerminalBatchCleanup(activeBatch, statusRes, mascotId, isInitialMount);
        }
      } catch (err) {
        console.error("Failed to poll slot generation status:", err);
      } finally {
        isPollingInFlightRef.current = false;
      }
    },
    [handleActiveBatchUpdate, handleTerminalBatchCleanup, refs],
  );

  const startPolling = useCallback(() => {
    stopPolling();
    pollingTimerRef.current = setInterval(() => {
      void pollBatchStatus(false);
    }, POLLING_INTERVAL_MS);
    void pollBatchStatus(false);
  }, [pollBatchStatus, stopPolling]);

  return {
    startPolling,
    stopPolling,
    pollBatchStatus,
  };
}
