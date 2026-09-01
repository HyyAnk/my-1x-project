import React, { useState, useEffect, useCallback } from "react";
import {
  Sparkle,
  DownloadSimple,
  ArrowsClockwise,
  Image as ImageIcon,
  Television,
  DeviceMobile,
  CheckCircle,
  Eye,
  Info,
  Lightning,
  MagnifyingGlass,
  MaskHappy,
  Fire,
  CheckSquare,
  SquaresFour,
} from "@phosphor-icons/react";
import {
  THUMBNAIL_LAYOUT_CATALOG,
  type Channel,
  type Episode,
  type ThumbnailAspectRatio,
  type ThumbnailLayoutType,
  type ThumbnailManifest,
} from "@studio/shared";
import { episodeApi } from "../../../api/episodeApi";
import type { Notice } from "../../../components/types";

type ThumbnailPreviewCardProps = {
  channel: Channel;
  episode: Episode;
  episodeId: string;
  onNotice?: (notice: NonNullable<Notice>) => void;
};

const LAYOUT_OPTIONS: Array<{
  id: ThumbnailLayoutType | "auto";
  name: string;
  icon: React.ReactNode;
  subtitle: string;
}> = [
  { id: "auto", name: "Auto Detect", icon: <Sparkle size={16} />, subtitle: "Based on script" },
  { id: "mega_grid", name: "Mega Grid", icon: <SquaresFour size={16} />, subtitle: "100 Questions / 2x2" },
  { id: "split_vs", name: "Split Screen VS", icon: <Lightning size={16} />, subtitle: "Would You Rather" },
  { id: "mystery_silhouette", name: "Mystery Clue", icon: <MagnifyingGlass size={16} />, subtitle: "Guess Who / Shadow" },
  { id: "odd_one_out", name: "Odd One Out", icon: <Eye size={16} />, subtitle: "Spot Difference" },
  { id: "difficulty_tier", name: "Difficulty Tier", icon: <Fire size={16} />, subtitle: "IQ 4 Levels" },
  { id: "true_false", name: "True or False", icon: <CheckSquare size={16} />, subtitle: "Fact vs Myth" },
];

