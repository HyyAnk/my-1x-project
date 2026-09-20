import type React from "react";
import type { MascotProfile, MascotStyle } from "@studio/shared";
import type { Notice } from "../../../../components/types";
import type { BatchProgressState } from "../../types/mascotBatch.types";

export interface BatchStateRefs {
  isMountedRef: React.MutableRefObject<boolean>;
  mascotRef: React.MutableRefObject<MascotProfile | null>;
  activeStyleIdRef: React.MutableRefObject<string>;
  trackedStyleIdRef: React.MutableRefObject<string | null>;
  onMascotUpdatedRef: React.MutableRefObject<(mascot: MascotProfile) => void>;
  onNoticeRef: React.MutableRefObject<(notice: Notice) => void>;
  onActivityChangeRef: React.MutableRefObject<() => void>;
  onActiveStyleRecoveredRef: React.MutableRefObject<(styleId: string) => void>;
  activeBatchIdRef: React.MutableRefObject<string | null>;
  lastCompletedCountRef: React.MutableRefObject<number>;
}

export interface MascotBatchStateReturn {
  busySlotKey: string | null;
  setBusySlotKey: React.Dispatch<React.SetStateAction<string | null>>;
  queuedSlotKeys: string[];
  setQueuedSlotKeys: React.Dispatch<React.SetStateAction<string[]>>;
  batchProgress: BatchProgressState | null;
  setBatchProgress: React.Dispatch<React.SetStateAction<BatchProgressState | null>>;
  resetBatchState: () => void;
  activeBatchIdRef: React.MutableRefObject<string | null>;
  lastCompletedCountRef: React.MutableRefObject<number>;
  isMountedRef: React.MutableRefObject<boolean>;
}

export interface UseMascotBatchPollingProps {
  mascot: MascotProfile | null;
  activeStyle: MascotStyle | null;
  activeStyleId: string;
  state: MascotBatchStateReturn;
  refs: BatchStateRefs;
}

export interface UseMascotBatchMutationsProps {
  state: MascotBatchStateReturn;
  refs: BatchStateRefs;
  startPolling: () => void;
  pollBatchStatus: (isInitialMount?: boolean) => Promise<void>;
}
