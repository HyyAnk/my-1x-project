import { useCallback, useEffect, useRef } from "react";
import type { ShortReelRecord, Task } from "@studio/shared";
import { api, ApiError } from "../../../api";
import { subscribeEvents } from "../../../api/client";

export interface UseShortReelRecordSyncOptions {
  channelId: string;
  reelId: string;
  onRecordUpdated: (remoteReel: ShortReelRecord, task: Task | null) => void;
  onTaskUpdated: (task: Task) => void;
  onError?: (error: Error, isNotFound: boolean) => void;
}

const ACTIVE_TASK_STATUSES = ["QUEUED", "RUNNING", "WAITING_APPROVAL"];
const TERMINAL_TASK_STATUSES = ["COMPLETED", "FAILED", "CANCELLED"];
const FALLBACK_POLL_INTERVAL_MS = 3000;
const BURST_COALESCE_DELAY_MS = 25;

export function useShortReelRecordSync({ channelId, reelId, onRecordUpdated, onTaskUpdated, onError }: UseShortReelRecordSyncOptions) {
  // Epoch counters to discard stale responses across target switches
  const epochRef = useRef(0);
  const fetchSeqRef = useRef(0);
  const highestCompletedSeqRef = useRef(0);

  // Revision and task identity tracking
  const newestRevisionRef = useRef(0);
  const activeTaskRef = useRef<Task | null>(null);
  const activeTaskIdRef = useRef<string | null>(null);

  // Burst coalescing timer
  const burstTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stable callbacks
  const onRecordUpdatedRef = useRef(onRecordUpdated);
  onRecordUpdatedRef.current = onRecordUpdated;
  const onTaskUpdatedRef = useRef(onTaskUpdated);
  onTaskUpdatedRef.current = onTaskUpdated;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  // Track target identity
  const currentTargetRef = useRef({ channelId, reelId });

  // Core fetch implementation with sequence and revision ordering guards
  const fetchRecord = useCallback(async (): Promise<void> => {
    const epoch = epochRef.current;
    const seq = ++fetchSeqRef.current;
    const { channelId: curChannelId, reelId: curReelId } = currentTargetRef.current;

    try {
      const response = await api.getShortReel(curChannelId, curReelId);

      // Check if target changed during fetch (epoch guard)
      if (epochRef.current !== epoch) {
        return;
      }

      // Check if a newer fetch already completed (network race guard)
      if (seq < highestCompletedSeqRef.current) {
        return;
      }
      highestCompletedSeqRef.current = seq;

      const remoteReel = response.short_reel;
      const remoteTask = response.task ?? null;

      // Discard out-of-order response with older revision
      if (remoteReel.revision < newestRevisionRef.current) {
        return;
      }
      newestRevisionRef.current = remoteReel.revision;

      // Check task freshness: do not let an older task overwrite an active newer task
      if (remoteTask) {
        activeTaskRef.current = remoteTask;
        activeTaskIdRef.current = remoteTask.task_id;
      }

      onRecordUpdatedRef.current(remoteReel, remoteTask);
    } catch (err) {
      if (epochRef.current !== epoch) return;
      if (seq < highestCompletedSeqRef.current) return;

      const error = err instanceof Error ? err : new Error("Failed to load Short-Reel");
      const isNotFound = err instanceof ApiError && err.status === 404;
      onErrorRef.current?.(error, isNotFound);
    }
  }, []);

  // Coalesce burst task notifications so rapid events do not spam GET requests
  const coalesceSync = useCallback(() => {
    if (burstTimerRef.current !== null) return;
    burstTimerRef.current = setTimeout(() => {
      burstTimerRef.current = null;
      void fetchRecord();
    }, BURST_COALESCE_DELAY_MS);
  }, [fetchRecord]);

  // Target transition effect: reset epochs, revisions, and cancel pending stale processing
  useEffect(() => {
    epochRef.current += 1;
    newestRevisionRef.current = 0;
    activeTaskRef.current = null;
    activeTaskIdRef.current = null;
    highestCompletedSeqRef.current = 0;
    currentTargetRef.current = { channelId, reelId };

    if (burstTimerRef.current !== null) {
      clearTimeout(burstTimerRef.current);
      burstTimerRef.current = null;
    }

    void fetchRecord();
  }, [channelId, reelId, fetchRecord]);

  // Real-time task progress subscription with deduplication and terminal reconciliation
  useEffect(() => {
    const unsubscribe = subscribeEvents((event) => {
      if (event.type !== "task.updated" || !event.task) return;
      const task = event.task;

      // Target filter: must match current channel and reel
      if (task.channel_id && task.channel_id !== currentTargetRef.current.channelId) return;
      if (task.reel_id !== currentTargetRef.current.reelId) return;

      // Guard: out-of-order events from an older task must not overwrite a newer active task
      if (
        activeTaskIdRef.current &&
        task.task_id !== activeTaskIdRef.current &&
        TERMINAL_TASK_STATUSES.includes(task.status) &&
        activeTaskRef.current &&
        ACTIVE_TASK_STATUSES.includes(activeTaskRef.current.status)
      ) {
        return;
      }

      activeTaskRef.current = task;
      activeTaskIdRef.current = task.task_id;
      onTaskUpdatedRef.current(task);

      // Advance read immediately when task completes a stage or reaches terminal state
      const isTerminal = TERMINAL_TASK_STATUSES.includes(task.status);
      const isRunning = task.status === "RUNNING";

      if (isTerminal) {
        // Immediate read on terminal state
        void fetchRecord();
      } else if (isRunning) {
        // Coalesce progress bursts
        coalesceSync();
      }
    });

    return () => {
      unsubscribe();
      if (burstTimerRef.current !== null) {
        clearTimeout(burstTimerRef.current);
        burstTimerRef.current = null;
      }
    };
  }, [fetchRecord, coalesceSync]);

  // Bounded fallback polling: every 3s only while task is active and document is visible
  useEffect(() => {
    const timer = setInterval(() => {
      const isVisible = typeof document === "undefined" || document.visibilityState === "visible";
      const task = activeTaskRef.current;
      const isTaskActive = Boolean(task && ACTIVE_TASK_STATUSES.includes(task.status));

      if (isVisible && isTaskActive) {
        void fetchRecord();
      }
    }, FALLBACK_POLL_INTERVAL_MS);

    return () => {
      clearInterval(timer);
    };
  }, [fetchRecord]);

  // Immediate visibility & network reconnect synchronization
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void fetchRecord();
      }
    };
    const onOnline = () => {
      void fetchRecord();
    };

    window.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("online", onOnline);

    return () => {
      window.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("online", onOnline);
    };
  }, [fetchRecord]);

  return {
    syncRecord: fetchRecord,
  };
}
