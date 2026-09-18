import { useRef, useEffect } from "react";
import { useBeforeUnloadWarning } from "../useBeforeUnloadWarning";
import { useMascotStyleQueueState } from "./useMascotStyleQueueState";
import { useMascotStyleQueuePolling } from "./useMascotStyleQueuePolling";
import { useMascotStyleQueueRecovery } from "./useMascotStyleQueueRecovery";
import { useMascotStyleQueueMutations } from "./useMascotStyleQueueMutations";
import type { UseMascotStyleQueueProps, UseMascotStyleQueueResult } from "./types";

export function useMascotStyleQueue({ mascot, onMascotUpdated, onNotice }: UseMascotStyleQueueProps): UseMascotStyleQueueResult {
  const state = useMascotStyleQueueState();

  const isBusy = Boolean(state.queueProgress && (state.activeStyleIds.length > 0 || state.queuedStyleIds.length > 0));
  useBeforeUnloadWarning(isBusy);

  const mascotRef = useRef(mascot);
  const onMascotUpdatedRef = useRef(onMascotUpdated);
  const onNoticeRef = useRef(onNotice);

  useEffect(() => {
    mascotRef.current = mascot;
    onMascotUpdatedRef.current = onMascotUpdated;
    onNoticeRef.current = onNotice;
  }, [mascot, onMascotUpdated, onNotice]);

  const refs = {
    isMountedRef: state.isMountedRef,
    mascotRef,
    onMascotUpdatedRef,
    onNoticeRef,
    activeBatchIdRef: state.activeBatchIdRef,
    lastCompletedCountRef: state.lastCompletedCountRef,
  };

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

  const { handleQueueStyle, handleQueueAllMissingStyles, handleStopStyleQueue, handleRetryFailedStyles } = useMascotStyleQueueMutations({
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
    handleQueueAllMissingStyles,
    handleStopStyleQueue,
    handleRetryFailedStyles,
  };
}
