import type { MascotProfile } from "@studio/shared";
import { api } from "../../../api";
import type {
  BatchSlotItem,
  MascotQueueCallbacks,
  QueuedSlotTask,
} from "../types/mascotBatch.types";
import {
  createBatchOutcomeNotice,
  createSlotErrorNotice,
  createSlotSuccessNotice,
} from "./mascotQueueNotices";

export class MascotGenerationQueue {
  private queue: QueuedSlotTask[] = [];
  private isProcessingQueue = false;
  private runningSlotKey: string | null = null;
  private stopBatchController: AbortController | null = null;
  private callbacks: MascotQueueCallbacks;

  constructor(callbacks: MascotQueueCallbacks) {
    this.callbacks = callbacks;
  }

  public updateCallbacks(callbacks: MascotQueueCallbacks): void {
    this.callbacks = callbacks;
  }

  public isSlotQueued(styleId: string, state: "thinking" | "celebrate", slotIndex: number): boolean {
    const key = `${styleId}:${state}_${slotIndex}`;
    if (this.runningSlotKey === key) return true;
    return this.queue.some(
      (t) => t.styleId === styleId && t.state === state && t.slotIndex === slotIndex,
    );
  }

  public enqueueSlot(
    styleId: string,
    state: "thinking" | "celebrate",
    slotIndex: number,
    promptModifier?: string,
  ): Promise<void> {
    if (this.isSlotQueued(styleId, state, slotIndex)) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      this.queue.push({
        styleId,
        state,
        slotIndex,
        promptModifier,
        resolve,
        reject: () => resolve(),
      });
      this.syncQueuedKeys();
      void this.processSingleQueue();
    });
  }

  private syncQueuedKeys(): void {
    const keys: string[] = [];
    for (const t of this.queue) {
      const rawKey = `${t.state}_${t.slotIndex}`;
      keys.push(rawKey);
      keys.push(`${t.styleId}:${rawKey}`);
    }
    this.callbacks.onQueuedKeysChange(Array.from(new Set(keys)));
  }

  private async processSingleQueue(): Promise<void> {
    if (this.isProcessingQueue) return;
    this.isProcessingQueue = true;

    while (this.queue.length > 0) {
      const task = this.queue[0];
      if (!task) break;

      const currentMascot = this.callbacks.getLatestMascot();
      if (!currentMascot) {
        this.queue.shift();
        this.syncQueuedKeys();
        task.resolve();
        continue;
      }

      const slotKey = `${task.state}_${task.slotIndex}`;
      this.runningSlotKey = `${task.styleId}:${slotKey}`;
      this.callbacks.onBusySlotChange(slotKey);
      this.queue.shift();
      this.syncQueuedKeys();

      const result = await this.executeSingleSlotTask(task, currentMascot);

      this.runningSlotKey = null;
      if (this.queue.length === 0) {
        this.callbacks.onBusySlotChange(null);
      }

      if (result.success) {
        task.resolve();
      } else {
        task.reject(result.error);
      }
    }

    this.runningSlotKey = null;
    this.callbacks.onBusySlotChange(null);
    this.isProcessingQueue = false;
  }

  private async executeSingleSlotTask(
    task: QueuedSlotTask,
    currentMascot: MascotProfile,
  ): Promise<{ success: boolean; error?: Error }> {
    try {
      const result = await api.generateMascotStyleSlot(currentMascot.id, task.styleId, {
        style_id: task.styleId,
        state: task.state,
        slot_index: task.slotIndex,
        prompt_modifier: task.promptModifier,
        composition: "half_body_16_9",
      });

      if (result?.mascot) {
        this.callbacks.onMascotUpdated(result.mascot);
      }

      this.callbacks.onNotice(createSlotSuccessNotice(task.slotIndex, task.state, result.prompt_used));
      return { success: true };
    } catch (err: unknown) {
      this.callbacks.onNotice(createSlotErrorNotice(task.state, err));
      return { success: false, error: err as Error };
    }
  }

  public stopBatch(): void {
    this.stopBatchController?.abort();
    this.callbacks.onProgressChange((prev) =>
      prev ? { ...prev, isStopping: true, statusMessage: "Stopping batch generation..." } : null,
    );
  }

  public async runBatchGeneration(options: {
    mascot: MascotProfile;
    targetStyleId: string;
    slotsToGenerate: BatchSlotItem[];
    stateFilter?: "thinking" | "celebrate" | "all";
  }): Promise<void> {
    const { mascot, targetStyleId, slotsToGenerate, stateFilter = "all" } = options;
    const total = slotsToGenerate.length;

    this.stopBatchController?.abort();
    const abortController = new AbortController();
    this.stopBatchController = abortController;

    this.callbacks.onBusySlotChange("batch");
    this.callbacks.onProgressChange({
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
      this.callbacks.onProgressChange((prev) => {
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
              composition: "half_body_16_9",
            },
            abortController.signal,
          );

          if (result?.mascot) {
            currentMascot = result.mascot;
            this.callbacks.onMascotUpdated(result.mascot);
          }
          completedCount++;
        } catch (err: unknown) {
          if (abortController.signal.aborted) break;
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

      this.callbacks.onNotice(
        createBatchOutcomeNotice(abortController.signal.aborted, completedCount, failedCount, total),
      );
    } catch (err: unknown) {
      const error = err as Error;
      this.callbacks.onNotice({
        tone: "bad",
        message: error?.message || "Error during batch generation",
      });
    } finally {
      this.callbacks.onBusySlotChange(null);
      this.callbacks.onProgressChange(null);
      if (this.stopBatchController === abortController) {
        this.stopBatchController = null;
      }
    }
  }
}
