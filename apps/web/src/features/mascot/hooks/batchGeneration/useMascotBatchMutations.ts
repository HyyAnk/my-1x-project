import { useCallback } from "react";
import { resolveMascotStyle } from "@studio/shared";
import { api } from "../../../../api";
import type { Notice } from "../../../../components/types";
import type { BatchSlotItem } from "../../types/mascotBatch.types";
import { createSlotErrorNotice } from "../../services/mascotQueueNotices";
import { resolveSlotsToGenerate } from "../../utils/mascotSlotPoseResolver";
import type { UseMascotBatchMutationsProps } from "./types";
import { useMascotSlotQueue } from "./useMascotSlotQueue";

function createBatchErrorNotice(message: string): (error: unknown) => Notice {
  return (error) => ({
    tone: "bad",
    message: error instanceof Error ? error.message : message,
  });
}

/**
 * Manages batch generation mutations (triggering batch jobs, single slot, multi-select, and cancellation).
 */
export function useMascotBatchMutations(props: UseMascotBatchMutationsProps) {
  const { state, refs, pollBatchStatus } = props;
  const { queueSlots, cancelQueuedSubmissions } = useMascotSlotQueue(props);

  const handleStopBatchGeneration = useCallback(() => {
    const mascotId = refs.mascotRef.current?.id;
    if (!mascotId) return;
    const styleId = refs.trackedStyleIdRef.current ?? refs.activeStyleIdRef.current;

    state.setBatchProgress((current) => (current ? { ...current, isStopping: true, statusMessage: "Stopping batch generation..." } : null));

    void cancelQueuedSubmissions()
      .then(() => api.cancelSlotGeneration(mascotId, styleId))
      .then(() => {
        refs.onActivityChangeRef.current();
        void pollBatchStatus(false);
      })
      .catch((error: unknown) => {
        refs.onNoticeRef.current({
          tone: "bad",
          message: error instanceof Error ? error.message : "Failed to stop batch generation",
        });
      });
  }, [cancelQueuedSubmissions, pollBatchStatus, refs, state]);

  const handleGenerateSlot = useCallback(
    async (slotState: "thinking" | "celebrate", slotIndex: number, promptModifier?: string): Promise<void> => {
      await queueSlots({
        slots: [{ state: slotState, slotIndex, promptModifier }],
        requestMode: "single",
        progressMode: "single",
        createErrorNotice: (error) => createSlotErrorNotice(slotState, error),
      });
    },
    [queueSlots],
  );

  const handleBatchGenerateStyle = useCallback(
    async (stateFilter: "thinking" | "celebrate" | "all" = "all"): Promise<void> => {
      const currentMascot = refs.mascotRef.current;
      if (!currentMascot) return;
      const style = resolveMascotStyle(currentMascot, refs.activeStyleIdRef.current);
      if (!style) return;

      const pendingKeys = new Set([
        ...state.queuedSlotKeys.filter((key) => !key.includes(":")),
        ...(state.batchProgress?.activeSlotKeys ?? []),
        ...refs.pendingSlotKeysRef.current,
      ]);
      const emptySlots = resolveSlotsToGenerate(style, stateFilter);
      const slotsToQueue = emptySlots.filter((slot) => !pendingKeys.has(`${slot.state}_${slot.slotIndex}`));

      if (emptySlots.length === 0) {
        refs.onNoticeRef.current({
          tone: "good",
          message: `All ${stateFilter === "all" ? "slots" : `${stateFilter} slots`} in this style are already generated`,
        });
        return;
      }
      if (slotsToQueue.length === 0) {
        refs.onNoticeRef.current({ tone: "good", message: "All empty slots are already queued" });
        return;
      }

      await queueSlots({
        slots: slotsToQueue,
        requestMode: "batch_empty",
        progressMode: "batch_empty",
        createErrorNotice: createBatchErrorNotice("Failed to queue empty slots"),
      });
    },
    [queueSlots, refs, state.batchProgress?.activeSlotKeys, state.queuedSlotKeys],
  );

  const handleGenerateSelectedSlots = useCallback(
    (slots: BatchSlotItem[]): Promise<boolean> =>
      queueSlots({
        slots,
        requestMode: "batch_empty",
        progressMode: "generate_selected",
        createErrorNotice: createBatchErrorNotice("Failed to queue selected slots"),
      }),
    [queueSlots],
  );

  const handleRegenerateSelectedSlots = useCallback(
    (slots: BatchSlotItem[]): Promise<boolean> =>
      queueSlots({
        slots,
        requestMode: "regenerate_selected",
        progressMode: "regenerate_selected",
        createErrorNotice: createBatchErrorNotice("Failed to queue selected variants"),
      }),
    [queueSlots],
  );

  return {
    handleStopBatchGeneration,
    handleGenerateSlot,
    handleBatchGenerateStyle,
    handleGenerateSelectedSlots,
    handleRegenerateSelectedSlots,
  };
}
