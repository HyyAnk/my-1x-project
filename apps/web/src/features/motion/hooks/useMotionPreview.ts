import { useCallback, useState } from "react";
import type { MascotRenderAspectRatio, MotionTemplateId, MotionTemplateOptions } from "@studio/shared";
import { api } from "../../../api";
import type { MotionPreviewState } from "../types/motionUi.types";

export interface UseMotionPreviewResult {
  previewState: MotionPreviewState;
  fetchPreview: (
    templateId: string,
    options?: MotionTemplateOptions,
    aspectRatio?: MascotRenderAspectRatio,
  ) => Promise<void>;
  setAspectRatio: (ratio: MascotRenderAspectRatio) => void;
  replay: () => void;
  clearPreview: () => void;
}

export function useMotionPreview(
  initialAspectRatio: MascotRenderAspectRatio = "16:9",
): UseMotionPreviewResult {
  const [previewState, setPreviewState] = useState<MotionPreviewState>({
    isLoading: false,
    htmlMarkup: null,
    error: null,
    aspectRatio: initialAspectRatio,
    replayKey: 0,
  });

  const fetchPreview = useCallback(
    async (
      templateId: string,
      options?: MotionTemplateOptions,
      aspectRatio?: MascotRenderAspectRatio,
    ) => {
      const activeRatio = aspectRatio ?? previewState.aspectRatio;
      setPreviewState((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
        aspectRatio: activeRatio,
      }));

      try {
        const response = await api.previewMotionMarkup({
          templateId: templateId as MotionTemplateId,
          aspectRatio: activeRatio,
          options,
        });

        setPreviewState((prev) => ({
          ...prev,
          isLoading: false,
          htmlMarkup: response.html,
          replayKey: prev.replayKey + 1,
        }));
      } catch (err) {

        const message = err instanceof Error ? err.message : "Failed to generate preview markup";
        setPreviewState((prev) => ({
          ...prev,
          isLoading: false,
          error: message,
        }));
      }
    },
    [previewState.aspectRatio],
  );

  const setAspectRatio = useCallback((ratio: MascotRenderAspectRatio) => {
    setPreviewState((prev) => ({
      ...prev,
      aspectRatio: ratio,
    }));
  }, []);

  const replay = useCallback(() => {
    setPreviewState((prev) => ({
      ...prev,
      replayKey: prev.replayKey + 1,
    }));
  }, []);

  const clearPreview = useCallback(() => {
    setPreviewState((prev) => ({
      ...prev,
      htmlMarkup: null,
      error: null,
      isLoading: false,
    }));
  }, []);

  return {
    previewState,
    fetchPreview,
    setAspectRatio,
    replay,
    clearPreview,
  };
}
