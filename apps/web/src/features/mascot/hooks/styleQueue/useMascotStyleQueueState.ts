import { useState, useRef, useEffect } from "react";
import type { MascotStyleBatchJob } from "@studio/shared";
import type { MascotStyleQueueStateReturn, StyleQueueProgressState } from "./types";

export function useMascotStyleQueueState(): MascotStyleQueueStateReturn {
  const [activeBatch, setActiveBatch] = useState<MascotStyleBatchJob | null>(null);
  const [queuedStyleIds, setQueuedStyleIds] = useState<string[]>([]);
  const [activeStyleIds, setActiveStyleIds] = useState<string[]>([]);
  const [queueProgress, setQueueProgress] = useState<StyleQueueProgressState | null>(null);

  const isMountedRef = useRef(true);
  const activeBatchIdRef = useRef<string | null>(null);
  const lastCompletedCountRef = useRef<number>(0);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    activeBatch,
    setActiveBatch,
    queuedStyleIds,
    setQueuedStyleIds,
    activeStyleIds,
    setActiveStyleIds,
    queueProgress,
    setQueueProgress,
    isMountedRef,
    activeBatchIdRef,
    lastCompletedCountRef,
  };
}
