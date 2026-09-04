import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Channel, Episode } from "@studio/shared";
import { api } from "../../../api";
import { verifyPreviewFonts } from "../../previewFonts/verifyPreviewFonts";
import { buildEpisodePreviewRequest } from "../services/buildEpisodePreviewRequest";
import type { EpisodePreviewQuestion } from "../types/episodePreview.types";
import type { EpisodePreviewCandidate, ResolvedEpisodePreviewStyle } from "../types/episodeStylePreview.types";
import {
  resolveAnswerCardStyle,
  resolveBackgroundStyle,
  resolveCounterStyle,
  resolvePaletteId,
  resolveQuestionBoxStyle,
  resolveThinkingBarStyle,
  resolveVisualTheme,
} from "../utils/quizStyleResolution";

export type { EpisodePreviewCandidate, EpisodeStyleOverride } from "../types/episodeStylePreview.types";

type UseEpisodeStylePreviewProps = {
  channel: Channel;
  episode: Episode | null;
  candidate: EpisodePreviewCandidate | null;
  channelBrandName?: string;
  previewQuestion?: EpisodePreviewQuestion | null;
};

type PendingPreview = { html: string; requestId: number };

const RENDER_DEBOUNCE_MS = 150;

export function useEpisodeStylePreview({ channel, episode, candidate, channelBrandName, previewQuestion }: UseEpisodeStylePreviewProps) {
  const [previewHtml, setPreviewHtml] = useState("");
  const [pendingPreview, setPendingPreview] = useState<PendingPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [iframeKey, setIframeKey] = useState(1);
  const latestRequestId = useRef(0);

  const resolved = useMemo<ResolvedEpisodePreviewStyle>(() => {
    const quizConfig = episode?.quiz_config;
    return {
      theme: resolveVisualTheme(quizConfig),
      paletteId: resolvePaletteId(channel, quizConfig),
      thinkingBarStyle: resolveThinkingBarStyle(channel, quizConfig),
      questionBoxStyle: resolveQuestionBoxStyle(channel, quizConfig),
      answerCardStyle: resolveAnswerCardStyle(channel, quizConfig),
      counterStyle: resolveCounterStyle(channel, quizConfig),
      backgroundStyle: resolveBackgroundStyle(channel, quizConfig),
      totalQuestions: quizConfig?.question_count ?? 8,
      channelBrandName:
        channelBrandName !== undefined ? channelBrandName : episode?.quiz_config?.channel_brand_name || channel.display_name || "",
    };
  }, [channel, channelBrandName, episode]);

  const beginPreviewRequest = useCallback(() => {
    const requestId = ++latestRequestId.current;
    setLoading(true);
    setPreviewError(null);
    return requestId;
  }, []);

  const renderPreview = useCallback(
    async (requestId: number) => {
      const override = candidate?.override ?? {};

      try {
        const request = buildEpisodePreviewRequest({
          channel,
          override,
          resolved,
          question: previewQuestion,
          styleCatalogRevision: episode?.quiz_config?.style_catalog_revision ?? undefined,
          aspectRatio: episode?.quiz_config?.render_aspect_ratio ?? "16:9",
        });
        const response = await api.previewSandboxComposition(request);
        if (requestId !== latestRequestId.current) return;
        setPendingPreview({ html: response.html, requestId });
      } catch (error) {
        if (requestId !== latestRequestId.current) return;
        setPreviewError(error instanceof Error ? error.message : "Failed to render preview");
        setLoading(false);
      }
    },
    [candidate, channel.mascot_config, channel.mascot_id, episode?.quiz_config?.style_catalog_revision, episode?.quiz_config?.render_aspect_ratio, previewQuestion, resolved],
  );

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
    void renderPreview(beginPreviewRequest());
  }, [beginPreviewRequest, renderPreview]);

  useEffect(() => {
    const requestId = beginPreviewRequest();
    const timer = setTimeout(() => void renderPreview(requestId), RENDER_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [beginPreviewRequest, renderPreview]);

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
