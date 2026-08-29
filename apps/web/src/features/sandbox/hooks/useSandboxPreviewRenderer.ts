import { useCallback, useEffect, useState } from "react";
import type { SandboxPreviewInput } from "@studio/shared";
import { api } from "../../../api";
import type { Notice } from "../../../components/types";
import { useTranslation } from "../../../i18n";
import type { SandboxDesignState } from "./useSandboxDesignState";
import type { SandboxMascotState } from "./useSandboxMascotState";
import type { SandboxQuestionState } from "./useSandboxQuestionState";
import type { SandboxTimelineState } from "./useSandboxTimelineState";

type UseSandboxPreviewRendererInput = {
  design: SandboxDesignState;
  mascot: SandboxMascotState;
  question: SandboxQuestionState;
  timeline: SandboxTimelineState;
  onNotice?: (notice: NonNullable<Notice>) => void;
};

export type ContrastReport = { ok: boolean; ratio?: number; message?: string } | null;

export function useSandboxPreviewRenderer({ design, mascot, question, timeline, onNotice }: UseSandboxPreviewRendererInput) {
  const { t } = useTranslation();
  const [previewHtml, setPreviewHtml] = useState("");
  const [contrastReport, setContrastReport] = useState<ContrastReport>(null);
  const [loading, setLoading] = useState(false);
  const [lastRenderTime, setLastRenderTime] = useState(() => new Date().toLocaleTimeString());
  const [iframeKey, setIframeKey] = useState(1);

  const renderPreview = useCallback(
    async (manualNotice = false) => {
      setLoading(true);
      try {
        const input: SandboxPreviewInput = {
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
        };

        const response = await api.previewSandboxComposition(input);
        setPreviewHtml(response.html);
        setContrastReport(response.contrast_report);
        const renderedAt = new Date().toLocaleTimeString();
        setLastRenderTime(renderedAt);
        setIframeKey((key) => key + 1);
        if (manualNotice && onNotice) {
          onNotice({ tone: "good", message: t("visualSandbox.noticeRerendered", { time: renderedAt }) });
        }
      } catch (error) {
        if (onNotice) {
          onNotice({
            tone: "bad",
            message: error instanceof Error ? error.message : "Failed to compile preview composition",
          });
        }
      } finally {
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
      onNotice,
      t,
    ],
  );

  useEffect(() => {
    const timer = setTimeout(() => void renderPreview(), 150);
    return () => clearTimeout(timer);
  }, [renderPreview]);

  return { previewHtml, contrastReport, loading, lastRenderTime, iframeKey, setIframeKey, renderPreview };
}

export type SandboxPreviewRenderer = ReturnType<typeof useSandboxPreviewRenderer>;
