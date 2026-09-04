import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Sparkle, Television, DeviceMobile } from "@phosphor-icons/react";
import type {
  Channel,
  CuriosityBadgeId,
  Episode,
  Task,
  ThumbnailAspectRatio,
  ThumbnailLayoutType,
  ThumbnailManifest,
} from "@studio/shared";
import { episodeApi } from "../../../api/episodeApi";
import type { Notice } from "../../../components/types";
import { ThumbnailCarouselStage } from "./ThumbnailCarouselStage";
import { ThumbnailControlsDeck } from "./ThumbnailControlsDeck";

type ThumbnailPreviewCardProps = {
  channel: Channel;
  episode: Episode;
  episodeId: string;
  activeEpisodeTask?: Task | null;
  onNotice?: (notice: NonNullable<Notice>) => void;
};

export function ThumbnailPreviewCard({
  channel,
  episode,
  episodeId,
  activeEpisodeTask,
  onNotice,
}: ThumbnailPreviewCardProps) {
  const initialRatio =
    episode.quiz_config?.thumbnail_aspect_ratio === "9:16" ||
    (episode.quiz_config?.thumbnail_aspect_ratio === "auto" &&
      (episode.quiz_config?.render_aspect_ratio === "9:16" || episode.topic?.title?.toLowerCase().includes("shorts")))
      ? "9:16"
      : "16:9";

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
    } else if (episode.quiz_config?.thumbnail_aspect_ratio === "16:9") {
      setActiveRatio("16:9");
    } else if (episode.quiz_config?.thumbnail_aspect_ratio === "auto") {
      const isShorts =
        episode.quiz_config?.render_aspect_ratio === "9:16" ||
        Boolean(episode.topic?.title?.toLowerCase().includes("shorts"));
      setActiveRatio(isShorts ? "9:16" : "16:9");
    }
  }, [episode.quiz_config?.thumbnail_aspect_ratio, episode.quiz_config?.render_aspect_ratio, episode.topic?.title]);

  const fetchManifest = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const res = await episodeApi.getThumbnail(channel.channel_id, episodeId);
        if (res.manifest) {
          setManifest((prev) => {
            if (!prev || prev.updated_at !== res.manifest?.updated_at || !imageTimestamp) {
              setImageTimestamp(String(Date.now()));
            }
            return res.manifest;
          });
          if (res.manifest.hook_text) {
            setCustomHook((prev) => (prev ? prev : res.manifest?.hook_text ?? ""));
          }
        }
      } catch {
        // Manifest not created yet
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [channel.channel_id, episodeId, imageTimestamp],
  );

  useEffect(() => {
    void fetchManifest();
    setImageTimestamp(episode.updated_at);
  }, [fetchManifest, episode.updated_at, episode.thumbnail_asset_path_16_9, episode.thumbnail_asset_path_9_16]);

  // Live Auto-Poll while task is active or if thumbnail is not yet loaded
  useEffect(() => {
    const isTaskRunning = Boolean(
      activeEpisodeTask && (activeEpisodeTask.status === "RUNNING" || activeEpisodeTask.status === "QUEUED"),
    );
    const hasAny = Boolean(
      manifest?.asset_path_16_9 ||
      manifest?.asset_path_9_16 ||
      episode.thumbnail_asset_path_16_9 ||
      episode.thumbnail_asset_path_9_16,
    );

    if (!isTaskRunning && hasAny) {
      return;
    }

    const interval = window.setInterval(() => {
      void fetchManifest(true);
    }, 2500);

    return () => window.clearInterval(interval);
  }, [activeEpisodeTask, manifest, episode.thumbnail_asset_path_16_9, episode.thumbnail_asset_path_9_16, fetchManifest]);

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

  const handleGenerateThumbnail = async () => {
    setGenerating(true);
    try {
      const targetMode = episode.quiz_config?.thumbnail_aspect_ratio || "auto";
      const res = await episodeApi.generateThumbnail(channel.channel_id, episodeId, {
        layout_override: selectedLayout === "auto" ? undefined : selectedLayout,
        custom_hook_text: customHook.trim() || undefined,
        badge_override: selectedBadge === "auto" ? undefined : selectedBadge,
        aspect_ratio: targetMode === "both" ? "both" : targetMode === "16:9" || targetMode === "9:16" ? targetMode : undefined,
      });
      if (res.ok && res.manifest) {
        setManifest(res.manifest);
        setImageTimestamp(String(Date.now()));
        setCarouselIndex(0);
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
  };

  const handleResetDefaults = () => {
    setSelectedLayout("auto");
    setSelectedBadge("auto");
    setCustomHook("");
    onNotice?.({
      tone: "good",
      message: "Reset thumbnail controls to automatic script intelligence!",
    });
  };

  const handleSetActive = async (versionId: string) => {
    try {
      const res = await episodeApi.setActiveThumbnail(channel.channel_id, episodeId, versionId);
      if (res.ok && res.manifest) {
        setManifest(res.manifest);
        setImageTimestamp(String(Date.now()));
        onNotice?.({ tone: "good", message: `Version activated as main thumbnail for ${activeRatio}!` });
      }
    } catch (err) {
      onNotice?.({ tone: "bad", message: `Failed to activate thumbnail version: ${(err as Error).message}` });
    }
  };


  const handleDeleteVariant = async (variantId: string) => {
    try {
      const res = await episodeApi.deleteThumbnailVariant(channel.channel_id, episodeId, variantId);
      if (res.ok && res.manifest) {
        setManifest(res.manifest);
        setImageTimestamp(String(Date.now()));
        setCarouselIndex((prev) => Math.max(0, prev - 1));
        onNotice?.({ tone: "good", message: "Thumbnail version deleted." });
      }
    } catch (err) {
      onNotice?.({ tone: "bad", message: `Failed to delete thumbnail version: ${(err as Error).message}` });
    }
  };

  const hasAnyThumbnail = Boolean(
    manifest?.asset_path_16_9 ||
    manifest?.asset_path_9_16 ||
    episode.thumbnail_asset_path_16_9 ||
    episode.thumbnail_asset_path_9_16,
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

  return (
    <section className="quiz-thumbnail-panel">
      {/* Studio Header Bar */}
      <div className="thumbnail-studio-header">
        <div className="thumbnail-studio-title">
          <Sparkle size={20} color="var(--accent)" />
          <span>YouTube Thumbnail Studio</span>
          <span className="thumbnail-studio-title-badge">Dual-Ratio AI</span>
        </div>

        {/* 16:9 vs 9:16 Segmented Control */}
        <div className="ratio-segmented-control" role="tablist" aria-label="Thumbnail Aspect Ratio">
          <button
            type="button"
            className={`ratio-segmented-btn ${activeRatio === "16:9" ? "active" : ""}`}
            onClick={() => setActiveRatio("16:9")}
            role="tab"
            aria-selected={activeRatio === "16:9"}
          >
            <Television size={15} />
            <span>16:9 Video</span>
          </button>
          <button
            type="button"
            className={`ratio-segmented-btn ${activeRatio === "9:16" ? "active" : ""}`}
            onClick={() => setActiveRatio("9:16")}
            role="tab"
            aria-selected={activeRatio === "9:16"}
          >
            <DeviceMobile size={15} />
            <span>9:16 Shorts Cover</span>
          </button>
        </div>
      </div>

      {/* Main Studio Workspace Grid */}
      <div className="thumbnail-studio-grid">
        {/* Left / Center: Visual Carousel Stage */}
        <ThumbnailCarouselStage
          channelId={channel.channel_id}
          episodeId={episodeId}
          episodeSlug={episode.slug}
          activeRatio={activeRatio}
          generating={generating}
          hasImage={hasImage}
          hasAnyThumbnail={hasAnyThumbnail}
          imageUrl={imageUrl}
          historyList={historyList}
          carouselIndex={carouselIndex}
          imageTimestamp={imageTimestamp}
          onPrev={() => setCarouselIndex((prev) => Math.max(0, prev - 1))}
          onNext={() => setCarouselIndex((prev) => Math.min(historyList.length - 1, prev + 1))}
          onSelectIndex={(idx) => setCarouselIndex(idx)}
          onSetActive={handleSetActive}
          onDeleteVariant={handleDeleteVariant}
        />

        {/* Right: Studio Control Deck */}
        <ThumbnailControlsDeck
          selectedLayout={selectedLayout}
          setSelectedLayout={setSelectedLayout}
          selectedBadge={selectedBadge}
          setSelectedBadge={setSelectedBadge}
          customHook={customHook}
          setCustomHook={setCustomHook}
          manifest={manifest}
          hasAnyThumbnail={hasAnyThumbnail}
          generating={generating}
          loading={loading}
          onGenerateThumbnail={handleGenerateThumbnail}
          onResetDefaults={handleResetDefaults}
        />
      </div>
    </section>
  );
}



