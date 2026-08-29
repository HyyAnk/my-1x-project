import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Channel, Episode, QuizVisualTheme } from "@studio/shared";
import { api } from "../../../api";
import { verifyPreviewFonts } from "../../previewFonts/verifyPreviewFonts";
import {
  resolveAnswerCardStyle,
  resolveCounterStyle,
  resolvePaletteId,
  resolveQuestionBoxStyle,
  resolveThinkingBarStyle,
  resolveVisualTheme,
  type ResolvedAnswerCardStyle,
  type ResolvedCounterStyle,
  type ResolvedQuestionBoxStyle,
  type ResolvedThinkingBarStyle,
} from "../utils/quizStyleResolution";

export type EpisodeStyleOverride = {
  theme?: QuizVisualTheme;
  paletteId?: string;
  thinkingBarStyle?: ResolvedThinkingBarStyle;
  questionBoxStyle?: ResolvedQuestionBoxStyle;
  answerCardStyle?: ResolvedAnswerCardStyle;
  counterStyle?: ResolvedCounterStyle;
  totalQuestions?: number;
};

export type EpisodePreviewCandidate = {
  override: EpisodeStyleOverride;
  label: string;
};

type UseEpisodeStylePreviewProps = {
  channel: Channel;
  episode: Episode | null;
  candidate: EpisodePreviewCandidate | null;
};

type PendingPreview = { html: string; requestId: number };

const RENDER_DEBOUNCE_MS = 150;

export function useEpisodeStylePreview({ channel, episode, candidate }: UseEpisodeStylePreviewProps) {
  const [previewHtml, setPreviewHtml] = useState("");
  const [pendingPreview, setPendingPreview] = useState<PendingPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [iframeKey, setIframeKey] = useState(1);
  const latestRequestId = useRef(0);

  const resolved = useMemo(() => {
    const quizConfig = episode?.quiz_config;
    return {
      theme: resolveVisualTheme(quizConfig),
      paletteId: resolvePaletteId(channel, quizConfig),
      thinkingBarStyle: resolveThinkingBarStyle(channel, quizConfig),
      questionBoxStyle: resolveQuestionBoxStyle(channel, quizConfig),
      answerCardStyle: resolveAnswerCardStyle(channel, quizConfig),
      counterStyle: resolveCounterStyle(channel, quizConfig),
      totalQuestions: quizConfig?.question_count ?? 8,
    };
  }, [channel, episode]);

  const renderPreview = useCallback(async () => {
    const requestId = ++latestRequestId.current;
    const override = candidate?.override ?? {};
    setLoading(true);
    setPreviewError(null);
    try {
      const response = await api.previewSandboxComposition({
        theme: override.theme ?? resolved.theme,
        palette_id: override.paletteId ?? resolved.paletteId,
        thinking_bar_style: override.thinkingBarStyle ?? resolved.thinkingBarStyle,
        question_box_style: override.questionBoxStyle ?? resolved.questionBoxStyle,
        answer_card_style: override.answerCardStyle ?? resolved.answerCardStyle,
        counter_style: override.counterStyle ?? resolved.counterStyle,
        phase: "choices",
        question_number: 1,
        total_questions: override.totalQuestions ?? resolved.totalQuestions,
        mascot_enabled: false,
      });
      if (requestId !== latestRequestId.current) return;
      setPendingPreview({ html: response.html, requestId });
    } catch (error) {
      if (requestId !== latestRequestId.current) return;
      setPreviewError(error instanceof Error ? error.message : "Failed to render preview");
      setLoading(false);
    }
  }, [candidate, resolved]);

  const commitPendingPreview = useCallback(
    async (frame: HTMLIFrameElement, html: string) => {
      try {
        await verifyPreviewFonts(frame);
        if (!pendingPreview || pendingPreview.html !== html || pendingPreview.requestId !== latestRequestId.current) return;
        setPreviewHtml(pendingPreview.html);
        setPendingPreview(null);
        setIframeKey((key) => key + 1);
        setPreviewError(null);
        setLoading(false);
      } catch {
        if (!pendingPreview || pendingPreview.html !== html) return;
        setPendingPreview(null);
        setLoading(false);
        setPreviewHtml(html);
        setIframeKey((key) => key + 1);
      }
    },
    [pendingPreview],
  );

  const retryPreview = useCallback(() => {
    void renderPreview();
  }, [renderPreview]);

  useEffect(() => {
    const timer = setTimeout(() => void renderPreview(), RENDER_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [renderPreview]);

  return {
    previewHtml,
    pendingPreviewHtml: pendingPreview?.html ?? "",
    loading,
    previewError,
    iframeKey,
    commitPendingPreview,
    retryPreview,
  };
}
