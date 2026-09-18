import type { MascotProfile, MascotStyleBatchJob } from "@studio/shared";
import type { Notice } from "../../../../components/types";

export interface StyleQueueProgressState {
  total: number;
  completed: number;
  failed: number;
  activeStyleIds: string[];
  activeStyleNames: string[];
  statusMessage: string;
  isStopping: boolean;
  startTime: number;
}

export interface UseMascotStyleQueueProps {
  mascot: MascotProfile | null;
  onMascotUpdated: (mascot: MascotProfile) => void;
  onNotice: (notice: Notice) => void;
}

export interface MascotStyleQueueStateReturn {
  activeBatch: MascotStyleBatchJob | null;
  setActiveBatch: React.Dispatch<React.SetStateAction<MascotStyleBatchJob | null>>;
  queuedStyleIds: string[];
  setQueuedStyleIds: React.Dispatch<React.SetStateAction<string[]>>;
  activeStyleIds: string[];
  setActiveStyleIds: React.Dispatch<React.SetStateAction<string[]>>;
  queueProgress: StyleQueueProgressState | null;
  setQueueProgress: React.Dispatch<React.SetStateAction<StyleQueueProgressState | null>>;
  isMountedRef: React.MutableRefObject<boolean>;
  activeBatchIdRef: React.MutableRefObject<string | null>;
  lastCompletedCountRef: React.MutableRefObject<number>;
}

export interface StyleQueueRefs {
  isMountedRef: React.MutableRefObject<boolean>;
  mascotRef: React.MutableRefObject<MascotProfile | null>;
  onMascotUpdatedRef: React.MutableRefObject<(mascot: MascotProfile) => void>;
  onNoticeRef: React.MutableRefObject<(notice: Notice) => void>;
  activeBatchIdRef: React.MutableRefObject<string | null>;
  lastCompletedCountRef: React.MutableRefObject<number>;
}

export interface UseMascotStyleQueueResult {
  activeBatch: MascotStyleBatchJob | null;
  queuedStyleIds: string[];
  activeStyleIds: string[];
  styleQueueProgress: StyleQueueProgressState | null;
  handleQueueStyle: (styleId: string, prompt?: string) => Promise<void>;
  handleQueueAllMissingStyles: () => Promise<void>;
  handleStopStyleQueue: () => Promise<void>;
  handleRetryFailedStyles: () => Promise<void>;
}
