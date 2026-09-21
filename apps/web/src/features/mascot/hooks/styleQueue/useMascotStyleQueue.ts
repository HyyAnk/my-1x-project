import { useRef, useEffect, useMemo } from "react";
import { useBeforeUnloadWarning } from "../useBeforeUnloadWarning";
import { useMascotStyleQueueState } from "./useMascotStyleQueueState";
import { useMascotStyleQueuePolling } from "./useMascotStyleQueuePolling";
import { useMascotStyleQueueRecovery } from "./useMascotStyleQueueRecovery";
import { useMascotStyleQueueMutations } from "./useMascotStyleQueueMutations";
import type { UseMascotStyleQueueProps, UseMascotStyleQueueResult } from "./types";

export function useMascotStyleQueue({
  mascot,
  onMascotUpdated,
  onNotice,
  onActivityChange,
}: UseMascotStyleQueueProps): UseMascotStyleQueueResult {
  const state = useMascotStyleQueueState();

  const isBusy = Boolean(state.queueProgress && (state.activeStyleIds.length > 0 || state.queuedStyleIds.length > 0));
  useBeforeUnloadWarning(isBusy);

  const mascotRef = useRef(mascot);
  const onMascotUpdatedRef = useRef(onMascotUpdated);
  const onNoticeRef = useRef(onNotice);
  const onActivityChangeRef = useRef(onActivityChange ?? (() => undefined));

  useEffect(() => {
    mascotRef.current = mascot;
    onMascotUpdatedRef.current = onMascotUpdated;
    onNoticeRef.current = onNotice;
    onActivityChangeRef.current = onActivityChange ?? (() => undefined);
  }, [mascot, onActivityChange, onMascotUpdated, onNotice]);

  const refs = useMemo(
    () => ({
      isMountedRef: state.isMountedRef,
      mascotRef,
      onMascotUpdatedRef,
      onNoticeRef,
      onActivityChangeRef,
      activeBatchIdRef: state.activeBatchIdRef,
      lastCompletedCountRef: state.lastCompletedCountRef,
    }),
    [state.activeBatchIdRef, state.isMountedRef, state.lastCompletedCountRef],
  );

  const { startPolling, stopPolling, pollBatchStatus } = useMascotStyleQueuePolling({
    state,
    refs,
  });

  useMascotStyleQueueRecovery({
    mascot,
    state,
    refs,
    startPolling,
    stopPolling,
  });

  const { handleQueueStyle, handleStopStyleQueue, handleRetryFailedStyles } = useMascotStyleQueueMutations({
    state,
    refs,
    startPolling,
    pollBatchStatus,
  });

  return {
    activeBatch: state.activeBatch,
    queuedStyleIds: state.queuedStyleIds,
    activeStyleIds: state.activeStyleIds,
    styleQueueProgress: state.queueProgress,
    handleQueueStyle,
    handleStopStyleQueue,
    handleRetryFailedStyles,
  };
}
