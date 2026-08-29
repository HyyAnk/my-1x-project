import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../../api";
import { verifyPreviewFonts } from "../../previewFonts/verifyPreviewFonts";
import type { StageViewMode } from "../types";
import { buildStagePreviewRequest, type StagePreviewRequestInput } from "../utils/stagePreviewRequest";

type UseStagePreviewInput = StagePreviewRequestInput & {
  isOpen: boolean;
  stageViewMode: StageViewMode;
};

export function useStagePreview(input: UseStagePreviewInput) {
  const [previewHtml, setPreviewHtml] = useState("");
  const [pendingPreviewHtml, setPendingPreviewHtml] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const [previewRevision, setPreviewRevision] = useState(0);
  const [iframeKey, setIframeKey] = useState(1);
  const requestRef = useRef(0);
  const request = useMemo(
    () => buildStagePreviewRequest(input),
    [
      input.activeMascot,
      input.activePose,
      input.aspectRatio,
      input.flipHorizontal,
      input.isPlaying,
      input.mascotPreviewTime,
      input.offsetX,
      input.offsetY,
      input.position,
      input.questionLayoutId,
      input.reactionStyle,
      input.scale,
      input.scenarioPhase,
      input.selectedMascotId,
      input.showInIntro,
      input.showInOutro,
      input.showInQuestion,
      input.targetChannel,
    ],
  );

  useEffect(() => {
    if (!input.isOpen || input.stageViewMode !== "video_stage") return;
    const requestId = ++requestRef.current;
    const timer = setTimeout(() => {
      setPreviewLoading(true);
      setPreviewError(false);
      setPendingPreviewHtml("");
      void api
        .previewSandboxComposition(request)
        .then((response) => {
          if (requestId === requestRef.current && response.html) setPendingPreviewHtml(response.html);
        })
        .catch(() => {
          if (requestId !== requestRef.current) return;
          setPreviewError(true);
          setPreviewLoading(false);
        });
    }, 100);

    return () => {
      requestRef.current += 1;
      clearTimeout(timer);
    };
  }, [input.isOpen, input.stageViewMode, previewRevision, request]);

  const retryPreview = useCallback(() => setPreviewRevision((revision) => revision + 1), []);
  const verifyPendingPreview = useCallback(
    async (frame: HTMLIFrameElement, html: string) => {
      try {
        await verifyPreviewFonts(frame);
        if (html !== pendingPreviewHtml) return;
        setPreviewHtml(html);
        setPendingPreviewHtml("");
        setIframeKey((key) => key + 1);
        setPreviewError(false);
      } catch {
        if (html !== pendingPreviewHtml) return;
        setPendingPreviewHtml("");
        setPreviewError(true);
      } finally {
        if (html === pendingPreviewHtml) setPreviewLoading(false);
      }
    },
    [pendingPreviewHtml],
  );

  return {
    previewHtml,
    pendingPreviewHtml,
    previewLoading,
    previewError,
    retryPreview,
    verifyPendingPreview,
    iframeKey,
    setIframeKey,
  };
}
