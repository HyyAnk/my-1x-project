import type { AnimationState, MascotSlotProjection, MascotVideoProcessingJob } from "@studio/shared";
import type { UploadSlotVideoResponse, ReplaceSlotVideoResponse, RetrySlotAnimationResponse } from "../services/mascotAnimationApi";
import { useSlotPolling } from "./useSlotPolling";
import { useSlotMutations } from "./useSlotMutations";

export interface UseMascotAnimationProcessingProps {
  mascotId?: string | null;
  styleId?: string | null;
  onNotice?: (notice: { tone: "good" | "bad" | "neutral"; message: string }) => void;
}

export interface UseMascotAnimationProcessingReturn {
  slots: {
    thinking: MascotSlotProjection[];
    celebrate: MascotSlotProjection[];
  };
  activeJobs: Record<string, MascotVideoProcessingJob>;
  isLoading: boolean;
  isBusySlot: (state: AnimationState, slotIndex: number) => boolean;
  error: string | null;
  uploadVideo: (state: AnimationState, slotIndex: number, file: File) => Promise<UploadSlotVideoResponse | null>;
  retrySlot: (state: AnimationState, slotIndex: number) => Promise<RetrySlotAnimationResponse | null>;
  replaceVideo: (state: AnimationState, slotIndex: number, file: File) => Promise<ReplaceSlotVideoResponse | null>;
  cancelJob: (jobId: string) => Promise<void>;
  refreshSlots: () => Promise<void>;
}

export function useMascotAnimationProcessing({
  mascotId,
  styleId,
  onNotice,
}: UseMascotAnimationProcessingProps): UseMascotAnimationProcessingReturn {
  const { slots, activeJobs, isLoading, error, setError, refreshSlots } = useSlotPolling({
    mascotId,
    styleId,
  });

  const { isBusySlot, uploadVideo, retrySlot, replaceVideo, cancelJob } = useSlotMutations({
    mascotId,
    styleId,
    onNotice,
    refreshSlots,
    setError,
  });

  return {
    slots,
    activeJobs,
    isLoading,
    isBusySlot,
    error,
    uploadVideo,
    retrySlot,
    replaceVideo,
    cancelJob,
    refreshSlots,
  };
}
