import { useCallback, useEffect, useMemo, useState } from "react";
import { VIDEO_TITLE_MAX_CHARS, type VideoTitle } from "@studio/shared";
import { quizApi } from "../../../api/quizApi";
import type { Notice } from "../../../components/types";
import type { VideoTitleClient } from "../../quizProduct/types/videoMetadataClient.types";
import { computeTitleSeoMetrics } from "../utils/videoTitleMetrics";

export interface UseVideoTitleProps {
  channelId: string;
  episodeId: string;
  hasQuiz?: boolean;
  initialTitle?: VideoTitle | null;
  onNotice?: (notice: NonNullable<Notice>) => void;
  /** Called after the title and its re-aligned description were stored. */
  onUpdated?: () => Promise<void> | void;
  /** Data-access override; defaults to the Episode quiz-v2 title routes. */
  client?: VideoTitleClient;
}

export function buildEpisodeTitleClient(channelId: string, episodeId: string): VideoTitleClient {
  return {
    get: () => quizApi.getVideoTitle(channelId, episodeId),
    generate: (toneHint) => quizApi.generateVideoTitle(channelId, episodeId, toneHint),
    save: (input) => quizApi.saveVideoTitle(channelId, episodeId, input),
  };
}

const COPY_FEEDBACK_MS = 2500;

export function useVideoTitle({ channelId, episodeId, hasQuiz = true, initialTitle, onNotice, onUpdated, client }: UseVideoTitleProps) {
  const titleClient = useMemo(() => client ?? buildEpisodeTitleClient(channelId, episodeId), [client, channelId, episodeId]);
  const [title, setTitle] = useState<VideoTitle | null>(initialTitle ?? null);
  const [draftTitle, setDraftTitle] = useState(initialTitle?.title ?? "");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const applyTitle = useCallback((next: VideoTitle) => {
    setTitle(next);
    setDraftTitle(next.title);
  }, []);

  useEffect(() => {
    if (initialTitle) applyTitle(initialTitle);
  }, [initialTitle, applyTitle]);

  useEffect(() => {
    if (initialTitle) return;
    titleClient
      .get()
      .then((res) => res.title && applyTitle(res.title))
      .catch(() => undefined); // Artifact not created yet
  }, [titleClient, initialTitle, applyTitle]);

  const generate = async () => {
    if (!hasQuiz) {
      onNotice?.({ tone: "bad", message: "Question script must be generated before the video title" });
      return;
    }
    setGenerating(true);
    try {
      applyTitle((await titleClient.generate()).title);
      await onUpdated?.();
      onNotice?.({ tone: "good", message: "SEO title generated and description re-aligned" });
    } catch (err) {
      onNotice?.({ tone: "bad", message: err instanceof Error ? err.message : "Failed to generate video title" });
    } finally {
      setGenerating(false);
    }
  };

  const save = async () => {
    const trimmed = draftTitle.trim();
    if (!trimmed || trimmed.length > VIDEO_TITLE_MAX_CHARS) return;
    setSaving(true);
    try {
      applyTitle((await titleClient.save({ title: trimmed })).title);
      await onUpdated?.();
      onNotice?.({ tone: "good", message: "Video title saved and description re-aligned" });
    } catch (err) {
      onNotice?.({ tone: "bad", message: err instanceof Error ? err.message : "Failed to save video title" });
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = async () => {
    const text = draftTitle || title?.title || "";
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
    } catch {
      onNotice?.({ tone: "bad", message: "Failed to copy text to clipboard" });
    }
  };

  const metrics = useMemo(() => computeTitleSeoMetrics(draftTitle, title?.primary_keyword ?? ""), [draftTitle, title?.primary_keyword]);
  const isModified = Boolean(title && draftTitle.trim() !== title.title);

  return {
    title,
    draftTitle,
    setDraftTitle,
    generating,
    saving,
    copied,
    generate,
    save,
    copyToClipboard,
    metrics,
    isModified,
    canGenerate: Boolean(hasQuiz) && !generating && !saving,
    canSave: isModified && !saving && metrics.lengthStatus !== "overflow" && draftTitle.trim().length > 0,
  };
}
