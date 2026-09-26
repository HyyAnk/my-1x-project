import { useState, useEffect, useCallback, useMemo, useRef, type Dispatch, type SetStateAction } from "react";
import type {
  Channel,
  CuriosityBadgeId,
  Episode,
  Task,
  ThumbnailAspectRatio,
  ThumbnailHistoryItem,
  ThumbnailLayoutType,
  ThumbnailManifest,
} from "@studio/shared";
import { episodeApi } from "../../../api/episodeApi";
import type { Notice } from "../../../components/types";

export interface UseThumbnailPreviewOptions {
  channel: Channel;
  episode: Episode;
  episodeId: string;
  activeEpisodeTask?: Task | null;
  onNotice?: (notice: NonNullable<Notice>) => void;
  onUpdated?: () => Promise<void> | void;
}

export type UseThumbnailPreviewProps = UseThumbnailPreviewOptions;

export interface UseThumbnailPreviewReturn {
  activeRatio: ThumbnailAspectRatio;
  setActiveRatio: Dispatch<SetStateAction<ThumbnailAspectRatio>>;
  selectedLayout: ThumbnailLayoutType | "auto";
  setSelectedLayout: Dispatch<SetStateAction<ThumbnailLayoutType | "auto">>;
  selectedBadge: CuriosityBadgeId;
  setSelectedBadge: Dispatch<SetStateAction<CuriosityBadgeId>>;
  customHook: string;
  setCustomHook: Dispatch<SetStateAction<string>>;
  manifest: ThumbnailManifest | null;
  setManifest: Dispatch<SetStateAction<ThumbnailManifest | null>>;
  loading: boolean;
  generating: boolean;
  imageTimestamp: string | null;
  carouselIndex: number;
  setCarouselIndex: Dispatch<SetStateAction<number>>;
  historyList: ThumbnailHistoryItem[];
  currentVariant: ThumbnailHistoryItem | null;
  hasAnyThumbnail: boolean;
  hasImage: boolean;
  imageUrl: string;
  fetchManifest: (silent?: boolean) => Promise<void>;
  handleGenerateThumbnail: () => Promise<void>;
  handleResetDefaults: () => void;
  handleSetActive: (versionId: string) => Promise<void>;
  handleDeleteVariant: (variantId: string) => Promise<void>;
  handlePrevVariant: () => void;
  handleNextVariant: () => void;
}

