import { useCallback, useEffect, useRef, useState } from "react";
import { quizApi } from "../../../api/quizApi";
import type {
  QuestionImageItem,
  QuestionImagesOverviewResponse,
  UseQuestionImagesProps,
  UseQuestionImagesReturn,
} from "../types/questionImages.types";
import {
  createOptimisticItem,
  fileToBase64,
  validateImageFile,
} from "../utils/questionImageHelpers";

function recalculateCounts(items: QuestionImageItem[]) {
  const ready_count = items.filter((q) => q.status !== "missing" && q.status !== "generating").length;
  const uploaded_count = items.filter((q) => q.status === "user_uploaded").length;
  const missing_count = items.filter((q) => q.status === "missing").length;
  return { ready_count, uploaded_count, missing_count };
}

export function useQuestionImages({
  channelId,
  episodeId,
  hasQuiz = true,
  onNotice,
  onUpdated,
}: UseQuestionImagesProps): UseQuestionImagesReturn {
  const [overview, setOverview] = useState<QuestionImagesOverviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<Record<number, boolean>>({});
  const [uploadingSlots, setUploadingSlots] = useState<Record<string, boolean>>({});
  const [generating, setGenerating] = useState<Record<number, boolean>>({});
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [versionBuster, setVersionBuster] = useState<Record<number, number>>({});
  const [globalRefreshKey, setGlobalRefreshKey] = useState<number>(0);

  const previewUrlsRef = useRef<Record<string, string>>({});
  previewUrlsRef.current = previewUrls;

  useEffect(() => {
    return () => {
      Object.values(previewUrlsRef.current).forEach((url) => {
        if (url.startsWith("blob:")) URL.revokeObjectURL(url);
      });
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!channelId || !episodeId || !hasQuiz) return;
    setLoading(true);
    setError(null);
    try {
      const data = await quizApi.getQuestionImages(channelId, episodeId);
      setOverview(data);
      setGlobalRefreshKey(Date.now());
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load question images";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [channelId, episodeId, hasQuiz]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const clearPreview = useCallback((questionNumber: number, slotId?: string) => {
    const key = slotId ? `${questionNumber}:${slotId}` : String(questionNumber);
    setPreviewUrls((prev) => {
      const url = prev[key];
      if (url && url.startsWith("blob:")) URL.revokeObjectURL(url);
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const uploadImage = useCallback(
    async (questionNumber: number, file: File, slotId?: string): Promise<boolean> => {
      const validation = validateImageFile(file);
      if (!validation.valid) {
        onNotice?.({ tone: "bad", message: validation.error ?? "Invalid image file" });
        return false;
      }

      const optimisticBlobUrl = URL.createObjectURL(file);
      const previewKey = slotId ? `${questionNumber}:${slotId}` : String(questionNumber);
      setPreviewUrls((prev) => ({ ...prev, [previewKey]: optimisticBlobUrl }));

      setOverview((prev) => {
        if (!prev) return prev;
        const items = prev.items.map((q) => {
          if (q.question_number !== questionNumber) return q;
          if (slotId && q.slots) {
            const updatedSlots = q.slots.map((s) =>
              s.slot_id === slotId
                ? {
                    ...s,
                    status: "user_uploaded" as const,
                    source: "explicit_episode" as const,
                    user_selected: true,
                    image_url: optimisticBlobUrl,
                    filename: file.name,
                  }
                : s,
            );
            return {
              ...q,
              slots: updatedSlots,
              status: "user_uploaded" as const,
              user_selected: true,
            };
          }
          return createOptimisticItem(q, file.name);
        });
        return { ...prev, items, ...recalculateCounts(items) };
      });

      if (slotId) {
        setUploadingSlots((prev) => ({ ...prev, [previewKey]: true }));
      } else {
        setUploading((prev) => ({ ...prev, [questionNumber]: true }));
      }

      try {
        const base64Data = await fileToBase64(file);
        const res = slotId
          ? await quizApi.uploadQuestionImage(channelId, episodeId, questionNumber, base64Data, file.name, slotId)
          : await quizApi.uploadQuestionImage(channelId, episodeId, questionNumber, base64Data, file.name);

        setOverview((prev) => {
          if (!prev) return prev;
          const items = prev.items.map((q) => (q.question_number === questionNumber ? res.item : q));
          return { ...prev, items, ...recalculateCounts(items) };
        });

        setVersionBuster((prev) => ({ ...prev, [questionNumber]: Date.now() }));
        await onUpdated?.();
        const slotLabel = slotId ? ` (${slotId})` : "";
        onNotice?.({ tone: "good", message: `Question #${questionNumber}${slotLabel} image uploaded successfully` });
        return true;
      } catch (err) {
        clearPreview(questionNumber, slotId);
        void refresh();
        const msg = err instanceof Error ? err.message : "Failed to upload question image";
        onNotice?.({ tone: "bad", message: msg });
        return false;
      } finally {
        if (slotId) {
          setUploadingSlots((prev) => ({ ...prev, [previewKey]: false }));
        } else {
          setUploading((prev) => ({ ...prev, [questionNumber]: false }));
        }
      }
    },
    [channelId, clearPreview, episodeId, onNotice, onUpdated, refresh],
  );

  const resetImage = useCallback(
    async (questionNumber: number, slotId?: string): Promise<boolean> => {
      const previewKey = slotId ? `${questionNumber}:${slotId}` : String(questionNumber);
      if (slotId) {
        setUploadingSlots((prev) => ({ ...prev, [previewKey]: true }));
      } else {
        setUploading((prev) => ({ ...prev, [questionNumber]: true }));
      }

      try {
        const res = slotId
          ? await quizApi.deleteCustomQuestionImage(channelId, episodeId, questionNumber, slotId)
          : await quizApi.deleteCustomQuestionImage(channelId, episodeId, questionNumber);
        clearPreview(questionNumber, slotId);
        setOverview((prev) => {
          if (!prev) return prev;
          const items = prev.items.map((q) => (q.question_number === questionNumber ? res.item : q));
          return { ...prev, items, ...recalculateCounts(items) };
        });
        setVersionBuster((prev) => ({ ...prev, [questionNumber]: Date.now() }));
        await onUpdated?.();
        const slotLabel = slotId ? ` (${slotId})` : "";
        onNotice?.({ tone: "good", message: `Question #${questionNumber}${slotLabel} custom image removed` });
        return true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to remove custom image";
        onNotice?.({ tone: "bad", message: msg });
        return false;
      } finally {
        if (slotId) {
          setUploadingSlots((prev) => ({ ...prev, [previewKey]: false }));
        } else {
          setUploading((prev) => ({ ...prev, [questionNumber]: false }));
        }
      }
    },
    [channelId, clearPreview, episodeId, onNotice, onUpdated],
  );

  const generateImage = useCallback(
    async (questionNumber: number, promptOverride?: string): Promise<boolean> => {
      setGenerating((prev) => ({ ...prev, [questionNumber]: true }));
      try {
        await quizApi.generateQuestionImage(channelId, episodeId, questionNumber, promptOverride);
        onNotice?.({ tone: "good", message: `Generation task queued for Question #${questionNumber}` });
        return true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to trigger image generation";
        onNotice?.({ tone: "bad", message: msg });
        return false;
      } finally {
        setGenerating((prev) => ({ ...prev, [questionNumber]: false }));
      }
    },
    [channelId, episodeId, onNotice],
  );

  const getImageUrl = useCallback(
    (questionNumber: number, slotId?: string): string => {
      const key = slotId ? `${questionNumber}:${slotId}` : String(questionNumber);
      if (previewUrls[key]) return previewUrls[key];
      const version = versionBuster[questionNumber] || (globalRefreshKey > 0 ? globalRefreshKey : undefined);
      return quizApi.getQuestionImageUrl(channelId, episodeId, questionNumber, version, slotId);
    },
    [channelId, episodeId, globalRefreshKey, previewUrls, versionBuster],
  );

  return {
    overview,
    loading,
    error,
    uploading,
    uploadingSlots,
    generating,
    previewUrls,
    versionBuster,
    refresh,
    uploadImage,
    resetImage,
    generateImage,
    clearPreview,
    getImageUrl,
  };
}
