import { useState, useCallback, useRef } from "react";
import type { MascotProfile, MascotStyle } from "@studio/shared";
import { resolveMascotStyle } from "@studio/shared";
import { api } from "../../../api";
import type { Notice } from "../../../components/types";

export type BatchProgressState = {
  total: number;
  completed: number;
  failed: number;
  activeSlotKeys: string[];
  statusMessage: string;
  startTime: number;
  isStopping: boolean;
};

export type UseMascotBatchGenerationProps = {
  mascot: MascotProfile | null;
  activeStyleId: string;
  activeStyle: MascotStyle | null;
  onMascotUpdated: (mascot: MascotProfile) => void;
  onNotice: (notice: Notice) => void;
};

export type UseMascotBatchGenerationResult = {
  busySlotKey: string | null;
  setBusySlotKey: React.Dispatch<React.SetStateAction<string | null>>;
  batchProgress: BatchProgressState | null;
  setBatchProgress: React.Dispatch<React.SetStateAction<BatchProgressState | null>>;
  handleStopBatchGeneration: () => void;
  handleGenerateSlot: (state: "thinking" | "celebrate", slotIndex: number, promptModifier?: string) => Promise<void>;
  handleBatchGenerateStyle: (stateFilter?: "thinking" | "celebrate" | "all") => Promise<void>;
};

export function useMascotBatchGeneration({
  mascot,
  activeStyleId,
  activeStyle,
  onMascotUpdated,
  onNotice,
}: UseMascotBatchGenerationProps): UseMascotBatchGenerationResult {
  const [busySlotKey, setBusySlotKey] = useState<string | null>(null);
  const [batchProgress, setBatchProgress] = useState<BatchProgressState | null>(null);
  const stopBatchRef = useRef<AbortController | null>(null);

  const handleStopBatchGeneration = useCallback(() => {
    stopBatchRef.current?.abort();
    setBatchProgress((prev) => (prev ? { ...prev, isStopping: true, statusMessage: "Cancelling remaining server slots..." } : null));
  }, []);

  const handleGenerateSlot = useCallback(
    async (state: "thinking" | "celebrate", slotIndex: number, promptModifier?: string) => {
      if (!mascot) return;
      const targetStyleId = activeStyle?.id || activeStyleId || "core";
      const slotKey = `${state}_${slotIndex}`;
      setBusySlotKey(slotKey);
      try {
        const result = await api.generateMascotStyleSlot(mascot.id, targetStyleId, {
          style_id: targetStyleId,
          state,
          slot_index: slotIndex,
          prompt_modifier: promptModifier,
        });
        onMascotUpdated(result.mascot);
        const successMessage = result.prompt_used
          ? `Slot ${slotIndex} (${state}) generated: "${result.prompt_used}"`
          : `Slot ${slotIndex} (${state}) generated successfully`;
        onNotice({
          tone: "good",
          message: successMessage,
        });
      } catch (err: unknown) {
        const error = err as Error;
        onNotice({
          tone: "bad",
          message: error?.message || `Failed to generate ${state} slot`,
        });
      } finally {
        setBusySlotKey(null);
      }
    },
    [mascot, activeStyle?.id, activeStyleId, onMascotUpdated, onNotice],
  );

  const handleBatchGenerateStyle = useCallback(
    async (stateFilter: "thinking" | "celebrate" | "all" = "all") => {
      if (!mascot) return;
      const targetStyleId = activeStyle?.id || activeStyleId || "core";
      const style = resolveMascotStyle(mascot, targetStyleId);
      if (!style) return;

      const statesToProcess: Array<"thinking" | "celebrate"> = stateFilter === "all" ? ["thinking", "celebrate"] : [stateFilter];

      const total = statesToProcess.reduce((count, st) => {
        const slots = style.states[st] || [];
        for (let i = 1; i <= 10; i++) {
          const slot = slots.find((s) => s.slot_index === i);
          if (!slot || !slot.image_url || slot.image_url.trim() === "") count += 1;
        }
        return count;
      }, 0);

      if (total === 0) {
        onNotice({
          tone: "good",
          message: `All ${stateFilter === "all" ? "slots" : `${stateFilter} slots`} in this style are already generated`,
        });
        return;
      }

      stopBatchRef.current?.abort();
      const abortController = new AbortController();
      stopBatchRef.current = abortController;

      setBusySlotKey("batch");
      setBatchProgress({
        total,
        completed: 0,
        failed: 0,
        activeSlotKeys: [],
        statusMessage: `Server is generating ${total} slots (3 concurrent streams)...`,
        startTime: Date.now(),
        isStopping: false,
      });

      try {
        const result = await api.generateMascotStyleBatch(
          mascot.id,
          targetStyleId,
          { style_id: targetStyleId, state: stateFilter },
          abortController.signal,
        );
        if (result?.mascot) {
          onMascotUpdated(result.mascot);
        }
        onNotice({
          tone: "good",
          message: result.cancelled
            ? `Batch generation stopped (${result.generated_count}/${total} slots generated)`
            : `Batch generation complete (${result.generated_count}/${total} slots generated)`,
        });
      } catch (err: unknown) {
        const error = err as Error;
        if (abortController.signal.aborted) {
          onNotice({
            tone: "good",
            message: "Batch generation stopped — remaining slots were cancelled on the server",
          });
        } else {
          onNotice({
            tone: "bad",
            message: error?.message || "Error during batch generation",
          });
        }
      } finally {
        setBusySlotKey(null);
        setBatchProgress(null);
        if (stopBatchRef.current === abortController) stopBatchRef.current = null;
      }
    },
    [mascot, activeStyle?.id, activeStyleId, onMascotUpdated, onNotice],
  );

  return {
    busySlotKey,
    setBusySlotKey,
    batchProgress,
    setBatchProgress,
    handleStopBatchGeneration,
    handleGenerateSlot,
    handleBatchGenerateStyle,
  };
}
