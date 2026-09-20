import { useEffect, useRef } from "react";
import type { MascotProfile, MascotStyleBatchJob } from "@studio/shared";
import { api } from "../../../../api";
import {
  createStyleBatchOutcomeNotice,
  createStyleCatchUpCompletedNotice,
  createStyleReconnectedNotice,
} from "../../services/mascotQueueNotices";
import { isBatchAcknowledgedInSession, acknowledgeBatchInSession, isBatchRecent } from "../../utils/mascotSessionStorage";
import type { MascotStyleQueueStateReturn, StyleQueueRefs } from "./types";

export interface UseMascotStyleQueueRecoveryProps {
  mascot: MascotProfile | null;
  state: MascotStyleQueueStateReturn;
  refs: StyleQueueRefs;
  startPolling: () => void;
  stopPolling: () => void;
}

export function useMascotStyleQueueRecovery({ mascot, state, refs, startPolling, stopPolling }: UseMascotStyleQueueRecoveryProps): void {
  const recoveryAttemptRef = useRef(0);
  const mascotId = mascot?.id;
  const { setActiveBatch, setQueuedStyleIds, setActiveStyleIds, setQueueProgress } = state;

  useEffect(() => {
    if (!mascotId) return;
    const recoveryAttempt = ++recoveryAttemptRef.current;
    let isCancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let terminalTimer: ReturnType<typeof setTimeout> | null = null;
    const canCommit = () => !isCancelled && recoveryAttemptRef.current === recoveryAttempt && refs.isMountedRef.current;

    const refreshMascot = async () => {
      try {
        const mascotRes = await api.mascot(mascotId);
        if (canCommit() && mascotRes?.mascot) refs.onMascotUpdatedRef.current(mascotRes.mascot);
      } catch {
        // A later activity refresh can retry this non-critical request.
      }
    };

    const restoreTerminalBatch = async (batch: MascotStyleBatchJob) => {
      setActiveBatch(batch);
      setQueuedStyleIds([]);
      setActiveStyleIds([]);
      setQueueProgress({
        total: batch.total_styles,
        completed: batch.completed_count,
        failed: batch.failed_count,
        activeStyleIds: [],
        activeStyleNames: [],
        statusMessage:
          batch.status === "cancelled"
            ? "Style concept generation stopped"
            : batch.failed_count > 0
              ? `${batch.failed_count} style concept(s) failed`
              : "Style concept generation completed",
        isStopping: false,
        startTime: new Date(batch.created_at).getTime() || Date.now(),
      });

      if (batch.completed_count > 0) await refreshMascot();
      if (!isBatchAcknowledgedInSession(batch.id)) {
        acknowledgeBatchInSession(batch.id);
        refs.onNoticeRef.current(
          batch.status === "completed" && batch.failed_count === 0
            ? createStyleCatchUpCompletedNotice(batch.completed_count, batch.total_styles)
            : createStyleBatchOutcomeNotice(batch.status === "cancelled", batch.completed_count, batch.failed_count, batch.total_styles),
        );
      }

      if (batch.failed_count === 0) {
        terminalTimer = setTimeout(() => {
          if (canCommit() && !refs.activeBatchIdRef.current) setQueueProgress(null);
        }, 8_000);
      }
    };

    const recoverOnMount = async (retriesRemaining: number) => {
      try {
        const statusRes = await api.getStyleGenerationStatus(mascotId);
        if (!canCommit()) return;

        const activeBatch = statusRes.active_batch;
        if (activeBatch && (activeBatch.status === "queued" || activeBatch.status === "processing")) {
          refs.activeBatchIdRef.current = activeBatch.id;
          refs.lastCompletedCountRef.current = activeBatch.completed_count;

          const activeIds = statusRes.active_style_ids || [];
          const queuedIds = statusRes.queued_style_ids || [];
          const activeJobs = activeBatch.items.filter((j) => j.status === "generating");
          const activeNames = activeJobs.map((j) => j.style_name || j.style_id);
          const activeDesc = activeNames.length > 0 ? activeNames.join(", ") : "Preparing...";

          setActiveBatch(activeBatch);
          setQueuedStyleIds(queuedIds);
          setActiveStyleIds(activeIds);

          setQueueProgress({
            total: activeBatch.total_styles,
            completed: activeBatch.completed_count,
            failed: activeBatch.failed_count,
            activeStyleIds: activeIds,
            activeStyleNames: activeNames,
            statusMessage: `Generating: ${activeDesc}${queuedIds.length > 0 ? ` • ${queuedIds.length} queued` : ""}`,
            isStopping: false,
            startTime: new Date(activeBatch.created_at).getTime() || Date.now(),
          });

          startPolling();
          await refreshMascot();
          if (!canCommit()) return;
          refs.onNoticeRef.current(createStyleReconnectedNotice(activeBatch.completed_count, activeBatch.total_styles, activeIds.length));
          return;
        }

        const recentBatch = statusRes.recent_batches?.[0];
        if (recentBatch && isBatchRecent(recentBatch.updated_at || recentBatch.created_at)) {
          await restoreTerminalBatch(recentBatch);
        }
      } catch {
        if (canCommit() && retriesRemaining > 0) {
          retryTimer = setTimeout(() => void recoverOnMount(retriesRemaining - 1), 1_500);
        }
      }
    };

    const recoverWhenOnline = () => void recoverOnMount(1);
    window.addEventListener("online", recoverWhenOnline);
    void recoverOnMount(2);

    return () => {
      isCancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      if (terminalTimer) clearTimeout(terminalTimer);
      window.removeEventListener("online", recoverWhenOnline);
      stopPolling();
    };
  }, [mascotId, refs, setActiveBatch, setActiveStyleIds, setQueueProgress, setQueuedStyleIds, startPolling, stopPolling]);
}