export function ThumbnailPreviewCard({ channel, episode, episodeId, onNotice }: ThumbnailPreviewCardProps) {
  const initialRatio =
    episode.quiz_config?.thumbnail_aspect_ratio === "9:16" ||
    (episode.quiz_config?.thumbnail_aspect_ratio === "auto" && episode.topic?.title?.toLowerCase().includes("shorts"))
      ? "9:16"
      : "16:9";


  const [activeRatio, setActiveRatio] = useState<ThumbnailAspectRatio>(initialRatio);
  const [selectedLayout, setSelectedLayout] = useState<ThumbnailLayoutType | "auto">("auto");
  const [customHook, setCustomHook] = useState<string>("");
  const [manifest, setManifest] = useState<ThumbnailManifest | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [imageTimestamp, setImageTimestamp] = useState<string | null>(episode.updated_at);

  // Sync active ratio tab if episode configuration changes
  useEffect(() => {
    if (episode.quiz_config?.thumbnail_aspect_ratio === "9:16") {
      setActiveRatio("9:16");
    } else if (episode.quiz_config?.thumbnail_aspect_ratio === "16:9") {
      setActiveRatio("16:9");
    }
  }, [episode.quiz_config?.thumbnail_aspect_ratio]);

  const fetchManifest = useCallback(async () => {
    setLoading(true);
    try {
      const res = await episodeApi.getThumbnail(channel.channel_id, episodeId);
      if (res.manifest) {
        setManifest(res.manifest);
        if (res.manifest.hook_text) {
          setCustomHook(res.manifest.hook_text);
        }
      }
    } catch {
      // Manifest not created yet
    } finally {
      setLoading(false);
    }
  }, [channel.channel_id, episodeId]);

  useEffect(() => {
    void fetchManifest();
  }, [fetchManifest]);

  const handleGenerateThumbnail = async () => {
    setGenerating(true);
    try {
      const targetMode = episode.quiz_config?.thumbnail_aspect_ratio || "auto";
      const res = await episodeApi.generateThumbnail(channel.channel_id, episodeId, {
        layout_override: selectedLayout === "auto" ? undefined : selectedLayout,
        custom_hook_text: customHook.trim() || undefined,
        aspect_ratio: targetMode === "both" ? "both" : "auto",
      });
      if (res.ok && res.manifest) {
        setManifest(res.manifest);
        setImageTimestamp(new Date().toISOString());
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


  const hasImage = activeRatio === "16:9"
    ? Boolean(manifest?.asset_path_16_9 || episode.thumbnail_asset_path_16_9)
    : Boolean(manifest?.asset_path_9_16 || episode.thumbnail_asset_path_9_16);

  const imageUrl = episodeApi.thumbnailFileUrl(channel.channel_id, episodeId, activeRatio, imageTimestamp);
  const activeLayoutId = manifest?.layout || "mega_grid";
  const activeLayoutInfo = THUMBNAIL_LAYOUT_CATALOG[activeLayoutId];

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
        
        {/* Left / Center: Visual Stage */}
        <div className="thumbnail-stage-card">
          {generating ? (
            <div className="thumbnail-generating-overlay">
              <ArrowsClockwise size={32} className="thumbnail-spinner" />
              <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>Synthesizing {activeRatio} high-CTR thumbnail...</span>
            </div>
          ) : hasImage ? (
            <div className={`thumbnail-frame-container ${activeRatio === "9:16" ? "portrait-mode" : ""}`}>
              <img
                src={imageUrl}
                alt={`YouTube Thumbnail ${activeRatio}`}
                className="thumbnail-image"
                style={{ aspectRatio: activeRatio === "16:9" ? "16/9" : "9/16" }}
              />
              <span className="thumbnail-spec-pill">
                {activeRatio === "16:9" ? "1280×720 HD" : "1080×1920 SHORTS"}
              </span>

              {/* Floating Action Toolbar */}
              <div className="thumbnail-floating-actions">
                <a
                  href={imageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="floating-action-btn"
                  title="View Fullscreen in new tab"
                >
                  <Eye size={16} />
                </a>
                <a
                  href={imageUrl}
                  download={`${episode.slug}_thumbnail_${activeRatio === "16:9" ? "16x9" : "9x16"}.jpg`}
                  className="floating-action-btn"
                  title="Download HD Image"
                >
                  <DownloadSimple size={16} />
                </a>
              </div>
            </div>
          ) : (
            <div className="thumbnail-empty-state">
              <ImageIcon size={44} opacity={0.35} />
              <span style={{ fontSize: "0.88rem" }}>No {activeRatio} thumbnail rendered yet</span>
            </div>
          )}
        </div>

        {/* Right: Studio Control Deck */}
        <div className="thumbnail-controls-deck">
          
          {/* Layout Archetype Selector */}
          <div className="control-field-group">
            <div className="control-field-header">
              <span className="control-field-label">Layout Archetype</span>
              <span className="tooltip-trigger" title="Different question types convert better with specific visual structures (Split VS for 1v1, Mystery for Guess Who, Mega Grid for 100 Qs)">
                <Info size={14} />
              </span>
            </div>

            <div className="layout-chips-grid">
              {LAYOUT_OPTIONS.map((opt) => {
                const isSelected = selectedLayout === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    className={`layout-chip-btn ${isSelected ? "active" : ""}`}
                    onClick={() => setSelectedLayout(opt.id)}
                    disabled={generating}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      {opt.icon}
                      <span className="layout-chip-name">{opt.name}</span>
                    </div>
                    <span className="layout-chip-sub">{opt.subtitle}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Layout Metadata & Mascot Persona Badge */}
          {activeLayoutInfo && (
            <div className="thumbnail-meta-summary-card">
              <div className="meta-summary-header">
                <span className="meta-summary-badge">
                  <CheckCircle size={14} />
                  <span>{activeLayoutInfo.name}</span>
                </span>
                <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
                  High-CTR Psychology
                </span>
              </div>
              <div style={{ color: "var(--ink-secondary)", fontSize: "0.78rem" }}>
                {activeLayoutInfo.psychologicalTrigger}
              </div>

              {manifest?.mascot_persona && (
                <div className="mascot-persona-row">
                  <MaskHappy size={16} style={{ flexShrink: 0, marginTop: "1px" }} />
                  <div>
                    <strong>Mascot Cosplay: </strong>
                    <span>{manifest.mascot_persona}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Custom Hook Headline Input */}
          <div className="control-field-group">
            <div className="control-field-header">
              <span className="control-field-label">Hook Headline</span>
              <span className="tooltip-trigger" title="The big bold 3D text rendered on the thumbnail banner">
                <Info size={14} />
              </span>
            </div>
            <input
              type="text"
              className="hook-text-input"
              value={customHook}
              onChange={(e) => setCustomHook(e.target.value)}
              placeholder={activeLayoutInfo?.hookTextTemplate || "e.g. GENERAL KNOWLEDGE"}
              disabled={generating}
            />
          </div>

          {/* Primary Generation Button */}
          <button
            type="button"
            className="thumbnail-generate-btn"
            onClick={handleGenerateThumbnail}
            disabled={generating || loading}
          >
            <ArrowsClockwise size={18} className={generating ? "thumbnail-spinner" : ""} />
            <span>
              {generating
                ? "Generating Dual Thumbnails (16:9 & 9:16)..."
                : hasImage
                  ? "Re-roll / Generate New Thumbnail"
                  : "Generate AI Thumbnails (Dual Size)"}
            </span>
          </button>

        </div>

      </div>
    </section>
  );
}
