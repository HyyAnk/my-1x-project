import { useCallback, useEffect } from "react";
import type { MascotProfile, MascotSlotBatchJob, MascotStyle, SlotBatchStatusResponse } from "@studio/shared";
import { api } from "../../../../api";
import { inferBatchTargetState, formatSlotStreamMessage, formatQueuedKeys } from "../../utils/mascotBatchHelpers";
import { createReconnectedNotice, createCatchUpCompletedNotice } from "../../services/mascotQueueNotices";
import { isBatchAcknowledgedInSession, acknowledgeBatchInSession, isBatchRecent } from "../../utils/mascotSessionStorage";
import type { BatchStateRefs, MascotBatchStateReturn } from "./types";

export interface UseMascotBatchRecoveryProps {
  mascot: MascotProfile | null;
  activeStyle: MascotStyle | null;
  activeStyleId: string;
  state: MascotBatchStateReturn;
  refs: BatchStateRefs;
  startPolling: () => void;
  stopPolling: () => void;
}

/**
 * Handles mount recovery: reconnecting to in-flight batch jobs (F5 recovery)
 * and catching up on recently completed batches while user was away.
 */
export function useMascotBatchRecovery({
  mascot,
  activeStyle,
  activeStyleId,
  state,
  refs,
  startPolling,
  stopPolling,
}: UseMascotBatchRecoveryProps): void {
  const restoreMountActiveBatch = useCallback(
    async (
      activeBatch: MascotSlotBatchJob,
      statusRes: SlotBatchStatusResponse,
      mascotId: string,
      styleId: string,
      isCancelled: () => boolean,
    ) => {
      refs.activeBatchIdRef.current = activeBatch.id;
      const activeKeys = statusRes.active_slot_keys.length > 0 ? statusRes.active_slot_keys : activeBatch.active_slot_keys || [];
      const queuedKeys = statusRes.queued_slot_keys || [];
      const targetState = inferBatchTargetState(activeBatch);

      state.setQueuedSlotKeys(formatQueuedKeys(queuedKeys, styleId));
      if (activeBatch.total_slots === 1 && activeKeys.length > 0) {
        state.setBusySlotKey(activeKeys[0] ?? null);
      } else {
        state.setBusySlotKey("batch");
      }

      state.setBatchProgress({
        total: activeBatch.total_slots,
        completed: activeBatch.completed_count,
        failed: activeBatch.failed_count,
        activeSlotKeys: activeKeys,
        statusMessage: formatSlotStreamMessage(activeKeys, activeBatch.total_slots, false),
        startTime: new Date(activeBatch.created_at).getTime() || Date.now(),
        isStopping: false,
        targetState,
        mode: activeBatch.total_slots === 1 ? "single" : "batch_empty",
      });

      refs.lastCompletedCountRef.current = activeBatch.completed_count;
      startPolling();

      try {
        const res = await api.mascot(mascotId);
        if (!isCancelled() && refs.isMountedRef.current && res?.mascot) {
          refs.onMascotUpdatedRef.current(res.mascot);
        }
      } catch {
        // Non-fatal mascot refresh error on mount
      }

      refs.onNoticeRef.current(createReconnectedNotice(activeBatch.completed_count, activeBatch.total_slots, activeKeys.length));
    },
    [refs, startPolling, state],
  );

  const handleMountRecentBatchCatchUp = useCallback(
    async (recentBatch: MascotSlotBatchJob | undefined, mascotId: string, isCancelled: () => boolean) => {
      if (
        !recentBatch ||
        (recentBatch.status !== "completed" && recentBatch.completed_count === 0) ||
        !isBatchRecent(recentBatch.updated_at || recentBatch.created_at)
      ) {
        return;
      }

      try {
        const res = await api.mascot(mascotId);
        if (!isCancelled() && refs.isMountedRef.current && res?.mascot) {
          refs.onMascotUpdatedRef.current(res.mascot);
        }
      } catch {
        // Non-fatal mascot refresh error
      }

      if (!isBatchAcknowledgedInSession(recentBatch.id)) {
        acknowledgeBatchInSession(recentBatch.id);
        refs.onNoticeRef.current(createCatchUpCompletedNotice(recentBatch.completed_count, recentBatch.total_slots));
      }
    },
    [refs],
  );

  useEffect(() => {
    const currentMascot = mascot;
    if (!currentMascot?.id) return;
    const mascotId = currentMascot.id;
    const styleId = activeStyle?.id || activeStyleId || "core";
    let isCancelled = false;

    async function checkInitialStatus() {
      try {
        const statusRes = await api.getSlotGenerationStatus(mascotId, styleId);
        if (isCancelled || !refs.isMountedRef.current) return;

        const activeBatch = statusRes.active_batch;
        if (activeBatch && (activeBatch.status === "queued" || activeBatch.status === "processing")) {
          await restoreMountActiveBatch(activeBatch, statusRes, mascotId, styleId, () => isCancelled);
        } else {
          await handleMountRecentBatchCatchUp(statusRes.recent_batches?.[0], mascotId, () => isCancelled);
        }
      } catch {
        // Status check failed silently on initial render
      }
    }

    void checkInitialStatus();

    return () => {
      isCancelled = true;
      stopPolling();
    };
  }, [mascot?.id, activeStyle?.id, activeStyleId, restoreMountActiveBatch, handleMountRecentBatchCatchUp, refs, stopPolling]);
}
