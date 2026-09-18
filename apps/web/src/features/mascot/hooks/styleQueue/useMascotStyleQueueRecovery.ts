import { useEffect, useRef } from "react";
import type { MascotProfile } from "@studio/shared";
import { api } from "../../../../api";
import { createStyleCatchUpCompletedNotice, createStyleReconnectedNotice } from "../../services/mascotQueueNotices";
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
  const recoveredMascotIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!mascot) return;
    if (recoveredMascotIdRef.current === mascot.id) return;
    recoveredMascotIdRef.current = mascot.id;

    let isCancelled = false;

    const recoverOnMount = async () => {
      try {
        const statusRes = await api.getStyleGenerationStatus(mascot.id);
        if (isCancelled || !refs.isMountedRef.current) return;

        const activeBatch = statusRes.active_batch;
        if (activeBatch && (activeBatch.status === "queued" || activeBatch.status === "processing")) {
          refs.activeBatchIdRef.current = activeBatch.id;
          refs.lastCompletedCountRef.current = activeBatch.completed_count;

          const activeIds = statusRes.active_style_ids || [];
          const queuedIds = statusRes.queued_style_ids || [];
          const activeJobs = activeBatch.items.filter((j) => j.status === "generating");
          const activeNames = activeJobs.map((j) => j.style_name || j.style_id);
          const activeDesc = activeNames.length > 0 ? activeNames.join(", ") : "Preparing...";

          state.setActiveBatch(activeBatch);
          state.setQueuedStyleIds(queuedIds);
          state.setActiveStyleIds(activeIds);

          state.setQueueProgress({
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

          try {
            const mascotRes = await api.mascot(mascot.id);
            if (!isCancelled && refs.isMountedRef.current && mascotRes?.mascot) {
              refs.onMascotUpdatedRef.current(mascotRes.mascot);
            }
          } catch {
            // Non-fatal
          }

          refs.onNoticeRef.current(createStyleReconnectedNotice(activeBatch.completed_count, activeBatch.total_styles, activeIds.length));
          return;
        }

        // Catch-up if a recent batch finished while user was navigated away
        const recentBatch = statusRes.recent_batches?.[0];
        if (
          recentBatch &&
          recentBatch.status === "completed" &&
          isBatchRecent(recentBatch.updated_at || recentBatch.created_at) &&
          !isBatchAcknowledgedInSession(recentBatch.id)
        ) {
          acknowledgeBatchInSession(recentBatch.id);
          try {
            const mascotRes = await api.mascot(mascot.id);
            if (!isCancelled && refs.isMountedRef.current && mascotRes?.mascot) {
              refs.onMascotUpdatedRef.current(mascotRes.mascot);
            }
          } catch {
            // Non-fatal
          }
          refs.onNoticeRef.current(createStyleCatchUpCompletedNotice(recentBatch.completed_count, recentBatch.total_styles));
        }
      } catch {
        // Recovery error ignored on mount
      }
    };

    void recoverOnMount();

    return () => {
      isCancelled = true;
      stopPolling();
    };
  }, [mascot?.id, refs, startPolling, state, stopPolling]);
}
