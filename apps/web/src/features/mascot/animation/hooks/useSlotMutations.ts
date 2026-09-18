import { useCallback, useEffect, useRef, useState } from "react";
import type { AnimationState } from "@studio/shared";
import {
  mascotAnimationApi,
  type UploadSlotVideoResponse,
  type ReplaceSlotVideoResponse,
  type RetrySlotAnimationResponse,
} from "../services/mascotAnimationApi";
import { fileToBase64, makeSlotKey, validateVideoFile } from "../utils/slotVideoHelpers";

export interface UseSlotMutationsProps {
  mascotId?: string | null;
  styleId?: string | null;
  onNotice?: (notice: { tone: "good" | "bad" | "neutral"; message: string }) => void;
  refreshSlots: () => Promise<void>;
  setError: (error: string | null) => void;
}

export interface UseSlotMutationsReturn {
  busySlots: Record<string, boolean>;
  isBusySlot: (state: AnimationState, slotIndex: number) => boolean;
  uploadVideo: (state: AnimationState, slotIndex: number, file: File) => Promise<UploadSlotVideoResponse | null>;
  retrySlot: (state: AnimationState, slotIndex: number) => Promise<RetrySlotAnimationResponse | null>;
  replaceVideo: (state: AnimationState, slotIndex: number, file: File) => Promise<ReplaceSlotVideoResponse | null>;
  cancelJob: (jobId: string) => Promise<void>;
  handleUploadVideo: (state: AnimationState, slotIndex: number, file: File) => Promise<UploadSlotVideoResponse | null>;
  handleRetrySlot: (state: AnimationState, slotIndex: number) => Promise<RetrySlotAnimationResponse | null>;
  handleReplaceVideo: (state: AnimationState, slotIndex: number, file: File) => Promise<ReplaceSlotVideoResponse | null>;
  handleCancelJob: (jobId: string) => Promise<void>;
}

export function useSlotMutations({ mascotId, styleId, onNotice, refreshSlots, setError }: UseSlotMutationsProps): UseSlotMutationsReturn {
  const [busySlots, setBusySlots] = useState<Record<string, boolean>>({});
  const isMountedRef = useRef<boolean>(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const runSlotAction = useCallback(
    async <T>(
      state: AnimationState,
      slotIndex: number,
      action: () => Promise<T>,
      successNotice: string | ((result: T) => string),
      errorFallback: string,
    ): Promise<T | null> => {
      const key = makeSlotKey(state, slotIndex);
      try {
        setBusySlots((prev) => ({ ...prev, [key]: true }));
        setError(null);

        const result = await action();
        if (onNotice) {
          const message = typeof successNotice === "function" ? successNotice(result) : successNotice;
          onNotice({ tone: "neutral", message });
        }

        await refreshSlots();
        return result;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : errorFallback;
        if (onNotice) {
          onNotice({ tone: "bad", message: msg });
        }
        setError(msg);
        return null;
      } finally {
        if (isMountedRef.current) {
          setBusySlots((prev) => ({ ...prev, [key]: false }));
        }
      }
    },
    [onNotice, refreshSlots, setError],
  );

  const uploadVideo = useCallback(
    async (state: AnimationState, slotIndex: number, file: File): Promise<UploadSlotVideoResponse | null> => {
      if (!mascotId || !styleId) return null;
      return runSlotAction(
        state,
        slotIndex,
        async () => {
          validateVideoFile(file);
          const dataUrl = await fileToBase64(file);
          return mascotAnimationApi.uploadSlotVideo({
            mascotId,
            styleId,
            state,
            slot: slotIndex,
            data: dataUrl,
            filename: file.name,
            mime_type: file.type || "video/mp4",
          });
        },
        `Uploaded video for ${state} slot ${slotIndex}. Processing started.`,
        "Failed to upload video",
      );
    },
    [mascotId, styleId, runSlotAction],
  );

  const retrySlot = useCallback(
    async (state: AnimationState, slotIndex: number): Promise<RetrySlotAnimationResponse | null> => {
      if (!mascotId || !styleId) return null;
      return runSlotAction(
        state,
        slotIndex,
        () => mascotAnimationApi.retrySlotAnimation({ mascotId, styleId, state, slot: slotIndex }),
        (res) => `Retrying processing for ${state} slot ${slotIndex} (Attempt #${res.attempt}).`,
        "Failed to retry slot animation",
      );
    },
    [mascotId, styleId, runSlotAction],
  );

  const replaceVideo = useCallback(
    async (state: AnimationState, slotIndex: number, file: File): Promise<ReplaceSlotVideoResponse | null> => {
      if (!mascotId || !styleId) return null;
      return runSlotAction(
        state,
        slotIndex,
        async () => {
          validateVideoFile(file);
          const dataUrl = await fileToBase64(file);
          return mascotAnimationApi.replaceSlotVideo({
            mascotId,
            styleId,
            state,
            slot: slotIndex,
            data: dataUrl,
            filename: file.name,
            mime_type: file.type || "video/mp4",
          });
        },
        `Replacement staged for ${state} slot ${slotIndex}. Current revision preserved until processing finishes.`,
        "Failed to replace slot video",
      );
    },
    [mascotId, styleId, runSlotAction],
  );

  const cancelJob = useCallback(
    async (jobId: string): Promise<void> => {
      if (!mascotId) return;
      try {
        await mascotAnimationApi.cancelProcessingJob(mascotId, jobId, "User cancelled processing");
        if (onNotice) {
          onNotice({ tone: "neutral", message: "Processing job cancelled." });
        }
        await refreshSlots();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to cancel processing job";
        if (onNotice) {
          onNotice({ tone: "bad", message: msg });
        }
        setError(msg);
      }
    },
    [mascotId, onNotice, refreshSlots, setError],
  );

  const isBusySlot = useCallback(
    (state: AnimationState, slotIndex: number): boolean => Boolean(busySlots[makeSlotKey(state, slotIndex)]),
    [busySlots],
  );

  return {
    busySlots,
    isBusySlot,
    uploadVideo,
    retrySlot,
    replaceVideo,
    cancelJob,
    handleUploadVideo: uploadVideo,
    handleRetrySlot: retrySlot,
    handleReplaceVideo: replaceVideo,
    handleCancelJob: cancelJob,
  };
}