export function useThumbnailPreview({
  channel,
  episode,
  episodeId,
  activeEpisodeTask,
  onNotice,
  onUpdated,
}: UseThumbnailPreviewOptions): UseThumbnailPreviewReturn {
  const isMountedRef = useRef(true);
  const manifestRequest = useRef(0);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      manifestRequest.current += 1;
    };
  }, []);

  const initialRatio: ThumbnailAspectRatio = episode.quiz_config?.thumbnail_aspect_ratio === "9:16" ? "9:16" : "16:9";

  const [activeRatio, setActiveRatio] = useState<ThumbnailAspectRatio>(initialRatio);
  const [selectedLayout, setSelectedLayout] = useState<ThumbnailLayoutType | "auto">("auto");
  const [selectedBadge, setSelectedBadge] = useState<CuriosityBadgeId>("auto");
  const [customHook, setCustomHook] = useState<string>("");
  const [manifest, setManifest] = useState<ThumbnailManifest | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [imageTimestamp, setImageTimestamp] = useState<string | null>(episode.updated_at);
  const [carouselIndex, setCarouselIndex] = useState<number>(0);

  // Sync active ratio tab if episode configuration changes
  useEffect(() => {
    if (episode.quiz_config?.thumbnail_aspect_ratio === "9:16") {
      setActiveRatio("9:16");
    } else {
      setActiveRatio("16:9");
    }
  }, [episode.quiz_config?.thumbnail_aspect_ratio]);

  const fetchManifest = useCallback(
    async (silent = false) => {
      const request = ++manifestRequest.current;
      if (!silent && isMountedRef.current) setLoading(true);
      try {
        const res = await episodeApi.getThumbnail(channel.channel_id, episodeId);
        if (!isMountedRef.current || request !== manifestRequest.current) return;
        if (res.manifest) {
          setManifest((prev) => {
            if (!prev || prev.updated_at !== res.manifest?.updated_at) {
              setImageTimestamp(String(Date.now()));
            }
            return res.manifest;
          });
          if (res.manifest.hook_text) {
            setCustomHook((prev) => (prev ? prev : (res.manifest?.hook_text ?? "")));
          }
        }
      } catch {
        // Manifest not created yet
      } finally {
        if (isMountedRef.current && request === manifestRequest.current) setLoading(false);
      }
    },
    [channel.channel_id, episodeId],
  );

  useEffect(() => {
    void fetchManifest();
    setImageTimestamp(episode.updated_at);
    return () => {
      manifestRequest.current += 1;
    };
  }, [fetchManifest, episode.updated_at, episode.thumbnail_asset_path_16_9, episode.thumbnail_asset_path_9_16]);

  // Schedule the next poll after the response so slow requests cannot overlap.
  useEffect(() => {
    const isTaskRunning = Boolean(activeEpisodeTask && (activeEpisodeTask.status === "RUNNING" || activeEpisodeTask.status === "QUEUED"));
    if (!isTaskRunning) {
      return;
    }

    let stopped = false;
    let timer: number;
    const poll = async () => {
      await fetchManifest(true);
      if (!stopped)
        timer = window.setTimeout(() => {
          void poll();
        }, 2500);
    };
    timer = window.setTimeout(() => {
      void poll();
    }, 2500);
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [activeEpisodeTask?.task_id, activeEpisodeTask?.status, fetchManifest]);

  // Filter history for current aspect ratio
  const historyList = useMemo(() => {
    if (!manifest?.history || manifest.history.length === 0) return [];
    return manifest.history.filter((h) => h.aspect_ratio === activeRatio);
  }, [manifest?.history, activeRatio]);

  // Sync carousel index with active variant on ratio switch or manifest change
  useEffect(() => {
    if (historyList.length > 0) {
      const activeIdx = historyList.findIndex((h) => h.is_active);
      setCarouselIndex(activeIdx >= 0 ? activeIdx : 0);
    } else {
      setCarouselIndex(0);
    }
  }, [activeRatio, historyList.length, manifest?.active_16_9_id, manifest?.active_9_16_id]);

  const currentVariant = historyList[carouselIndex] || null;

  const handleGenerateThumbnail = useCallback(async () => {
    manifestRequest.current += 1;
    setGenerating(true);
    try {
      const targetMode = episode.quiz_config?.thumbnail_aspect_ratio || "auto";
      const res = await episodeApi.generateThumbnail(channel.channel_id, episodeId, {
        layout_override: selectedLayout === "auto" ? undefined : selectedLayout,
        custom_hook_text: customHook.trim() || undefined,
        badge_override: selectedBadge,
        aspect_ratio: targetMode === "both" ? "both" : targetMode === "16:9" || targetMode === "9:16" ? targetMode : undefined,
      });
      if (res.ok && res.manifest) {
        manifestRequest.current += 1;
        setManifest(res.manifest);
        setImageTimestamp(String(Date.now()));
        setCarouselIndex(0);
        await onUpdated?.();
        onNotice?.({
          tone: "good",
          message:
            targetMode === "both"
              ? "Dual Thumbnails (16:9 & 9:16) synthesized successfully!"
              : `Thumbnail (${activeRatio}) synthesized successfully matching video mode!`,
        });
      }
    } catch (err) {
      onNotice?.({ tone: "bad", message: `Failed to generate thumbnail: ${(err as Error).message}` });
    } finally {
      setGenerating(false);
    }
  }, [
    channel.channel_id,
    episodeId,
    episode.quiz_config?.thumbnail_aspect_ratio,
    selectedLayout,
    customHook,
    selectedBadge,
    activeRatio,
    onUpdated,
    onNotice,
  ]);

  const handleResetDefaults = useCallback(() => {
    setSelectedLayout("auto");
    setSelectedBadge("auto");
    setCustomHook("");
    onNotice?.({
      tone: "good",
      message: "Reset thumbnail controls to automatic script intelligence!",
    });
  }, [onNotice]);

  const handleSetActive = useCallback(
    async (versionId: string) => {
      try {
        const res = await episodeApi.setActiveThumbnail(channel.channel_id, episodeId, versionId);
        if (res.ok && res.manifest) {
          setManifest(res.manifest);
          setImageTimestamp(String(Date.now()));
          await onUpdated?.();
          onNotice?.({ tone: "good", message: `Version activated as main thumbnail for ${activeRatio}!` });
        }
      } catch (err) {
        onNotice?.({ tone: "bad", message: `Failed to activate thumbnail version: ${(err as Error).message}` });
      }
    },
    [channel.channel_id, episodeId, activeRatio, onUpdated, onNotice],
  );

  const handleDeleteVariant = useCallback(
    async (variantId: string) => {
      try {
        const res = await episodeApi.deleteThumbnailVariant(channel.channel_id, episodeId, variantId);
        if (res.ok && res.manifest) {
          setManifest(res.manifest);
          setImageTimestamp(String(Date.now()));
          setCarouselIndex((prev) => Math.max(0, prev - 1));
          await onUpdated?.();
          onNotice?.({ tone: "good", message: "Thumbnail version deleted." });
        }
      } catch (err) {
        onNotice?.({ tone: "bad", message: `Failed to delete thumbnail version: ${(err as Error).message}` });
      }
    },
    [channel.channel_id, episodeId, onUpdated, onNotice],
  );

  const handlePrevVariant = useCallback(() => {
    setCarouselIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const handleNextVariant = useCallback(() => {
    setCarouselIndex((prev) => Math.min(historyList.length - 1, prev + 1));
  }, [historyList.length]);

  const hasAnyThumbnail = Boolean(
    manifest?.asset_path_16_9 || manifest?.asset_path_9_16 || episode.thumbnail_asset_path_16_9 || episode.thumbnail_asset_path_9_16,
  );

  const hasImage =
    activeRatio === "16:9"
      ? Boolean(manifest?.asset_path_16_9 || episode.thumbnail_asset_path_16_9)
      : Boolean(manifest?.asset_path_9_16 || episode.thumbnail_asset_path_9_16);

  const imageUrl = episodeApi.thumbnailFileUrl(
    channel.channel_id,
    episodeId,
    activeRatio,
    imageTimestamp,
    currentVariant ? currentVariant.id : undefined,
  );

  return {
    activeRatio,
    setActiveRatio,
    selectedLayout,
    setSelectedLayout,
    selectedBadge,
    setSelectedBadge,
    customHook,
    setCustomHook,
    manifest,
    setManifest,
    loading,
    generating,
    imageTimestamp,
    carouselIndex,
    setCarouselIndex,
    historyList,
    currentVariant,
    hasAnyThumbnail,
    hasImage,
    imageUrl,
    fetchManifest,
    handleGenerateThumbnail,
    handleResetDefaults,
    handleSetActive,
    handleDeleteVariant,
    handlePrevVariant,
    handleNextVariant,
  };
}
