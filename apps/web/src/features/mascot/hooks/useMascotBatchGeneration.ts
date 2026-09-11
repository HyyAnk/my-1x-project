import { useState, useCallback, useRef } from "react";
import type { MascotProfile, MascotStyle } from "@studio/shared";
import { resolveMascotStyle, getMascotSlotDefaultPreset, pickShuffledUnusedPoses } from "@studio/shared";
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
  targetState?: "thinking" | "celebrate" | "all";
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
    setBatchProgress((prev) => (prev ? { ...prev, isStopping: true, statusMessage: "Stopping batch generation..." } : null));
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

      // 1. Gather all empty slots across target states
      const slotsToGenerate: Array<{
        state: "thinking" | "celebrate";
        slotIndex: number;
        promptModifier?: string;
      }> = [];

      for (const st of statesToProcess) {
        const slots = style.states[st] || [];
        const filledPrompts: string[] = [];
        const emptySlotsForState: Array<{ slot_index: number; existingPrompt?: string }> = [];

        for (let i = 1; i <= 10; i++) {
          const slot = slots.find((s) => s.slot_index === i);
          if (slot && slot.image_url && slot.image_url.trim() !== "") {
            if (slot.prompt_modifier?.trim()) {
              filledPrompts.push(slot.prompt_modifier.trim());
            } else {
              filledPrompts.push(getMascotSlotDefaultPreset(st, i));
            }
          } else {
            emptySlotsForState.push({
              slot_index: i,
              existingPrompt: slot?.prompt_modifier?.trim() || undefined,
            });
          }
        }

        if (emptySlotsForState.length > 0) {
          const preassignedPrompts = emptySlotsForState
            .map((s) => s.existingPrompt)
            .filter((p): p is string => Boolean(p));

          const alreadyUsedPrompts = [...filledPrompts, ...preassignedPrompts];
          const slotsNeedingPose = emptySlotsForState.filter((s) => !s.existingPrompt);

          const assignedPoses = pickShuffledUnusedPoses(
            st,
            alreadyUsedPrompts,
            slotsNeedingPose.length,
          );

          let poseIdx = 0;
          for (const item of emptySlotsForState) {
            const promptModifier = item.existingPrompt || assignedPoses[poseIdx++]?.prompt;
            slotsToGenerate.push({
              state: st,
              slotIndex: item.slot_index,
              promptModifier,
            });
          }
        }
      }

      const total = slotsToGenerate.length;
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
        statusMessage: `Generating ${total} slots (3 concurrent streams)...`,
        startTime: Date.now(),
        isStopping: false,
        targetState: stateFilter,
      });

      const CONCURRENCY = Math.min(3, slotsToGenerate.length);
      let queueIndex = 0;
      let completedCount = 0;
      let failedCount = 0;
      const activeKeys = new Set<string>();
      let currentMascot = mascot;

      const updateProgress = (statusMsg?: string) => {
        setBatchProgress((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            completed: completedCount,
            failed: failedCount,
            activeSlotKeys: Array.from(activeKeys),
            statusMessage: statusMsg ?? prev.statusMessage,
          };
        });
      };

      const runWorker = async (workerId: number) => {
        while (queueIndex < slotsToGenerate.length) {
          if (abortController.signal.aborted) break;
          const currentItem = slotsToGenerate[queueIndex++];
          if (!currentItem) break;

          const slotKey = `${currentItem.state}_${currentItem.slotIndex}`;
          activeKeys.add(slotKey);
          updateProgress(`Stream ${workerId}: Generating ${currentItem.state} slot ${currentItem.slotIndex}...`);

          try {
            const result = await api.generateMascotStyleSlot(
              currentMascot.id,
              targetStyleId,
              {
                style_id: targetStyleId,
                state: currentItem.state,
                slot_index: currentItem.slotIndex,
                prompt_modifier: currentItem.promptModifier,
              },
              abortController.signal,
            );

            if (result?.mascot) {
              currentMascot = result.mascot;
              onMascotUpdated(result.mascot);
            }
            completedCount++;
          } catch (err: unknown) {
            if (abortController.signal.aborted) {
              break;
            }
            failedCount++;
            console.error(`Failed to generate slot ${slotKey}:`, err);
          } finally {
            activeKeys.delete(slotKey);
            updateProgress();
          }
        }
      };

      try {
        const workers = Array.from({ length: CONCURRENCY }, (_, i) => runWorker(i + 1));
        await Promise.all(workers);

        if (abortController.signal.aborted) {
          onNotice({
            tone: "good",
            message: `Batch generation stopped (${completedCount}/${total} slots generated)`,
          });
        } else if (failedCount > 0) {
          onNotice({
            tone: completedCount === 0 ? "bad" : "good",
            message:
              completedCount === 0
                ? `Batch generation failed: all ${failedCount} slots failed`
                : `Batch generation finished: ${completedCount}/${total} slots generated (${failedCount} failed)`,
          });
        } else {
          onNotice({
            tone: "good",
            message: `Batch generation complete (${completedCount}/${total} slots generated)`,
          });
        }
      } catch (err: unknown) {
        const error = err as Error;
        onNotice({
          tone: "bad",
          message: error?.message || "Error during batch generation",
        });
      } finally {
        setBusySlotKey(null);
        setBatchProgress(null);
        if (stopBatchRef.current === abortController) {
          stopBatchRef.current = null;
        }
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
