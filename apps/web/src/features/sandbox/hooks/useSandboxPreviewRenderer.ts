import { useCallback, useEffect, useRef, useState } from "react";
import type { SandboxPreviewRequest } from "@studio/shared";
import { api } from "../../../api";
import type { Notice } from "../../../components/types";
import { useTranslation } from "../../../i18n";
import type { SandboxDesignState } from "./useSandboxDesignState";
import type { SandboxMascotState } from "./useSandboxMascotState";
import type { SandboxQuestionState } from "./useSandboxQuestionState";
import type { SandboxTimelineState } from "./useSandboxTimelineState";
import { verifyPreviewFonts } from "../../previewFonts/verifyPreviewFonts";

type UseSandboxPreviewRendererInput = {
  design: SandboxDesignState;
  mascot: SandboxMascotState;
  question: SandboxQuestionState;
  timeline: SandboxTimelineState;
  aspectRatio: "16:9" | "9:16";
  onNotice?: (notice: NonNullable<Notice>) => void;
};

export type ContrastReport = { ok: boolean; ratio?: number; message?: string } | null;

type PendingPreview = {
  html: string;
  contrastReport: ContrastReport;
  manualNotice: boolean;
  requestId: number;
};

export function useSandboxPreviewRenderer({ design, mascot, question, timeline, aspectRatio, onNotice }: UseSandboxPreviewRendererInput) {
  const { t } = useTranslation();
  const [previewHtml, setPreviewHtml] = useState("");
  const [pendingPreview, setPendingPreview] = useState<PendingPreview | null>(null);
  const [contrastReport, setContrastReport] = useState<ContrastReport>(null);
  const [loading, setLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [lastRenderTime, setLastRenderTime] = useState(() => new Date().toLocaleTimeString());
  const [iframeKey, setIframeKey] = useState(1);
  const latestRequestId = useRef(0);

  const renderPreview = useCallback(
    async (manualNotice = false) => {
      const requestId = ++latestRequestId.current;
      setLoading(true);
      setPreviewError(null);
      try {
        const input: SandboxPreviewRequest = {
          aspect_ratio: aspectRatio,
          theme: design.theme,
          palette_id: design.paletteId,
          layout_id: design.layoutId,
          thinking_bar_style: design.thinkingBarStyle,
          question_box_style: design.questionBoxStyle,
          answer_card_style: design.answerCardStyle,
          counter_style: design.counterStyle,
          phase: timeline.phase,
          timeline_time_seconds: timeline.useScrubber ? timeline.timelineSeconds : undefined,
          question_text: question.questionText,
          choices: question.choices,
          correct_choice_index: question.correctChoiceIndex,
          question_number: question.questionNumber,
          total_questions: question.totalQuestions,
          countdown_progress: Math.max(0, Math.min(1, (timeline.timelineSeconds - 2.5) / 5)),
          fact_card_title: question.factCardTitle,
          fact_card_text: question.factCardText,
          mascot_id: mascot.mascotId === "none" ? null : mascot.mascotId,
          mascot_enabled: mascot.mascotEnabled && mascot.mascotId !== "none",
          mascot_action: mascot.mascotAction,
          mascot_position: mascot.mascotPosition,
          mascot_scale: mascot.mascotScale,
          mascot_offset_x: mascot.mascotOffsetX,
          mascot_offset_y: mascot.mascotOffsetY,
          mascot_flip_x: mascot.mascotFlipX,
          mascot_timeline_time_seconds: timeline.useScrubber ? timeline.timelineSeconds : undefined,
          mascot_playing: timeline.isPlaying,
        };

        const response = await api.previewSandboxComposition(input);
        if (requestId !== latestRequestId.current) return;
        setPendingPreview({ html: response.html, contrastReport: response.contrast_report, manualNotice, requestId });
      } catch (error) {
        if (requestId !== latestRequestId.current) return;
        const message = error instanceof Error ? error.message : "Failed to compile preview composition";
        setPreviewError(message);
        if (onNotice) {
          onNotice({ tone: "bad", message });
        }
        setLoading(false);
      }
    },
    [
      design.theme,
      design.paletteId,
      design.layoutId,
      design.thinkingBarStyle,
      design.questionBoxStyle,
      design.answerCardStyle,
      design.counterStyle,
      timeline.phase,
      timeline.useScrubber,
      timeline.timelineSeconds,
      question.questionText,
      question.choices,
      question.correctChoiceIndex,
      question.questionNumber,
      question.totalQuestions,
      question.factCardTitle,
      question.factCardText,
      mascot.mascotId,
      mascot.mascotEnabled,
      mascot.mascotAction,
      mascot.mascotPosition,
      mascot.mascotScale,
      mascot.mascotOffsetX,
      mascot.mascotOffsetY,
      mascot.mascotFlipX,
      timeline.isPlaying,
      aspectRatio,
      onNotice,
      t,
    ],
  );

  const verifyPendingPreview = useCallback(
    async (frame: HTMLIFrameElement, html: string) => {
      try {
        await verifyPreviewFonts(frame);
        if (!pendingPreview || pendingPreview.html !== html || pendingPreview.requestId !== latestRequestId.current) return;
        const renderedAt = new Date().toLocaleTimeString();
        setPreviewHtml(pendingPreview.html);
        setContrastReport(pendingPreview.contrastReport);
        setLastRenderTime(renderedAt);
        setPendingPreview(null);
        setIframeKey((key) => key + 1);
        setPreviewError(null);
        setLoading(false);
        if (pendingPreview.manualNotice && onNotice) {
          onNotice({ tone: "good", message: t("visualSandbox.noticeRerendered", { time: renderedAt }) });
        }
      } catch (error) {
        if (!pendingPreview || pendingPreview.html !== html) return;
        const message = error instanceof Error ? error.message : t("visualSandbox.fontLoadFailed");
        setPendingPreview(null);
        setPreviewError(message);
        setLoading(false);
        onNotice?.({ tone: "bad", message });
      }
    },
    [onNotice, pendingPreview, t],
  );

  useEffect(() => {
    const timer = setTimeout(() => void renderPreview(), 150);
    return () => clearTimeout(timer);
  }, [renderPreview]);

  return {
    previewHtml,
    pendingPreviewHtml: pendingPreview?.html ?? "",
    contrastReport,
    loading,
    previewError,
    lastRenderTime,
    iframeKey,
    setIframeKey,
    renderPreview,
    verifyPendingPreview,
  };
}

export type SandboxPreviewRenderer = ReturnType<typeof useSandboxPreviewRenderer>;
