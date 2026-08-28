import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  ArrowClockwise,
  Broadcast,
  CheckCircle,
  Circle,
  CircleNotch,
  Crosshair,
  DeviceMobile,
  FloppyDisk,
  MagnifyingGlass,
  Minus,
  MonitorPlay,
  Plus,
  Smiley,
  Warning,
  X,
} from "@phosphor-icons/react";
import {
  QUIZ_IMAGE_STYLE_LABELS,
  type Channel,
  type MascotPosition,
  type MascotProfile,
} from "@studio/shared";
import { useTranslation } from "../i18n";
import { api } from "../api";

export interface MascotAssignModalProps {
  mascot: MascotProfile | null;
  channels: Channel[];
  allMascots?: MascotProfile[];
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
  onNotice: (notice: { tone: "good" | "bad" | "neutral"; message: string }) => void;
}

type FilterTab = "all" | "selected" | "unassigned" | "other";
type AspectRatio = "9:16" | "16:9";

export function MascotAssignModal({
  mascot,
  channels,
  allMascots = [],
  isOpen,
  onClose,
  onSaved,
  onNotice,
}: MascotAssignModalProps) {
  const { t } = useTranslation();

  // Find sample config if this mascot was already assigned to some channel
  const sampleChannel = useMemo(
    () => channels.find((c) => c.mascot_id === mascot?.id),
    [channels, mascot?.id]
  );

  const [position, setPosition] = useState<MascotPosition>(() => sampleChannel?.mascot_config?.position || "bottom_left");
  const [scale, setScale] = useState<number>(() => sampleChannel?.mascot_config?.scale || 1.0);
  const [offsetX, setOffsetX] = useState<number>(() => sampleChannel?.mascot_config?.offset_x || 0);
  const [offsetY, setOffsetY] = useState<number>(() => sampleChannel?.mascot_config?.offset_y || 0);
  const [selectedChannelIds, setSelectedChannelIds] = useState<string[]>(() => mascot?.assigned_channel_ids || []);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("16:9");
  const [showGuides, setShowGuides] = useState(true);
  const [saving, setSaving] = useState(false);

  // Sync state when mascot changes
  const mascotId = mascot?.id;
  const currentAssignedIds = mascot?.assigned_channel_ids;
  useMemo(() => {
    if (mascot) {
      setSelectedChannelIds(currentAssignedIds || []);
      const sample = channels.find((c) => c.mascot_id === mascot.id);
      if (sample?.mascot_config) {
        setPosition(sample.mascot_config.position || "bottom_left");
        setScale(sample.mascot_config.scale || 1.0);
        setOffsetX(sample.mascot_config.offset_x || 0);
        setOffsetY(sample.mascot_config.offset_y || 0);
      } else {
        setPosition("bottom_left");
        setScale(1.0);
        setOffsetX(0);
        setOffsetY(0);
      }
    }
  }, [mascotId, currentAssignedIds, channels, mascot]);

  // Scaled 1920x1080 Viewport
  const stageWrapperRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(360);

  useLayoutEffect(() => {
    if (!stageWrapperRef.current) return;
    const el = stageWrapperRef.current;
    const updateSize = () => {
      if (el.clientWidth > 0) {
        setContainerWidth(el.clientWidth);
      }
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isOpen]);

  const targetStageWidth = aspectRatio === "16:9" ? 1920 : 1080;
  const targetStageHeight = aspectRatio === "16:9" ? 1080 : 1920;
  const stageScale = Math.min(1, containerWidth / targetStageWidth);

  // Interactive Direct Dragging
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; initX: number; initY: number } | null>(null);

  const handleMascotMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: offsetX,
      initY: offsetY,
    };
  };

  useEffect(() => {
    if (!isDragging) return;
    const onMouseMove = (e: MouseEvent) => {
      if (!dragStartRef.current) return;
      const dx = (e.clientX - dragStartRef.current.startX) / stageScale;
      const dy = (e.clientY - dragStartRef.current.startY) / stageScale;
      setOffsetX(Math.max(-500, Math.min(500, Math.round(dragStartRef.current.initX + dx))));
      setOffsetY(Math.max(-500, Math.min(500, Math.round(dragStartRef.current.initY + dy))));
    };
    const onMouseUp = () => {
      setIsDragging(false);
      dragStartRef.current = null;
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [isDragging, stageScale]);

  // Mascot preview image/sprite fallback
  const previewImage = useMemo(() => {
    if (!mascot) return null;
    return (
      mascot.actions.idle?.sprite_url ||
      mascot.actions.wave?.sprite_url ||
      mascot.master_image_url ||
      null
    );
  }, [mascot]);

  // Map channel_id -> other mascot name if assigned to another mascot
  const channelOtherMascotMap = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    if (!mascot) return map;
    for (const ch of channels) {
      if (ch.mascot_id && ch.mascot_id !== mascot.id) {
        const otherM = allMascots.find((m) => m.id === ch.mascot_id);
        map.set(ch.channel_id, {
          id: ch.mascot_id,
          name: otherM?.name || ch.mascot_id,
        });
      }
    }
    return map;
  }, [channels, mascot, allMascots]);

  // Tab counts
  const countAll = channels.length;
  const countSelected = selectedChannelIds.length;
  const countUnassigned = useMemo(
    () => channels.filter((c) => !c.mascot_id).length,
    [channels]
  );
  const countOther = useMemo(
    () => channels.filter((c) => Boolean(c.mascot_id && c.mascot_id !== mascot?.id)).length,
    [channels, mascot?.id]
  );

  // Count transferred channels from other mascots
  const transferredCount = useMemo(() => {
    return selectedChannelIds.filter((cid) => channelOtherMascotMap.has(cid)).length;
  }, [selectedChannelIds, channelOtherMascotMap]);

  // Filtered channel list
  const filteredChannels = useMemo(() => {
    return channels.filter((ch) => {
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = ch.display_name.toLowerCase().includes(query);
        const matchesId = ch.channel_id.toLowerCase().includes(query);
        const matchesLang = (ch.language || "").toLowerCase().includes(query);
        const matchesMarket = (ch.market || "").toLowerCase().includes(query);
        if (!matchesName && !matchesId && !matchesLang && !matchesMarket) {
          return false;
        }
      }

      if (filterTab === "selected") {
        return selectedChannelIds.includes(ch.channel_id);
      }
      if (filterTab === "unassigned") {
        return !ch.mascot_id;
      }
      if (filterTab === "other") {
        return Boolean(ch.mascot_id && ch.mascot_id !== mascot?.id);
      }
      return true;
    });
  }, [channels, searchQuery, filterTab, selectedChannelIds, mascot?.id]);

  if (!isOpen || !mascot) return null;

  const handleToggleChannel = (channelId: string) => {
    setSelectedChannelIds((prev) =>
      prev.includes(channelId) ? prev.filter((id) => id !== channelId) : [...prev, channelId]
    );
  };

  const handleSelectAllFiltered = () => {
    const idsToAdd = filteredChannels.map((c) => c.channel_id);
    setSelectedChannelIds((prev) => Array.from(new Set([...prev, ...idsToAdd])));
  };

  const handleDeselectAllFiltered = () => {
    const idsToRemove = new Set(filteredChannels.map((c) => c.channel_id));
    setSelectedChannelIds((prev) => prev.filter((id) => !idsToRemove.has(id)));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const channel of channels) {
        const isAssigned = selectedChannelIds.includes(channel.channel_id);
        if (isAssigned && channel.mascot_id !== mascot.id) {
          // Reassign from other/null to this mascot
          await api.assignMascotToChannel(channel.channel_id, {
            mascot_id: mascot.id,
            config: { enabled: true, position, scale, offset_x: offsetX, offset_y: offsetY },
          });
        } else if (!isAssigned && channel.mascot_id === mascot.id) {
          // Unassign from this mascot
          await api.assignMascotToChannel(channel.channel_id, {
            mascot_id: null,
          });
        } else if (isAssigned && channel.mascot_id === mascot.id) {
          // Update config (position, scale, offsets)
          await api.assignMascotToChannel(channel.channel_id, {
            mascot_id: mascot.id,
            config: { enabled: true, position, scale, offset_x: offsetX, offset_y: offsetY },
          });
        }
      }
      onNotice({ tone: "good", message: t("notices.channelsAssigned") });
      await onSaved();
      onClose();
    } catch (err) {
      onNotice({ tone: "bad", message: err instanceof Error ? err.message : t("notices.channelsAssignFailed") });
    } finally {
      setSaving(false);
    }
  };

  const formatLangTag = (channel: Channel) => {
    const lang = channel.language || channel.market || "EN";
    const lower = lang.toLowerCase();
    if (lower.includes("viet") || lower === "vi") return "VI";
    if (lower.includes("eng") || lower === "en") return "EN";
    if (lower.includes("japan") || lower === "ja") return "JA";
    if (lower.includes("korea") || lower === "ko") return "KO";
    if (lower.includes("thai") || lower === "th") return "TH";
    if (lower.includes("indonesia") || lower === "id") return "ID";
    return lang.toUpperCase().slice(0, 4);
  };

  const handleResetAll = () => {
    setOffsetX(0);
    setOffsetY(0);
    setScale(1.0);
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className="modal mascot-assign-modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mascot-assign-title"
      >
        {/* Header */}
        <header className="mascot-assign-header">
          <div className="mascot-assign-identity">
            <div
              className="mascot-assign-avatar"
              style={{
                borderColor: mascot.color_theme || "var(--accent)",
              }}
            >
              {mascot.master_image_url ? (
                <img src={mascot.master_image_url} alt={mascot.name} />
              ) : (
                <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: `${mascot.color_theme || "var(--accent)"}20` }} />
              )}
            </div>
            <div>
              <h2 id="mascot-assign-title" style={{ fontSize: "16px", margin: 0 }}>{t("mascots.quickAssignTitle", { name: mascot.name })}</h2>
            </div>
            <span
              className="mascot-style-pill"
              style={{ backgroundColor: `${mascot.color_theme || "var(--accent)"}20`, color: mascot.color_theme || "var(--accent)", marginLeft: "4px" }}
            >
              {QUIZ_IMAGE_STYLE_LABELS[mascot.visual_style] || mascot.visual_style}
            </span>
          </div>

          <button
            type="button"
            className="icon-button"
            aria-label={t("common.close")}
            onClick={onClose}
            disabled={saving}
          >
            <X size={18} />
          </button>
        </header>

        {/* 2-Column Studio Body */}
        <div className="mascot-assign-body-grid">
          {/* LEFT: Live Stage Simulator & Positioning */}
          <aside className="mascot-assign-stage-preview">
            <div className="stage-simulator-header">
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <strong>{t("mascots.stageConfigTitle")}</strong>
                <span className="render-target-pill" style={{ fontSize: "10px", padding: "1px 6px" }}>
                  1080P
                </span>
              </div>
              <div className="stage-aspect-toggles">
                <button
                  type="button"
                  className={`stage-aspect-btn ${aspectRatio === "16:9" ? "is-active" : ""}`}
                  onClick={() => setAspectRatio("16:9")}
                  title={t("mascots.previewAspectRatioVideo")}
                >
                  <MonitorPlay size={14} />
                  <span>16:9</span>
                </button>
                <button
                  type="button"
                  className={`stage-aspect-btn ${aspectRatio === "9:16" ? "is-active" : ""}`}
                  onClick={() => setAspectRatio("9:16")}
                  title={t("mascots.previewAspectRatioShorts")}
                >
                  <DeviceMobile size={14} />
                  <span>9:16</span>
                </button>
              </div>
            </div>

            {/* Simulated Stage Canvas (Scaled 1920x1080) */}
            <div
              ref={stageWrapperRef}
              className={`stage-simulator-viewport-container aspect-${aspectRatio.replace(":", "-")}`}
              style={{
                height: `${targetStageHeight * stageScale}px`,
                position: "relative",
                overflow: "hidden",
                borderRadius: "10px",
                border: "1px solid var(--line)",
              }}
            >
              <div
                className="stage-master-1920-canvas is-video-bg"
                style={{
                  width: `${targetStageWidth}px`,
                  height: `${targetStageHeight}px`,
                  transform: `scale(${stageScale})`,
                  transformOrigin: "top left",
                  position: "absolute",
                  inset: 0,
                }}
              >
                {/* 1920x1080 Mock Scene */}
                <div className="stage-1920-scene clip candy-scene">
                  <div className="bg-gradient" />
                  <div className="bg-rays" />
                  <div className="bg-pattern pattern-circles" />

                  <header className="game-header">
                    <div className="hanging-wood-sign">
                      <div className="wood-sign-plank">
                        <div className="wood-inner-panel">
                          <span className="question-number-val">1</span>
                        </div>
                      </div>
                    </div>
                  </header>

                  <div className="game-stage">
                    <div className="question-title">
                      <div className="question-card-inner">
                        <h1>{t("mascots.simQuestionTitle")}</h1>
                      </div>
                    </div>

                    <div className="sim-1920-split-row">
                      <figure className="image-card sim-hero-image">
                        <div className="hero-img-placeholder">
                          <span>🐆 Hero Image</span>
                        </div>
                      </figure>

                      <div className="answer-grid answer-count-3">
                        <div className="answer-card">
                          <b>A</b>
                          <span>{t("mascots.simChoiceA")}</span>
                        </div>
                        <div className="answer-card answer-correct">
                          <b>B</b>
                          <span>{t("mascots.simChoiceB")}</span>
                          <i className="answer-check">✓</i>
                        </div>
                        <div className="answer-card">
                          <b>C</b>
                          <span>{t("mascots.simChoiceC")}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Alignment Guides */}
                {showGuides ? (
                  <div className="alignment-guides-overlay-1920" aria-hidden="true">
                    <div className="guide-1920-crosshair-h" />
                    <div className="guide-1920-crosshair-v" />
                    <div className="guide-1920-safe-margins" />
                    <div className="guide-1920-ground-baseline" />
                  </div>
                ) : null}

                {/* Mascot on Stage (Matching 1920x1080 Render) */}
                <div
                  className={`candy-mascot-container mascot-stage anchor-${position} ${
                    isDragging ? "is-dragging" : ""
                  }`}
                  style={{
                    transformOrigin: "bottom center",
                    transform: `scale(${scale})`,
                    cursor: isDragging ? "grabbing" : "grab",
                  }}
                  onMouseDown={handleMascotMouseDown}
                >
                  {showGuides ? (
                    <div className="mascot-1920-bounding-box" aria-hidden="true">
                      <span className="bounding-coord-tag">
                        X: {offsetX > 0 ? `+${offsetX}` : offsetX}px, Y: {offsetY > 0 ? `+${offsetY}` : offsetY}px
                      </span>
                    </div>
                  ) : null}

                  {previewImage ? (
                    <div
                      className="candy-mascot-sprite"
                      style={{
                        backgroundImage: `url(${previewImage})`,
                        transform: `translate(${offsetX}px, ${offsetY}px)`,
                        position: "relative",
                        zIndex: 2,
                      }}
                      title="Drag to reposition"
                    />
                  ) : (
                    <div
                      className="stage-mascot-placeholder"
                      style={{
                        width: "220px",
                        height: "220px",
                        display: "grid",
                        placeItems: "center",
                        transform: `translate(${offsetX}px, ${offsetY}px)`,
                      }}
                    >
                      <Smiley size={64} style={{ color: mascot.color_theme || "var(--accent)" }} />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Drag helper hint */}
            <div className="stage-drag-helper-strip" style={{ margin: "6px 0 10px" }}>
              <Crosshair size={13} weight="bold" style={{ color: "var(--accent)" }} />
              <span>{t("mascots.dragHint") || "Drag to reposition"}</span>
              <span className="coord-readout-badge" style={{ fontSize: "11px" }}>
                X: <strong>{offsetX}px</strong> &nbsp;|&nbsp; Y: <strong>{offsetY}px</strong> &nbsp;|&nbsp; <strong>{Math.round(scale * 100)}%</strong>
              </span>
            </div>

            {/* Position Anchor & Reset */}
            <div className="stage-control-card">
              <div className="section-title-row">
                <label className="stage-control-label" style={{ margin: 0 }}>{t("mascots.stagePositionLabel")}</label>
                <button
                  type="button"
                  className="quiet-button compact"
                  onClick={handleResetAll}
                  title="Reset All"
                >
                  <ArrowClockwise size={12} />
                  <span>Reset</span>
                </button>
              </div>

              <div className="position-toggle-row" style={{ marginTop: "6px" }}>
                <button
                  type="button"
                  className={`pos-toggle-btn ${position === "bottom_left" ? "is-selected" : ""}`}
                  onClick={() => setPosition("bottom_left")}
                >
                  {t("mascots.bottomLeftOption")}
                </button>
                <button
                  type="button"
                  className={`pos-toggle-btn ${position === "bottom_right" ? "is-selected" : ""}`}
                  onClick={() => setPosition("bottom_right")}
                >
                  {t("mascots.bottomRightOption")}
                </button>
              </div>
            </div>

            {/* Scale Slider & Presets */}
            <div className="stage-control-card" style={{ marginTop: "8px" }}>
              <div className="stage-scale-header">
                <label className="stage-control-label" style={{ margin: 0 }}>
                  {t("mascots.scaleLabel", { scale: scale.toFixed(2) })}
                </label>
                <div className="precision-badge-group">
                  <span className="scale-value-badge">{Math.round(scale * 100)}%</span>
                  <input
                    type="number"
                    min={50}
                    max={200}
                    step={1}
                    value={Math.round(scale * 100)}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (!isNaN(val)) setScale(Math.max(0.5, Math.min(2.0, val / 100)));
                    }}
                    className="precision-number-input"
                  />
                  <span className="unit-label">%</span>
                </div>
              </div>

              <div className="stepper-action-row" style={{ margin: "6px 0" }}>
                <button
                  type="button"
                  className="precision-step-btn"
                  onClick={() => setScale(Math.max(0.5, Math.round((scale - 0.05) * 100) / 100))}
                >
                  -5%
                </button>
                <button
                  type="button"
                  className="precision-step-btn"
                  onClick={() => setScale(Math.max(0.5, Math.round((scale - 0.01) * 100) / 100))}
                >
                  -1%
                </button>
                <button
                  type="button"
                  className="precision-step-btn"
                  onClick={() => setScale(Math.min(2.0, Math.round((scale + 0.01) * 100) / 100))}
                >
                  +1%
                </button>
                <button
                  type="button"
                  className="precision-step-btn"
                  onClick={() => setScale(Math.min(2.0, Math.round((scale + 0.05) * 100) / 100))}
                >
                  +5%
                </button>
              </div>

              <input
                type="range"
                className="scale-range-slider"
                min={0.5}
                max={1.8}
                step={0.01}
                value={scale}
                onChange={(e) => setScale(Number(e.target.value))}
              />

              <div className="scale-presets-row" style={{ marginTop: "4px" }}>
                <button
                  type="button"
                  className={`scale-preset-chip ${Math.abs(scale - 0.75) < 0.02 ? "is-active" : ""}`}
                  onClick={() => setScale(0.75)}
                >
                  75%
                </button>
                <button
                  type="button"
                  className={`scale-preset-chip ${Math.abs(scale - 1.0) < 0.02 ? "is-active" : ""}`}
                  onClick={() => setScale(1.0)}
                >
                  100%
                </button>
                <button
                  type="button"
                  className={`scale-preset-chip ${Math.abs(scale - 1.25) < 0.02 ? "is-active" : ""}`}
                  onClick={() => setScale(1.25)}
                >
                  125%
                </button>
                <button
                  type="button"
                  className={`scale-preset-chip ${Math.abs(scale - 1.5) < 0.02 ? "is-active" : ""}`}
                  onClick={() => setScale(1.5)}
                >
                  150%
                </button>
              </div>
            </div>

            {/* X & Y Offsets */}
            <div className="stage-control-card" style={{ marginTop: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <Crosshair size={13} weight="bold" style={{ color: "var(--accent)" }} />
                  <label className="stage-control-label" style={{ margin: 0 }}>Offset X / Y</label>
                </div>
                <button
                  type="button"
                  className="quiet-button compact"
                  onClick={() => {
                    setOffsetX(0);
                    setOffsetY(0);
                  }}
                  title="Reset Offset"
                >
                  0
                </button>
              </div>

              {/* X Row */}
              <div className="precision-axis-header" style={{ marginTop: "4px" }}>
                <span className="nudge-axis-tag x-tag">X: <strong>{offsetX > 0 ? `+${offsetX}` : offsetX}px</strong></span>
                <div className="stepper-action-row" style={{ margin: 0 }}>
                  <button type="button" className="precision-step-btn" onClick={() => setOffsetX((p) => Math.max(-500, p - 5))}>-5</button>
                  <button type="button" className="precision-step-btn" onClick={() => setOffsetX((p) => Math.max(-500, p - 1))}>-1</button>
                  <button type="button" className="precision-step-btn" onClick={() => setOffsetX((p) => Math.min(500, p + 1))}>+1</button>
                  <button type="button" className="precision-step-btn" onClick={() => setOffsetX((p) => Math.min(500, p + 5))}>+5</button>
                </div>
              </div>

              {/* Y Row */}
              <div className="precision-axis-header" style={{ marginTop: "6px" }}>
                <span className="nudge-axis-tag y-tag">Y: <strong>{offsetY > 0 ? `+${offsetY}` : offsetY}px</strong></span>
                <div className="stepper-action-row" style={{ margin: 0 }}>
                  <button type="button" className="precision-step-btn" onClick={() => setOffsetY((p) => Math.max(-500, p - 5))}>-5</button>
                  <button type="button" className="precision-step-btn" onClick={() => setOffsetY((p) => Math.max(-500, p - 1))}>-1</button>
                  <button type="button" className="precision-step-btn" onClick={() => setOffsetY((p) => Math.min(500, p + 1))}>+1</button>
                  <button type="button" className="precision-step-btn" onClick={() => setOffsetY((p) => Math.min(500, p + 5))}>+5</button>
                </div>
              </div>
            </div>
          </aside>

          {/* RIGHT: Smart Channel Hub */}
          <main className="mascot-assign-channel-hub">
            {/* Search and Filter Row */}
            <div className="channel-hub-top-bar">
              <div className="channel-search-box">
                <MagnifyingGlass size={16} className="search-icon" />
                <input
                  type="text"
                  placeholder={t("mascots.searchChannelsPlaceholder")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery ? (
                  <button
                    type="button"
                    className="icon-button compact clear-search-btn"
                    onClick={() => setSearchQuery("")}
                  >
                    <X size={13} />
                  </button>
                ) : null}
              </div>

              {/* Filter Tabs */}
              <div className="channel-filter-tabs">
                <button
                  type="button"
                  className={`channel-filter-tab ${filterTab === "all" ? "is-active" : ""}`}
                  onClick={() => setFilterTab("all")}
                >
                  {t("mascots.filterAll")} <span className="tab-badge">{countAll}</span>
                </button>
                <button
                  type="button"
                  className={`channel-filter-tab ${filterTab === "selected" ? "is-active" : ""}`}
                  onClick={() => setFilterTab("selected")}
                >
                  {t("mascots.filterSelected", { count: countSelected })}
                </button>
                <button
                  type="button"
                  className={`channel-filter-tab ${filterTab === "unassigned" ? "is-active" : ""}`}
                  onClick={() => setFilterTab("unassigned")}
                >
                  {t("mascots.filterUnassigned", { count: countUnassigned })}
                </button>
                {countOther > 0 ? (
                  <button
                    type="button"
                    className={`channel-filter-tab ${filterTab === "other" ? "is-active" : ""}`}
                    onClick={() => setFilterTab("other")}
                  >
                    {t("mascots.filterOtherMascots", { count: countOther })}
                  </button>
                ) : null}
              </div>

              {/* Batch Actions Bar */}
              <div className="channel-batch-bar">
                <span className="channel-count-text">
                  {t("mascots.selectedChannelsSummary", {
                    count: selectedChannelIds.length,
                    total: channels.length,
                  })}
                </span>
                <div className="batch-actions-btns">
                  <button
                    type="button"
                    className="quiet-button compact"
                    onClick={handleSelectAllFiltered}
                    disabled={filteredChannels.length === 0}
                  >
                    {t("mascots.selectAllBtn")}
                  </button>
                  <button
                    type="button"
                    className="quiet-button compact"
                    onClick={handleDeselectAllFiltered}
                    disabled={selectedChannelIds.length === 0}
                  >
                    {t("mascots.deselectAllBtn")}
                  </button>
                </div>
              </div>
            </div>

            {/* Channels Card List */}
            <div className="channels-card-list">
              {filteredChannels.length === 0 ? (
                <div className="channels-empty-state">
                  <Broadcast size={36} weight="duotone" />
                  <p>{channels.length === 0 ? t("mascots.noChannelsAvailable") : t("mascots.noChannelsFound")}</p>
                </div>
              ) : (
                filteredChannels.map((channel) => {
                  const isChecked = selectedChannelIds.includes(channel.channel_id);
                  const isCurrentlyThis = channel.mascot_id === mascot.id;
                  const otherMascotInfo = channelOtherMascotMap.get(channel.channel_id);
                  const langDisplay = formatLangTag(channel);

                  return (
                    <article
                      key={channel.channel_id}
                      className={`channel-select-card ${isChecked ? "is-selected" : ""} ${otherMascotInfo ? "has-other-mascot" : ""}`}
                      onClick={() => handleToggleChannel(channel.channel_id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleToggleChannel(channel.channel_id);
                        }
                      }}
                    >
                      {/* Checkbox indicator */}
                      <div className="channel-select-checkbox">
                        {isChecked ? (
                          <CheckCircle size={20} weight="fill" className="check-icon checked" />
                        ) : (
                          <Circle size={20} weight="regular" className="check-icon unchecked" />
                        )}
                      </div>

                      {/* Main channel metadata */}
                      <div className="channel-select-info">
                        <div className="channel-select-title-row">
                          <strong className="channel-select-name">{channel.display_name}</strong>
                          <span className="channel-lang-chip">{langDisplay}</span>
                          <span className={`channel-status-dot ${channel.status.toLowerCase()}`} title={channel.status} />
                        </div>

                        <div className="channel-select-meta-row">
                          <span className="channel-id-code">{channel.channel_id}</span>

                          {/* Mascot status pill */}
                          {isCurrentlyThis ? (
                            <span className="mascot-state-badge current">
                              <span className="pulse-dot green" />
                              {t("mascots.channelItemCurrentlyThis")}
                            </span>
                          ) : otherMascotInfo ? (
                            <span className="mascot-state-badge other" title={`Current mascot: ${otherMascotInfo.name}`}>
                              <Warning size={12} weight="bold" />
                              {t("mascots.currentlyAssignedToOther", { name: otherMascotInfo.name })}
                            </span>
                          ) : (
                            <span className="mascot-state-badge unassigned">
                              {t("mascots.channelItemUnassigned")}
                            </span>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </main>
        </div>

        {/* Footer */}
        <footer className="mascot-assign-footer">
          <div className="mascot-assign-footer-info">
            {transferredCount > 0 ? (
              <span className="transfer-warning-badge">
                <Warning size={15} weight="fill" />
                {t("mascots.transferWarningNotice", { count: transferredCount, name: mascot.name })}
              </span>
            ) : (
              <span className="footer-summary-text">
                {t("mascots.assignChannelsLabel", { count: selectedChannelIds.length })}
              </span>
            )}
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="quiet-button"
              onClick={onClose}
              disabled={saving}
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={() => void handleSave()}
              disabled={saving}
            >
              {saving ? <CircleNotch className="spin" size={16} /> : <FloppyDisk size={16} />}
              <span>{saving ? t("mascots.quickAssignSavingBtn") : t("mascots.quickAssignSaveBtn")}</span>
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
