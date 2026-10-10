import { useCallback, useEffect, useMemo, useState } from "react";
import { VIDEO_DESCRIPTION_MAX_CHARS, type VideoDescription } from "@studio/shared";
import { quizApi } from "../../../api/quizApi";
import type { Notice } from "../../../components/types";
import type { VideoDescriptionClient } from "../../quizProduct/types/videoMetadataClient.types";

export type DescriptionViewTab = "preview" | "blocks" | "edit";

export interface UseVideoDescriptionProps {
  channelId: string;
  episodeId: string;
  hasQuiz?: boolean;
  initialDescription?: VideoDescription | null;
  onNotice?: (notice: NonNullable<Notice>) => void;
  onUpdated?: () => Promise<void> | void;
  /** Data-access override; defaults to the Episode quiz-v2 description routes. */
  client?: VideoDescriptionClient;
}

export function buildEpisodeDescriptionClient(channelId: string, episodeId: string): VideoDescriptionClient {
  return {
    get: () => quizApi.getVideoDescription(channelId, episodeId),
    generate: (toneHint, force) => quizApi.generateVideoDescription(channelId, episodeId, toneHint, force),
    save: (input) => quizApi.saveVideoDescription(channelId, episodeId, input),
  };
}

export function useVideoDescription({
  channelId,
  episodeId,
  hasQuiz = true,
  initialDescription,
  onNotice,
  onUpdated,
  client,
}: UseVideoDescriptionProps) {
  const descriptionClient = useMemo(() => client ?? buildEpisodeDescriptionClient(channelId, episodeId), [client, channelId, episodeId]);
  const [description, setDescription] = useState<VideoDescription | null>(initialDescription ?? null);
  const [draftText, setDraftText] = useState<string>(initialDescription?.full_description_text ?? "");
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedBlock, setCopiedBlock] = useState<string | null>(null);
  const [toneHint, setToneHint] = useState("");
  const [activeTab, setActiveTab] = useState<DescriptionViewTab>("preview");

  useEffect(() => {
    if (initialDescription) {
      setDescription(initialDescription);
      setDraftText(initialDescription.full_description_text);
    }
  }, [initialDescription]);

  const fetchDescription = useCallback(async () => {
    setLoading(true);
    try {
      const res = await descriptionClient.get();
      if (res.description) {
        setDescription(res.description);
        setDraftText(res.description.full_description_text);
      }
    } catch {
      // Artifact not created yet
    } finally {
      setLoading(false);
    }
  }, [descriptionClient]);

  useEffect(() => {
    if (!initialDescription) {
      void fetchDescription();
    }
  }, [fetchDescription, initialDescription]);

  const generate = async (hint?: string) => {
    if (!hasQuiz) {
      onNotice?.({ tone: "bad", message: "Question script must be generated before video description" });
      return;
    }
    setGenerating(true);
    try {
      const effectiveHint = hint !== undefined ? hint : toneHint;
      const res = await descriptionClient.generate(effectiveHint);
      setDescription(res.description);
      setDraftText(res.description.full_description_text);
      if (hint !== undefined) setToneHint(hint);
      await onUpdated?.();
      onNotice?.({ tone: "good", message: "SEO video description generated successfully" });
    } catch (err) {
      onNotice?.({ tone: "bad", message: err instanceof Error ? err.message : "Failed to generate video description" });
    } finally {
      setGenerating(false);
    }
  };

  const save = async () => {
    if (!draftText.trim()) return;
    setSaving(true);
    try {
      const res = await descriptionClient.save({ full_description_text: draftText });
      setDescription(res.description);
      setDraftText(res.description.full_description_text);
      await onUpdated?.();
      onNotice?.({ tone: "good", message: "Video description saved" });
    } catch (err) {
      onNotice?.({ tone: "bad", message: err instanceof Error ? err.message : "Failed to save video description" });
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = async (text?: string, blockKey?: string) => {
    const textToCopy = text ?? (draftText || description?.full_description_text || "");
    if (!textToCopy) return;
    try {
      await navigator.clipboard.writeText(textToCopy);
      if (blockKey) {
        setCopiedBlock(blockKey);
        setTimeout(() => setCopiedBlock(null), 2500);
      } else {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
      onNotice?.({ tone: "good", message: blockKey ? `${blockKey} copied to clipboard` : "Description copied to clipboard" });
    } catch {
      onNotice?.({ tone: "bad", message: "Failed to copy text to clipboard" });
    }
  };

  const isModified = Boolean(description && draftText !== description.full_description_text);
  const charCount = draftText.length;
  const isOverLimit = charCount > VIDEO_DESCRIPTION_MAX_CHARS;
  const canGenerate = Boolean(hasQuiz) && !generating;
  const hasDescription = Boolean(description);

  return {
    description,
    draftText,
    setDraftText,
    loading,
    generating,
    saving,
    copied,
    copiedBlock,
    toneHint,
    setToneHint,
    activeTab,
    setActiveTab,
    generate,
    save,
    copyToClipboard,
    isModified,
    charCount,
    isOverLimit,
    canGenerate,
    hasDescription,
    hasQuiz,
  };
}
