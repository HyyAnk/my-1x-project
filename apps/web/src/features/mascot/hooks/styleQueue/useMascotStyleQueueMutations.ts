import { useCallback } from "react";
import { api } from "../../../../api";
import type { MascotStyleQueueStateReturn, StyleQueueRefs } from "./types";

export interface UseMascotStyleQueueMutationsProps {
  state: MascotStyleQueueStateReturn;
  refs: StyleQueueRefs;
  startPolling: () => void;
  pollBatchStatus: () => Promise<void>;
}

export function useMascotStyleQueueMutations({ state, refs, startPolling, pollBatchStatus }: UseMascotStyleQueueMutationsProps) {
  const handleQueueStyle = useCallback(
    async (styleId: string, prompt?: string) => {
      const mascot = refs.mascotRef.current;
      if (!mascot) return;

      const style = (mascot.styles || []).find((s) => s.id === styleId);
      const styleName = style?.name || styleId;

      try {
        const batch = await api.queueStyleGeneration(mascot.id, {
          styles: [{ style_id: styleId, style_name: styleName, prompt }],
          mode: "single",
        });

        refs.activeBatchIdRef.current = batch.id;
        state.setActiveBatch(batch);
        state.setQueuedStyleIds(batch.items.filter((j) => j.status === "queued").map((j) => j.style_id));
        state.setActiveStyleIds(batch.items.filter((j) => j.status === "generating").map((j) => j.style_id));

        state.setQueueProgress({
          total: batch.total_styles,
          completed: batch.completed_count,
          failed: batch.failed_count,
          activeStyleIds: batch.active_style_ids,
          activeStyleNames: [styleName],
          statusMessage: `Queued concept for "${styleName}"...`,
          isStopping: false,
          startTime: Date.now(),
        });

        startPolling();
      } catch (err: unknown) {
        const error = err as Error;
        refs.onNoticeRef.current({
          tone: "bad",
          message: error?.message || `Failed to queue concept for style "${styleName}"`,
        });
      }
    },
    [refs, startPolling, state],
  );

  const handleQueueAllMissingStyles = useCallback(async () => {
    const mascot = refs.mascotRef.current;
    if (!mascot) return;

    const missingStyles = (mascot.styles || []).filter((s) => s.id !== "core" && !s.is_default && !s.anchor_image_url);

    if (missingStyles.length === 0) {
      refs.onNoticeRef.current({
        tone: "neutral",
        message: "All styles already have anchor concepts generated",
      });
      return;
    }

    try {
      const batch = await api.queueStyleGeneration(mascot.id, {
        styles: missingStyles.map((s) => ({ style_id: s.id, style_name: s.name })),
        mode: "all_missing",
      });

      refs.activeBatchIdRef.current = batch.id;
      state.setActiveBatch(batch);
      state.setQueuedStyleIds(batch.items.filter((j) => j.status === "queued").map((j) => j.style_id));
      state.setActiveStyleIds(batch.items.filter((j) => j.status === "generating").map((j) => j.style_id));

      state.setQueueProgress({
        total: batch.total_styles,
        completed: batch.completed_count,
        failed: batch.failed_count,
        activeStyleIds: batch.active_style_ids,
        activeStyleNames: [],
        statusMessage: `Queued ${missingStyles.length} style concepts for generation...`,
        isStopping: false,
        startTime: Date.now(),
      });

      startPolling();
    } catch (err: unknown) {
      const error = err as Error;
      refs.onNoticeRef.current({
        tone: "bad",
        message: error?.message || "Failed to queue missing style concepts",
      });
    }
  }, [refs, startPolling, state]);

  const handleStopStyleQueue = useCallback(async () => {
    const mascot = refs.mascotRef.current;
    if (!mascot) return;

    state.setQueueProgress((prev) => (prev ? { ...prev, isStopping: true, statusMessage: "Stopping queue..." } : null));

    try {
      await api.cancelStyleGeneration(mascot.id);
      await pollBatchStatus();
    } catch (err: unknown) {
      const error = err as Error;
      refs.onNoticeRef.current({
        tone: "bad",
        message: error?.message || "Failed to stop style concept generation",
      });
    }
  }, [pollBatchStatus, refs, state]);

  const handleRetryFailedStyles = useCallback(async () => {
    const mascot = refs.mascotRef.current;
    const currentBatch = state.activeBatch;
    if (!mascot || !currentBatch) return;

    const failedItems = currentBatch.items.filter((j) => j.status === "failed");
    if (failedItems.length === 0) return;

    try {
      const batch = await api.queueStyleGeneration(mascot.id, {
        styles: failedItems.map((j) => ({ style_id: j.style_id, style_name: j.style_name, prompt: j.prompt ?? undefined })),
        mode: "batch",
      });

      refs.activeBatchIdRef.current = batch.id;
      state.setActiveBatch(batch);
      state.setQueuedStyleIds(batch.items.filter((j) => j.status === "queued").map((j) => j.style_id));
      state.setActiveStyleIds(batch.items.filter((j) => j.status === "generating").map((j) => j.style_id));

      state.setQueueProgress({
        total: batch.total_styles,
        completed: batch.completed_count,
        failed: batch.failed_count,
        activeStyleIds: batch.active_style_ids,
        activeStyleNames: [],
        statusMessage: `Retrying ${failedItems.length} failed style concept(s)...`,
        isStopping: false,
        startTime: Date.now(),
      });

      startPolling();
    } catch (err: unknown) {
      const error = err as Error;
      refs.onNoticeRef.current({
        tone: "bad",
        message: error?.message || "Failed to retry style concepts",
      });
    }
  }, [refs, startPolling, state]);

  return {
    handleQueueStyle,
    handleQueueAllMissingStyles,
    handleStopStyleQueue,
    handleRetryFailedStyles,
  };
}
