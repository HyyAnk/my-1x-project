import { useCallback, useEffect, useRef } from "react";
import type { MascotProfile, MascotSlotBatchJob, MascotStyle, SlotBatchStatusResponse } from "@studio/shared";
import { api } from "../../../../api";
import { inferBatchTargetState, formatSlotStreamMessage, formatQueuedKeys } from "../../utils/mascotBatchHelpers";
import { createReconnectedNotice, createCatchUpCompletedNotice } from "../../services/mascotQueueNotices";
import { isBatchAcknowledgedInSession, acknowledgeBatchInSession, isBatchRecent } from "../../utils/mascotSessionStorage";
import { emitBatchOutcome } from "./batchOutcomeEmitter";
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

interface StyleStatusResult {
  styleId: string;
  status: SlotBatchStatusResponse;
}

export function useMascotBatchRecovery({
  mascot,
  activeStyle,
  activeStyleId,
  state,
  refs,
  startPolling,
  stopPolling,
}: UseMascotBatchRecoveryProps): void {
  const recoveryAttemptRef = useRef(0);
  const { setQueuedSlotKeys, setBusySlotKey, setBatchProgress } = state;
  const mascotId = mascot?.id;
  const styleIds = Array.from(
    new Set([...(mascot?.styles || []).map((style) => style.id), activeStyle?.id, activeStyleId].filter(Boolean) as string[]),
  );
  const styleIdsKey = styleIds.join("|");

  const restoreActiveBatch = useCallback(
    async (activeBatch: MascotSlotBatchJob, status: SlotBatchStatusResponse, styleId: string, canCommit: () => boolean) => {
      refs.activeBatchIdRef.current = activeBatch.id;
      refs.trackedStyleIdRef.current = styleId;
      refs.lastCompletedCountRef.current = activeBatch.completed_count;
      refs.onActiveStyleRecoveredRef.current(styleId);

      const activeKeys = status.active_slot_keys.length > 0 ? status.active_slot_keys : activeBatch.active_slot_keys || [];
      const queuedKeys = status.queued_slot_keys || [];
      const styleName = refs.mascotRef.current?.styles?.find((style) => style.id === styleId)?.name;

      setQueuedSlotKeys(formatQueuedKeys(queuedKeys, styleId));
      setBusySlotKey(activeBatch.total_slots === 1 && activeKeys.length > 0 ? (activeKeys[0] ?? null) : "batch");
      setBatchProgress({
        batchId: activeBatch.id,
        styleId,
        styleName,
        total: activeBatch.total_slots,
        completed: activeBatch.completed_count,
        failed: activeBatch.failed_count,
        activeSlotKeys: activeKeys,
        statusMessage: formatSlotStreamMessage(activeKeys, activeBatch.total_slots, false),
        startTime: new Date(activeBatch.created_at).getTime() || Date.now(),
        isStopping: false,
        targetState: inferBatchTargetState(activeBatch),
        mode: activeBatch.total_slots === 1 ? "single" : "batch_empty",
      });

      startPolling();
      try {
        const response = await api.mascot(activeBatch.mascot_id);
        if (canCommit() && response?.mascot) refs.onMascotUpdatedRef.current(response.mascot);
      } catch {
        // The activity poll will retry this non-critical refresh.
      }

      if (canCommit()) {
        refs.onNoticeRef.current(createReconnectedNotice(activeBatch.completed_count, activeBatch.total_slots, activeKeys.length));
      }
    },
    [refs, setBatchProgress, setBusySlotKey, setQueuedSlotKeys, startPolling],
  );

  const catchUpRecentBatch = useCallback(
    async (batch: MascotSlotBatchJob, canCommit: () => boolean) => {
      if (batch.completed_count > 0) {
        try {
          const response = await api.mascot(batch.mascot_id);
          if (canCommit() && response?.mascot) refs.onMascotUpdatedRef.current(response.mascot);
        } catch {
          // The activity poll will retry this non-critical refresh.
        }
      }

      if (!canCommit() || isBatchAcknowledgedInSession(batch.id)) return;
      if (batch.status === "completed" && batch.failed_count === 0) {
        acknowledgeBatchInSession(batch.id);
        refs.onNoticeRef.current(createCatchUpCompletedNotice(batch.completed_count, batch.total_slots));
        return;
      }
      emitBatchOutcome(batch, refs.onNoticeRef.current);
    },
    [refs],
  );

  useEffect(() => {
    if (!mascotId || !styleIdsKey) return;
    const recoveryAttempt = ++recoveryAttemptRef.current;
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    const canCommit = () => !cancelled && recoveryAttemptRef.current === recoveryAttempt && refs.isMountedRef.current;

    const recover = async (retriesRemaining: number) => {
      const ids = styleIdsKey.split("|").filter(Boolean);
      const results = await Promise.allSettled(
        ids.map(async (styleId): Promise<StyleStatusResult> => ({
          styleId,
          status: await api.getSlotGenerationStatus(mascotId, styleId),
        })),
      );
      if (!canCommit()) return;

      const statuses = results.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
      const selectedStyleId = refs.activeStyleIdRef.current;
      const activeStatuses = statuses
        .filter(({ status }) => status.active_batch && ["queued", "processing"].includes(status.active_batch.status))
        .sort((left, right) => {
          if (left.styleId === selectedStyleId) return -1;
          if (right.styleId === selectedStyleId) return 1;
          return (
            new Date(right.status.active_batch?.created_at || 0).getTime() - new Date(left.status.active_batch?.created_at || 0).getTime()
          );
        });

      const active = activeStatuses[0];
      if (active?.status.active_batch) {
        await restoreActiveBatch(active.status.active_batch, active.status, active.styleId, canCommit);
        return;
      }

      const recent = statuses
        .flatMap(({ status }) => status.recent_batches || [])
        .filter((batch) => isBatchRecent(batch.updated_at || batch.created_at))
        .sort((left, right) => new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime())[0];
      if (recent) await catchUpRecentBatch(recent, canCommit);

      if (results.some((result) => result.status === "rejected") && retriesRemaining > 0 && canCommit()) {
        retryTimer = setTimeout(() => void recover(retriesRemaining - 1), 1_500);
      }
    };

    const recoverWhenOnline = () => void recover(1);
    window.addEventListener("online", recoverWhenOnline);
    void recover(2);

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      window.removeEventListener("online", recoverWhenOnline);
      stopPolling();
    };
  }, [catchUpRecentBatch, mascotId, refs, restoreActiveBatch, stopPolling, styleIdsKey]);
}
