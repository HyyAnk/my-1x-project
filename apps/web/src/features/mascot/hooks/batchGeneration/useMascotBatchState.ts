import { useState, useRef, useEffect, useCallback } from "react";
import type { BatchProgressState } from "../../types/mascotBatch.types";
import type { MascotBatchStateReturn } from "./types";

/**
 * Manages local state and refs for mascot slot batch generation.
 */
export function useMascotBatchState(): MascotBatchStateReturn {
  const [busySlotKey, setBusySlotKey] = useState<string | null>(null);
  const [queuedSlotKeys, setQueuedSlotKeys] = useState<string[]>([]);
  const [batchProgress, setBatchProgress] = useState<BatchProgressState | null>(null);

  const isMountedRef = useRef(true);
  const activeBatchIdRef = useRef<string | null>(null);
  const lastCompletedCountRef = useRef(0);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const resetBatchState = useCallback(() => {
    setBusySlotKey(null);
    setQueuedSlotKeys([]);
    setBatchProgress(null);
  }, []);

  return {
    busySlotKey,
    setBusySlotKey,
    queuedSlotKeys,
    setQueuedSlotKeys,
    batchProgress,
    setBatchProgress,
    resetBatchState,
    activeBatchIdRef,
    lastCompletedCountRef,
    isMountedRef,
  };
}
