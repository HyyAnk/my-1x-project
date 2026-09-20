import { useCallback } from "react";
import { resolveMascotStyle } from "@studio/shared";
import { api } from "../../../../api";
import { resolveSlotsToGenerate } from "../../utils/mascotSlotPoseResolver";
import { formatQueuedKeys } from "../../utils/mascotBatchHelpers";
import { createSlotErrorNotice } from "../../services/mascotQueueNotices";
import type { UseMascotBatchMutationsProps } from "./types";

/**
 * Manages batch generation mutations (triggering batch jobs, single slot, multi-select, and cancellation).
 */
export function useMascotBatchMutations({ state, refs, startPolling, pollBatchStatus }: UseMascotBatchMutationsProps) {
  const handleStopBatchGeneration = useCallback(() => {
    if (!refs.mascotRef.current?.id) return;
    const styleId = refs.trackedStyleIdRef.current ?? refs.activeStyleIdRef.current;

    state.setBatchProgress((prev) => (prev ? { ...prev, isStopping: true, statusMessage: "Stopping batch generation..." } : null));

    void api
      .cancelSlotGeneration(refs.mascotRef.current.id, styleId)
      .then(() => {
        refs.onActivityChangeRef.current();
        void pollBatchStatus(false);
      })
      .catch((err: unknown) => {
        refs.onNoticeRef.current({
          tone: "bad",
          message: err instanceof Error ? err.message : "Failed to stop batch generation",
        });
      });
  }, [pollBatchStatus, refs, state]);

  const handleGenerateSlot = useCallback(
    async (stateFilter: "thinking" | "celebrate", slotIndex: number, promptModifier?: string): Promise<void> => {
      const currentMascot = refs.mascotRef.current;
      if (!currentMascot) return;
      const styleId = refs.activeStyleIdRef.current;
      const styleName = resolveMascotStyle(currentMascot, styleId)?.name;
      const slotKey = `${stateFilter}_${slotIndex}`;
      refs.trackedStyleIdRef.current = styleId;

      state.setBusySlotKey((prev) => prev ?? slotKey);
      state.setQueuedSlotKeys((prev) => Array.from(new Set([...prev, slotKey, `${styleId}:${slotKey}`])));
      state.setBatchProgress((prev) => {
        if (prev && !prev.isStopping) {
          const alreadyTracked = prev.activeSlotKeys.includes(slotKey);
          return {
            ...prev,
            total: alreadyTracked ? prev.total : prev.total + 1,
            statusMessage: `Queued ${stateFilter} slot ${slotIndex}...`,
          };
        }
        return {
          styleId,
          styleName,
          total: 1,
          completed: 0,
          failed: 0,
          activeSlotKeys: [slotKey],
          statusMessage: `Generating ${stateFilter} slot ${slotIndex}...`,
          startTime: Date.now(),
          isStopping: false,
          targetState: stateFilter,
          mode: "single",
        };
      });

      try {
        const batch = await api.queueSlotGeneration(currentMascot.id, styleId, {
          style_id: styleId,
          mode: "single",
          slots: [{ state: stateFilter, slot_index: slotIndex, prompt_modifier: promptModifier }],
        });

        if (batch?.id) {
          refs.activeBatchIdRef.current = batch.id;
          state.setBatchProgress((current) => (current ? { ...current, batchId: batch.id } : null));
        }
        refs.onActivityChangeRef.current();
        startPolling();
      } catch (err: unknown) {
        refs.onNoticeRef.current(createSlotErrorNotice(stateFilter, err));
        void pollBatchStatus(false);
      }
    },
    [pollBatchStatus, refs, startPolling, state],
  );

  const handleBatchGenerateStyle = useCallback(
    async (stateFilter: "thinking" | "celebrate" | "all" = "all"): Promise<void> => {
      const currentMascot = refs.mascotRef.current;
      if (!currentMascot) return;
      const styleId = refs.activeStyleIdRef.current;
      const style = resolveMascotStyle(currentMascot, styleId);
      if (!style) return;
      refs.trackedStyleIdRef.current = styleId;

      const slotsToGenerate = resolveSlotsToGenerate(style, stateFilter);
      if (slotsToGenerate.length === 0) {
        refs.onNoticeRef.current({
          tone: "good",
          message: `All ${stateFilter === "all" ? "slots" : `${stateFilter} slots`} in this style are already generated`,
        });
        return;
      }

      const slotKeys = slotsToGenerate.map((s) => `${s.state}_${s.slotIndex}`);
      state.setBusySlotKey("batch");
      state.setQueuedSlotKeys(formatQueuedKeys(slotKeys, styleId));
      state.setBatchProgress({
        styleId,
        styleName: style.name,
        total: slotsToGenerate.length,
        completed: 0,
        failed: 0,
        activeSlotKeys: [],
        statusMessage: `Generating ${slotsToGenerate.length} slots (3 concurrent streams)...`,
        startTime: Date.now(),
        isStopping: false,
        targetState: stateFilter,
        mode: "batch_empty",
      });

      try {
        const batch = await api.queueSlotGeneration(currentMascot.id, styleId, {
          style_id: styleId,
          mode: "batch_empty",
          slots: slotsToGenerate.map((s) => ({
            state: s.state,
            slot_index: s.slotIndex,
            prompt_modifier: s.promptModifier,
          })),
        });

        if (batch?.id) {
          refs.activeBatchIdRef.current = batch.id;
          state.setBatchProgress((current) => (current ? { ...current, batchId: batch.id } : null));
        }
        refs.lastCompletedCountRef.current = 0;
        refs.onActivityChangeRef.current();
        startPolling();
      } catch (err: unknown) {
        refs.trackedStyleIdRef.current = null;
        state.resetBatchState();
        refs.onNoticeRef.current({
          tone: "bad",
          message: err instanceof Error ? err.message : "Failed to start batch generation",
        });
      }
    },
    [refs, startPolling, state],
  );

  const handleRegenerateSelectedSlots = useCallback(
    async (slots: Array<{ state: "thinking" | "celebrate"; slotIndex: number; promptModifier?: string }>): Promise<void> => {
      const currentMascot = refs.mascotRef.current;
      if (!currentMascot || slots.length === 0) return;
      const styleId = refs.activeStyleIdRef.current;
      const styleName = resolveMascotStyle(currentMascot, styleId)?.name;
      refs.trackedStyleIdRef.current = styleId;

      const slotKeys = slots.map((s) => `${s.state}_${s.slotIndex}`);
      const targetState = slots.every((s) => s.state === "thinking")
        ? "thinking"
        : slots.every((s) => s.state === "celebrate")
          ? "celebrate"
          : "all";

      state.setBusySlotKey("batch");
      state.setQueuedSlotKeys((prev) => Array.from(new Set([...prev, ...formatQueuedKeys(slotKeys, styleId)])));
      state.setBatchProgress((prev) => {
        if (prev && !prev.isStopping) {
          return {
            ...prev,
            total: prev.total + slots.length,
            statusMessage: `Queued ${slots.length} selected slots...`,
          };
        }
        return {
          styleId,
          styleName,
          total: slots.length,
          completed: 0,
          failed: 0,
          activeSlotKeys: [],
          statusMessage: `Generating ${slots.length} selected slots...`,
          startTime: Date.now(),
          isStopping: false,
          targetState,
          mode: "regenerate_selected",
        };
      });

      try {
        const batch = await api.queueSlotGeneration(currentMascot.id, styleId, {
          style_id: styleId,
          mode: "regenerate_selected",
          slots: slots.map((s) => ({
            state: s.state,
            slot_index: s.slotIndex,
            prompt_modifier: s.promptModifier,
          })),
        });

        if (batch?.id) {
          refs.activeBatchIdRef.current = batch.id;
          state.setBatchProgress((current) => (current ? { ...current, batchId: batch.id } : null));
        }
        refs.onActivityChangeRef.current();
        startPolling();
      } catch (err: unknown) {
        refs.onNoticeRef.current({
          tone: "bad",
          message: err instanceof Error ? err.message : "Failed to start regeneration for selected slots",
        });
        void pollBatchStatus(false);
      }
    },
    [pollBatchStatus, refs, startPolling, state],
  );

  return {
    handleStopBatchGeneration,
    handleGenerateSlot,
    handleBatchGenerateStyle,
    handleRegenerateSelectedSlots,
  };
}
