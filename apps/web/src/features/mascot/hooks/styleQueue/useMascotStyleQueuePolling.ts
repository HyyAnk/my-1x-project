import { useCallback, useRef, useEffect } from "react";
import type { MascotStyleBatchJob, StyleBatchStatusResponse } from "@studio/shared";
import { api } from "../../../../api";
import { createStyleBatchOutcomeNotice, createStyleConceptSuccessNotice } from "../../services/mascotQueueNotices";
import { acknowledgeBatchInSession } from "../../utils/mascotSessionStorage";
import { findTrackedSettledBatch } from "./styleQueueBatchSelectors";
import type { MascotStyleQueueStateReturn, StyleQueueRefs } from "./types";

export interface UseMascotStyleQueuePollingProps {
  state: MascotStyleQueueStateReturn;
  refs: StyleQueueRefs;
}

export function useMascotStyleQueuePolling({ state, refs }: UseMascotStyleQueuePollingProps) {
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef<boolean>(false);
  const { setActiveBatch, setQueuedStyleIds, setActiveStyleIds, setQueueProgress } = state;

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    isPollingRef.current = false;
  }, []);

  const refreshMascot = useCallback(
    async (mascotId: string) => {
      try {
        const mascotRes = await api.mascot(mascotId);
        if (refs.isMountedRef.current && mascotRes?.mascot) {
          refs.onMascotUpdatedRef.current(mascotRes.mascot);
        }
      } catch {
        // A later visibility or recovery poll can retry this non-critical refresh.
      }
    },
    [refs],
  );

  const handleBatchSettled = useCallback(
    async (batch: MascotStyleBatchJob, mascotId: string) => {
      stopPolling();
      setActiveBatch(batch);
      setQueuedStyleIds([]);
      setActiveStyleIds([]);
      refs.activeBatchIdRef.current = null;
      acknowledgeBatchInSession(batch.id);

      await refreshMascot(mascotId);

      const isAborted = batch.status === "cancelled";
      refs.onNoticeRef.current(createStyleBatchOutcomeNotice(isAborted, batch.completed_count, batch.failed_count, batch.total_styles));

      if (batch.failed_count === 0 && !isAborted) {
        setTimeout(() => {
          if (refs.isMountedRef.current && !refs.activeBatchIdRef.current) {
            setQueueProgress(null);
          }
        }, 3500);
      } else {
        setQueueProgress((prev) =>
          prev
            ? {
                ...prev,
                completed: batch.completed_count,
                failed: batch.failed_count,
                statusMessage: isAborted ? "Generation stopped by user" : `${batch.failed_count} style concept(s) failed`,
              }
            : null,
        );
      }
    },
    [refreshMascot, refs, setActiveBatch, setActiveStyleIds, setQueueProgress, setQueuedStyleIds, stopPolling],
  );

  const handleNoActiveBatch = useCallback(
    async (status: StyleBatchStatusResponse, mascotId: string) => {
      const trackedBatchId = refs.activeBatchIdRef.current;
      if (!trackedBatchId) return;

      const settledBatch = findTrackedSettledBatch(status.recent_batches, trackedBatchId);
      if (settledBatch) {
        await handleBatchSettled(settledBatch, mascotId);
        return;
      }

      stopPolling();
      refs.activeBatchIdRef.current = null;
      setActiveBatch(null);
      setQueuedStyleIds([]);
      setActiveStyleIds([]);
      setQueueProgress(null);
      await refreshMascot(mascotId);
    },
    [handleBatchSettled, refreshMascot, refs, setActiveBatch, setActiveStyleIds, setQueueProgress, setQueuedStyleIds, stopPolling],
  );

  const pollBatchStatus = useCallback(async () => {
    const currentMascot = refs.mascotRef.current;
    if (!currentMascot || !refs.isMountedRef.current) return;

    try {
      const statusRes = await api.getStyleGenerationStatus(currentMascot.id);
      if (!refs.isMountedRef.current) return;

      const batch = statusRes.active_batch;
      if (!batch) {
        await handleNoActiveBatch(statusRes, currentMascot.id);
        return;
      }

      setActiveBatch(batch);
      setQueuedStyleIds(statusRes.queued_style_ids || []);
      setActiveStyleIds(statusRes.active_style_ids || []);

      const activeJobs = batch.items.filter((j) => j.status === "generating");
      const activeNames = activeJobs.map((j) => j.style_name || j.style_id);
      const activeDesc = activeNames.length > 0 ? activeNames.join(", ") : "Preparing...";
      const queuedCount = statusRes.queued_style_ids?.length || 0;

      setQueueProgress((prev) => ({
        total: batch.total_styles,
        completed: batch.completed_count,
        failed: batch.failed_count,
        activeStyleIds: statusRes.active_style_ids || [],
        activeStyleNames: activeNames,
        statusMessage: `Generating: ${activeDesc}${queuedCount > 0 ? ` • ${queuedCount} queued` : ""}`,
        isStopping: prev?.isStopping ?? false,
        startTime: prev?.startTime ?? (new Date(batch.created_at).getTime() || Date.now()),
      }));

      // If new completions occurred since last poll, update mascot in real-time
      if (batch.completed_count > refs.lastCompletedCountRef.current) {
        refs.lastCompletedCountRef.current = batch.completed_count;
        await refreshMascot(currentMascot.id);

        const justFinishedJob = batch.items.find(
          (j) => j.status === "completed" && j.completed_at && Date.now() - new Date(j.completed_at).getTime() < 3000,
        );
        if (justFinishedJob) {
          refs.onNoticeRef.current(createStyleConceptSuccessNotice(justFinishedJob.style_name || justFinishedJob.style_id));
        }
      }

      if (["completed", "failed", "cancelled"].includes(batch.status)) {
        await handleBatchSettled(batch, currentMascot.id);
      }
    } catch {
      // Polling network error handled silently on individual tick
    }
  }, [
    handleBatchSettled,
    handleNoActiveBatch,
    refreshMascot,
    refs,
    setActiveBatch,
    setActiveStyleIds,
    setQueueProgress,
    setQueuedStyleIds,
  ]);

  const startPolling = useCallback(() => {
    stopPolling();
    isPollingRef.current = true;
    void pollBatchStatus();
    pollTimerRef.current = setInterval(() => {
      void pollBatchStatus();
    }, 1500);
  }, [pollBatchStatus, stopPolling]);

  // Tab switch resilience: trigger instant catch-up when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && refs.activeBatchIdRef.current) {
        void pollBatchStatus();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      stopPolling();
    };
  }, [pollBatchStatus, refs.activeBatchIdRef, stopPolling]);

  return {
    startPolling,
    stopPolling,
    pollBatchStatus,
  };
}
