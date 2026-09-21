import { useCallback, useRef } from "react";
import type { QueueSlotGenerationMode } from "@studio/shared";
import { api } from "../../../../api";
import type { Notice } from "../../../../components/types";
import type { BatchSlotItem } from "../../types/mascotBatch.types";
import { formatQueuedKeys, formatSlotStreamMessage, inferBatchTargetState } from "../../utils/mascotBatchHelpers";
import {
  createQueuedMessage,
  getBatchQueuedKeys,
  getSlotKey,
  getTargetState,
  isOlderBatchSnapshot,
  mergeProgressMode,
  mergeTargetState,
  type MascotQueueProgressMode,
} from "../../utils/mascotSlotQueueHelpers";
import type { UseMascotBatchMutationsProps } from "./types";

export interface QueueMascotSlotsOptions {
  slots: BatchSlotItem[];
  requestMode: QueueSlotGenerationMode;
  progressMode: MascotQueueProgressMode;
  createErrorNotice: (error: unknown) => Notice;
}

class QueueSubmissionCancelledError extends Error {
  constructor() {
    super("Queue submission cancelled");
    this.name = "QueueSubmissionCancelledError";
  }
}

export function useMascotSlotQueue({ state, refs, startPolling, pollBatchStatus }: UseMascotBatchMutationsProps) {
  const requestChainRef = useRef<Promise<void>>(Promise.resolve());
  const queueEpochRef = useRef(0);

  const serializeRequest = useCallback(function serializeRequest<T>(request: () => Promise<T>): Promise<T> {
    const result = requestChainRef.current.then(request, request);
    requestChainRef.current = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }, []);

  const removePendingKeys = useCallback(
    (slotKeys: string[]) => {
      for (const key of slotKeys) refs.pendingSlotKeysRef.current.delete(key);
    },
    [refs.pendingSlotKeysRef],
  );

  const queueSlots = useCallback(
    async ({ slots, requestMode, progressMode, createErrorNotice }: QueueMascotSlotsOptions): Promise<boolean> => {
      const currentMascot = refs.mascotRef.current;
      if (!currentMascot || slots.length === 0) return false;

      const styleId = refs.activeStyleIdRef.current;
      const activeKeys = new Set(state.batchProgress?.activeSlotKeys ?? []);
      const knownQueuedKeys = new Set(state.queuedSlotKeys);
      const uniqueKeys = new Set<string>();
      const queueableSlots = slots.filter((slot) => {
        const key = getSlotKey(slot);
        if (uniqueKeys.has(key) || activeKeys.has(key) || knownQueuedKeys.has(key) || refs.pendingSlotKeysRef.current.has(key)) {
          return false;
        }
        uniqueKeys.add(key);
        return true;
      });
      if (queueableSlots.length === 0) return false;

      const slotKeys = queueableSlots.map(getSlotKey);
      const targetState = getTargetState(queueableSlots);
      const styleName = currentMascot.styles?.find((style) => style.id === styleId)?.name;
      const requestEpoch = queueEpochRef.current;
      refs.trackedStyleIdRef.current = styleId;
      for (const key of slotKeys) refs.pendingSlotKeysRef.current.add(key);

      state.setQueuedSlotKeys((current) => Array.from(new Set([...current, ...formatQueuedKeys(slotKeys, styleId)])));
      state.setBusySlotKey((current) => current ?? (queueableSlots.length === 1 ? (slotKeys[0] ?? "batch") : "batch"));
      state.setBatchProgress((current) =>
        current && !current.isStopping
          ? {
              ...current,
              total: current.total + queueableSlots.length,
              statusMessage: createQueuedMessage(queueableSlots),
              targetState: mergeTargetState(current.targetState, targetState),
              mode: mergeProgressMode(current.mode, progressMode),
            }
          : {
              styleId,
              styleName,
              total: queueableSlots.length,
              completed: 0,
              failed: 0,
              activeSlotKeys: [],
              statusMessage: createQueuedMessage(queueableSlots),
              startTime: Date.now(),
              isStopping: false,
              targetState,
              mode: progressMode,
            },
      );

      try {
        const batch = await serializeRequest(() => {
          if (requestEpoch !== queueEpochRef.current) throw new QueueSubmissionCancelledError();
          return api.queueSlotGeneration(currentMascot.id, styleId, {
            style_id: styleId,
            mode: requestMode,
            slots: queueableSlots.map((slot) => ({
              state: slot.state,
              slot_index: slot.slotIndex,
              prompt_modifier: slot.promptModifier,
            })),
          });
        });

        removePendingKeys(slotKeys);
        if (requestEpoch !== queueEpochRef.current || !refs.isMountedRef.current) return false;

        const isTrackedBatch = refs.activeBatchIdRef.current === batch.id;
        const isStaleResponse = isTrackedBatch && isOlderBatchSnapshot(batch.updated_at, refs.lastBatchUpdatedAtRef.current);
        if (!isStaleResponse) {
          const queuedKeys = [...getBatchQueuedKeys(batch), ...refs.pendingSlotKeysRef.current];
          refs.activeBatchIdRef.current = batch.id;
          refs.lastBatchUpdatedAtRef.current = batch.updated_at;
          state.setQueuedSlotKeys(formatQueuedKeys(queuedKeys, styleId));
          state.setBusySlotKey(batch.total_slots === 1 && batch.active_slot_keys[0] ? batch.active_slot_keys[0] : "batch");
          state.setBatchProgress((current) => {
            const isSameFlow = current?.styleId === styleId;
            const total = isSameFlow ? Math.max(current.total, batch.total_slots) : batch.total_slots;
            return {
              batchId: batch.id,
              styleId,
              styleName,
              total,
              completed: isSameFlow ? Math.max(current.completed, batch.completed_count) : batch.completed_count,
              failed: isSameFlow ? Math.max(current.failed, batch.failed_count) : batch.failed_count,
              activeSlotKeys: batch.active_slot_keys,
              statusMessage: formatSlotStreamMessage(batch.active_slot_keys, total, current?.isStopping),
              startTime: current?.startTime ?? (new Date(batch.created_at).getTime() || Date.now()),
              isStopping: current?.isStopping ?? false,
              targetState: inferBatchTargetState(batch),
              mode: mergeProgressMode(current?.mode, progressMode),
            };
          });
        }
        refs.onActivityChangeRef.current();
        startPolling();
        return true;
      } catch (error: unknown) {
        removePendingKeys(slotKeys);
        state.setQueuedSlotKeys((current) =>
          current.filter((key) => !slotKeys.includes(key) && !slotKeys.some((slotKey) => key === `${styleId}:${slotKey}`)),
        );

        if (error instanceof QueueSubmissionCancelledError || requestEpoch !== queueEpochRef.current) return false;

        state.setBatchProgress((current) => {
          if (!current) return null;
          const total = Math.max(current.completed + current.failed + current.activeSlotKeys.length, current.total - queueableSlots.length);
          return total > 0 ? { ...current, total, statusMessage: "Queue request failed" } : null;
        });
        if (!refs.activeBatchIdRef.current && refs.pendingSlotKeysRef.current.size === 0) {
          state.setBusySlotKey(null);
        }
        refs.onNoticeRef.current(createErrorNotice(error));
        await pollBatchStatus(false);
        return false;
      }
    },
    [pollBatchStatus, refs, removePendingKeys, serializeRequest, startPolling, state],
  );

  const cancelQueuedSubmissions = useCallback((): Promise<void> => {
    queueEpochRef.current += 1;
    const pendingKeys = Array.from(refs.pendingSlotKeysRef.current);
    refs.pendingSlotKeysRef.current.clear();
    state.setQueuedSlotKeys((current) =>
      current.filter((key) => !pendingKeys.includes(key) && !pendingKeys.some((pendingKey) => key.endsWith(`:${pendingKey}`))),
    );
    return requestChainRef.current;
  }, [refs.pendingSlotKeysRef, state]);

  return { queueSlots, cancelQueuedSubmissions };
}
