import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  ArrowClockwise,
  ArrowLeft,
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
  Play,
  Plus,
  Sliders,
  Smiley,
  Stop,
  Warning,
  X,
} from "@phosphor-icons/react";
import { ALL_MASCOT_ACTIONS, type Channel, type MascotActionType, type MascotProfile } from "@studio/shared";
import { useTranslation } from "../../../i18n";
import { getLocalizedActionMeta } from "../constants";

export type MascotCalibrationStepProps = {
  editingMascot: MascotProfile | null;
  mascots: MascotProfile[];
  channels: Channel[];
  genColor: string;
  busyAction: string | null;
  activePreviewAction: MascotActionType;
  setActivePreviewAction: (action: MascotActionType) => void;
  isPlaying: boolean;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  stagePreviewMode: "grid" | "video_stage";
  setStagePreviewMode: (mode: "grid" | "video_stage") => void;
  aspectRatio: "16:9" | "9:16";
  setAspectRatio: (ratio: "16:9" | "9:16") => void;
  flipHorizontal: boolean;
  setFlipHorizontal: React.Dispatch<React.SetStateAction<boolean>>;
  activeConfigTab: "calibration" | "channels";
  setActiveConfigTab: (tab: "calibration" | "channels") => void;
  targetPosition: "bottom_left" | "bottom_right";
  setTargetPosition: (pos: "bottom_left" | "bottom_right") => void;
  targetScale: number;
  setTargetScale: (scale: number) => void;
  showInIntro?: boolean;
  setShowInIntro?: (show: boolean) => void;
  showInOutro?: boolean;
  setShowInOutro?: (show: boolean) => void;
  showInQuestion?: boolean;
  setShowInQuestion?: (show: boolean) => void;
  assignedChannels: string[];
  setAssignedChannels: React.Dispatch<React.SetStateAction<string[]>>;
  channelSearchQuery: string;
  setChannelSearchQuery: (query: string) => void;
  channelFilterTab: "all" | "selected" | "unassigned" | "other";
  setChannelFilterTab: (tab: "all" | "selected" | "unassigned" | "other") => void;
  isScenarioMode: boolean;
  setIsScenarioMode: (mode: boolean) => void;
  scenarioPhase: "intro" | "question" | "thinking" | "reveal" | "explain";
  scenarioCountdown: number;
  scrubberTime: number;
  reactionStyle: "celebrate" | "oops";
  setReactionStyle: (style: "celebrate" | "oops") => void;
  onionSkinEnabled: boolean;
  setOnionSkinEnabled: (enabled: boolean) => void;
  onionSkinOpacity: number;
  setOnionSkinOpacity: (opacity: number) => void;
  showGuides: boolean;
  setShowGuides: (show: boolean) => void;
  nudgeX: number;
  setNudgeX: React.Dispatch<React.SetStateAction<number>>;
  nudgeY: number;
  setNudgeY: React.Dispatch<React.SetStateAction<number>>;
  calibrating: boolean;
  onApplyTimelineTime: (timeSec: number) => void;
  onSaveCalibration: () => void;
  onApplyToChannels: () => void;
  onBackStep: () => void;
};

export function MascotCalibrationStep({
  editingMascot,
  mascots,
  channels,
  genColor,
  busyAction,
  activePreviewAction,
  setActivePreviewAction,
  isPlaying,
  setIsPlaying,
  stagePreviewMode,
  setStagePreviewMode,
  aspectRatio,
  setAspectRatio,
  flipHorizontal,
  setFlipHorizontal,
  activeConfigTab,
  setActiveConfigTab,
  targetPosition,
  setTargetPosition,
  targetScale,
  setTargetScale,
  showInIntro = false,
  setShowInIntro,
  showInOutro = false,
  setShowInOutro,
  showInQuestion = true,
  setShowInQuestion,
  assignedChannels,
  setAssignedChannels,
  channelSearchQuery,
  setChannelSearchQuery,
  channelFilterTab,
  setChannelFilterTab,
  isScenarioMode,
  setIsScenarioMode,
  scenarioPhase,
  scenarioCountdown,
  scrubberTime,
  reactionStyle,
  setReactionStyle,
  onionSkinEnabled,
  setOnionSkinEnabled,
  onionSkinOpacity,
  setOnionSkinOpacity,
  showGuides,
  setShowGuides,
  nudgeX,
  setNudgeX,
  nudgeY,
  setNudgeY,
  calibrating,
  onApplyTimelineTime,
  onSaveCalibration,
  onApplyToChannels,
  onBackStep,
}: MascotCalibrationStepProps) {
  const { t } = useTranslation();

  const currentActionSprite = editingMascot?.actions[activePreviewAction];

  // 1920x1080 Scaled Stage Viewport Resizing
  const stageWrapperRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(760);

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
    window.addEventListener("resize", updateSize);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", updateSize);
    };
  }, []);

  const targetStageWidth = aspectRatio === "16:9" ? 1920 : 1080;
  const targetStageHeight = aspectRatio === "16:9" ? 1080 : 1920;
  const stageScale = Math.min(1, containerWidth / targetStageWidth);

  // Interactive Direct Dragging on Stage
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; initNudgeX: number; initNudgeY: number } | null>(null);

  const handleMascotMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initNudgeX: nudgeX,
      initNudgeY: nudgeY,
    };
  };

  useEffect(() => {
    if (!isDragging) return;
    const onMouseMove = (e: MouseEvent) => {
      if (!dragStartRef.current) return;
      const dx = (e.clientX - dragStartRef.current.startX) / stageScale;
      const dy = (e.clientY - dragStartRef.current.startY) / stageScale;
      const nextX = Math.round(dragStartRef.current.initNudgeX + dx);
      const nextY = Math.round(dragStartRef.current.initNudgeY + dy);
      setNudgeX(Math.max(-2000, Math.min(2000, nextX)));
      setNudgeY(Math.max(-1500, Math.min(1500, nextY)));
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
  }, [isDragging, stageScale, setNudgeX, setNudgeY]);

  // Map channel_id -> other mascot info if assigned to another mascot
  const channelOtherMascotMap = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    if (!editingMascot) return map;
    for (const ch of channels) {
      if (ch.mascot_id && ch.mascot_id !== editingMascot.id) {
        const otherM = mascots.find((m) => m.id === ch.mascot_id);
        map.set(ch.channel_id, {
          id: ch.mascot_id,
          name: otherM?.name || ch.mascot_id,
        });
      }
    }
    return map;
  }, [channels, editingMascot, mascots]);

  // Tab counts
  const countAll = channels.length;
  const countSelected = assignedChannels.length;
  const countUnassigned = useMemo(() => channels.filter((c) => !c.mascot_id).length, [channels]);
  const countOther = useMemo(
    () => channels.filter((c) => Boolean(c.mascot_id && c.mascot_id !== editingMascot?.id)).length,
    [channels, editingMascot?.id],
  );

  // Filtered channel list
  const filteredChannels = useMemo(() => {
    return channels.filter((ch) => {
      if (channelSearchQuery.trim()) {
        const query = channelSearchQuery.toLowerCase().trim();
        const matchesName = ch.display_name.toLowerCase().includes(query);
        const matchesId = ch.channel_id.toLowerCase().includes(query);
        const matchesLang = (ch.language || "").toLowerCase().includes(query);
        const matchesMarket = (ch.market || "").toLowerCase().includes(query);
        if (!matchesName && !matchesId && !matchesLang && !matchesMarket) {
          return false;
        }
      }

      if (channelFilterTab === "selected") {
        return assignedChannels.includes(ch.channel_id);
      }
      if (channelFilterTab === "unassigned") {
        return !ch.mascot_id;
      }
      if (channelFilterTab === "other") {
        return Boolean(ch.mascot_id && ch.mascot_id !== editingMascot?.id);
      }
      return true;
    });
  }, [channels, channelSearchQuery, channelFilterTab, assignedChannels, editingMascot?.id]);

  const handleToggleChannel = (channelId: string) => {
    setAssignedChannels((prev) => (prev.includes(channelId) ? prev.filter((id) => id !== channelId) : [...prev, channelId]));
  };

  const handleSelectAllFiltered = () => {
    const idsToAdd = filteredChannels.map((c) => c.channel_id);
    setAssignedChannels((prev) => Array.from(new Set([...prev, ...idsToAdd])));
  };

  const handleDeselectAllFiltered = () => {
    const idsToRemove = new Set(filteredChannels.map((c) => c.channel_id));
    setAssignedChannels((prev) => prev.filter((id) => !idsToRemove.has(id)));
  };

  const formatLangTag = (channel: Channel) => {
    const lang = channel.language || channel.market || "EN";
    const lower = lang.toLowerCase();
    if (lower.includes("viet") || lower === "vi") return "🇻🇳 VI";
    if (lower.includes("eng") || lower === "en") return "🇺🇸 EN";
    if (lower.includes("japan") || lower === "ja") return "🇯🇵 JA";
    if (lower.includes("korea") || lower === "ko") return "🇰🇷 KO";
    if (lower.includes("thai") || lower === "th") return "🇹🇭 TH";
    if (lower.includes("indonesia") || lower === "id") return "🇮🇩 ID";
    return lang.toUpperCase().slice(0, 4);
  };

  const isCurrentActionOffsetClean = nudgeX === (currentActionSprite?.offset_x || 0) && nudgeY === (currentActionSprite?.offset_y || 0);

  const handleResetAll = () => {
    setNudgeX(0);
    setNudgeY(0);
    setTargetScale(1.0);
  };

  return (
    <div className="wizard-step-content step-live-studio-grid">
      {/* 1. Left Column: True 1920x1080 Studio Stage Monitor & Interactive Rehearsal */}
      <div className="live-player-col">
        <div className="wizard-card studio-monitor-card">
          {/* Monitor Top Control Header */}
          <div className="studio-monitor-header">
            <div className="monitor-title-group">
              <span className="live-status-pill">
                <span className="live-pulse-dot" />
                LIVE 1080P
              </span>
              <div className="monitor-heading-wrap">
                <h3>{t("mascots.stageTheaterTitle")}</h3>
                <span className="render-target-pill">{aspectRatio === "16:9" ? "1920 × 1080 px" : "1080 × 1920 px"} [1:1 Match]</span>
              </div>
            </div>

            <div className="monitor-header-controls">
              {/* Aspect Ratio Toggle (16:9 vs 9:16) */}
              <div className="stage-aspect-toggles">
                <button
                  type="button"
                  className={`stage-aspect-btn ${aspectRatio === "16:9" ? "is-active" : ""}`}
                  onClick={() => setAspectRatio("16:9")}
                  title={t("mascots.previewAspectRatioVideo")}
                >
                  <MonitorPlay size={14} weight="bold" />
                  <span>16:9</span>
                </button>
                <button
                  type="button"
                  className={`stage-aspect-btn ${aspectRatio === "9:16" ? "is-active" : ""}`}
                  onClick={() => setAspectRatio("9:16")}
                  title={t("mascots.previewAspectRatioShorts")}
                >
                  <DeviceMobile size={14} weight="bold" />
                  <span>9:16</span>
                </button>
              </div>

              {/* Stage Background Mode Toggle (Video Mock vs Grid) */}
              <div className="stage-mode-toggles">
                <button
                  type="button"
                  className={`filter-chip ${stagePreviewMode === "video_stage" ? "is-active" : ""}`}
                  onClick={() => setStagePreviewMode("video_stage")}
                >
                  {t("mascots.videoStageMode")}
                </button>
                <button
                  type="button"
                  className={`filter-chip ${stagePreviewMode === "grid" ? "is-active" : ""}`}
                  onClick={() => setStagePreviewMode("grid")}
                >
                  {t("mascots.gridMode")}
                </button>
              </div>
            </div>
          </div>

          {/* Stage Simulator Outer Scaler Viewport */}
          <div className="stage-screen-outer-wrapper">
            <div
              ref={stageWrapperRef}
              className={`stage-simulator-viewport-container aspect-${aspectRatio.replace(":", "-")}`}
              style={{
                height: `${targetStageHeight * stageScale}px`,
              }}
            >
              {/* Inner 1920x1080 (or 1080x1920) Master Frame */}
              <div
                className={`stage-master-1920-canvas ${stagePreviewMode === "video_stage" ? "is-video-bg" : "is-grid-bg"}`}
                style={{
                  width: `${targetStageWidth}px`,
                  height: `${targetStageHeight}px`,
                  transform: `scale(${stageScale})`,
                  transformOrigin: "top left",
                }}
              >
                {/* 1. Real Quiz Video Stage Elements (1920x1080 Space) */}
                {stagePreviewMode === "video_stage" ? (
                  <div className="stage-1920-scene clip candy-scene">
                    <div className="bg-gradient" />
                    <div className="bg-rays" />
                    <div className="bg-pattern pattern-circles" />
                    <div className="bg-pattern pattern-sprinkles" />
                    <div className="bg-shape shape-a" />

                    {/* Intro Phase */}
                    {scenarioPhase === "intro" ? (
                      <div className="sim-1920-intro-card">
                        <span className="mini-badge">{t("mascots.simIntroBadge")}</span>
                        <h1>{t("mascots.simIntroTitle")}</h1>
                        <p>{t("mascots.simIntroSub")}</p>
                        <div className="intro-stars">✦&nbsp;&nbsp;★&nbsp;&nbsp;✦</div>
                      </div>
                    ) : (
                      <>
                        {/* Hanging Wood Sign Header (Left Top) */}
                        <header className="game-header">
                          <div className="hanging-wood-sign">
                            <div className="hanging-ropes">
                              <span className="wood-rope rope-left" />
                              <span className="wood-rope rope-right" />
                            </div>
                            <div className="wood-sign-plank">
                              <span className="rope-bracket bracket-left" />
                              <span className="rope-bracket bracket-right" />
                              <div className="wood-inner-panel">
                                <span className="question-number-val">1</span>
                              </div>
                              <span className="wood-sign-star star-tl">✦</span>
                              <span className="wood-sign-star star-br">★</span>
                            </div>
                          </div>
                        </header>

                        {/* Game Stage Content Wrap */}
                        <div className="game-stage">
                          {/* Question Card Inner */}
                          <div className="question-title">
                            <div className="question-card-inner">
                              <div className="q-badge-star">
                                <span className="star-shape">★</span>
                                <i className="star-sparkle star-sp-1">✦</i>
                                <i className="star-sparkle star-sp-2">•</i>
                              </div>
                              <div className="q-decor-corner q-decor-top-right">
                                <span className="corner-gem">✦</span>
                              </div>
                              <div className="q-decor-corner q-decor-bottom-right">
                                <span className="corner-petal">✿</span>
                              </div>
                              <h1>{t("mascots.simQuestionTitle")}</h1>
                            </div>
                          </div>

                          {/* Phase Body Content */}
                          {scenarioPhase === "explain" ? (
                            <div className="fact-card" style={{ opacity: 1, marginTop: "24px" }}>
                              <p>{t("mascots.simFactText")}</p>
                            </div>
                          ) : (
                            <>
                              <div className="sim-1920-split-row">
                                <figure className="image-card sim-hero-image">
                                  <div className="hero-img-placeholder">
                                    <span>🐆 Cheetah (110 km/h)</span>
                                  </div>
                                  <span className="image-shine" />
                                </figure>

                                <div className="answer-grid answer-count-3" style={{ opacity: 1 }}>
                                  <div className={`answer-card ${scenarioPhase === "reveal" ? "answer-incorrect" : ""}`}>
                                    <b>A</b>
                                    <span>{t("mascots.simChoiceA")}</span>
                                  </div>
                                  <div className={`answer-card ${scenarioPhase === "reveal" ? "answer-correct" : ""}`}>
                                    <b>B</b>
                                    <span>{t("mascots.simChoiceB")}</span>
                                    {scenarioPhase === "reveal" ? <i className="answer-check">✓</i> : null}
                                  </div>
                                  <div className={`answer-card ${scenarioPhase === "reveal" ? "answer-incorrect" : ""}`}>
                                    <b>C</b>
                                    <span>{t("mascots.simChoiceC")}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Thinking Countdown Bar */}
                              <div className="phase-region">
                                <div className="thinking-bar" style={{ opacity: 1 }}>
                                  <div className="thinking-track">
                                    <div className="timer-milestones">
                                      <span className="milestone-star star-1">★</span>
                                      <span className="milestone-star star-2">★</span>
                                      <span className="milestone-star star-3">★</span>
                                      <span className="milestone-star star-4">★</span>
                                    </div>
                                    <div
                                      className="timer-progress"
                                      style={{
                                        width: scenarioPhase === "thinking" ? `${(scenarioCountdown / 5) * 100}%` : "100%",
                                        transition: "width 1s linear",
                                      }}
                                    />
                                    <span
                                      className="timer-marker"
                                      style={{
                                        left: scenarioPhase === "thinking" ? `${Math.max(5, (scenarioCountdown / 5) * 98)}%` : "98%",
                                        transition: "left 1s linear",
                                      }}
                                    >
                                      <b className="marker-val" style={{ opacity: 1 }}>
                                        {scenarioPhase === "thinking" ? scenarioCountdown : "?"}
                                      </b>
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ) : null}

                {/* 2. Alignment Guides (1920x1080 Grid Overlay) */}
                {showGuides ? (
                  <div className="alignment-guides-overlay-1920" aria-hidden="true">
                    <div className="guide-1920-crosshair-h" />
                    <div className="guide-1920-crosshair-v" />
                    <div className="guide-1920-safe-margins" />
                    <div className="guide-1920-ground-baseline" />
                    <div className="guide-1920-dimension-badge">
                      <span>{aspectRatio === "16:9" ? "1920 × 1080 FHD" : "1080 × 1920 SHORTS"}</span>
                    </div>
                  </div>
                ) : null}

                {/* 3. True 1920x1080 Mascot Container (Exact match to candyArcadeComposition.ts) */}
                {(() => {
                  const isVisibleInPhase = !isScenarioMode
                    ? true
                    : scenarioPhase === "intro"
                      ? Boolean(showInIntro)
                      : (scenarioPhase as string) === "outro"
                        ? Boolean(showInOutro)
                        : showInQuestion !== false;

                  return (
                    <div
                      className={`candy-mascot-container mascot-stage anchor-${targetPosition} ${isDragging ? "is-dragging" : ""}`}
                      style={
                        {
                          zIndex: 25,
                          transformOrigin: "bottom center",
                          transform: `scale(${targetScale})`,
                          "--action-offset-x": `${nudgeX}px`,
                          "--action-offset-y": `${nudgeY}px`,
                          "--mascot-scale": targetScale,
                          pointerEvents: isVisibleInPhase ? "auto" : "none",
                          opacity: isVisibleInPhase ? 1 : showGuides ? 0.25 : 0,
                          transition: "opacity 0.2s ease",
                          cursor: isDragging ? "grabbing" : "grab",
                          userSelect: "none",
                        } as React.CSSProperties
                      }
                      onMouseDown={isVisibleInPhase ? handleMascotMouseDown : undefined}
                    >
                      {/* Bounding box guide when guides are active */}
                      {showGuides ? (
                        <div
                          className="mascot-1920-bounding-box"
                          style={{
                            transform: `translate(${nudgeX}px, ${nudgeY}px)`,
                          }}
                          aria-hidden="true"
                        >
                          <span className="bounding-coord-tag">
                            X: {nudgeX > 0 ? `+${nudgeX}` : nudgeX}px, Y: {nudgeY > 0 ? `+${nudgeY}` : nudgeY}px (
                            {Math.round(targetScale * 100)}%) {!isVisibleInPhase ? "[Ẩn trong phân cảnh này]" : ""}
                          </span>
                          <span className="bounding-handle handle-tl" />
                          <span className="bounding-handle handle-tr" />
                          <span className="bounding-handle handle-bl" />
                          <span className="bounding-handle handle-br" />
                        </div>
                      ) : null}

                      {/* Onion Skin Ghost Reference Layer (Idle Pose Comparison) */}
                      {onionSkinEnabled && editingMascot?.actions.idle?.sprite_url ? (
                        <div
                          className="candy-mascot-sprite onion-skin-layer"
                          style={
                            {
                              position: "absolute",
                              inset: 0,
                              backgroundImage: `url(${editingMascot.actions.idle.sprite_url})`,
                              opacity: onionSkinOpacity,
                              filter: "sepia(100%) hue-rotate(150deg) saturate(300%)",
                              transform: `translate(${nudgeX}px, ${nudgeY}px)`,
                              "--action-offset-x": `${nudgeX}px`,
                              "--action-offset-y": `${nudgeY}px`,
                              zIndex: 1,
                              pointerEvents: "none",
                            } as React.CSSProperties
                          }
                        />
                      ) : null}

                      {/* Active Mascot Sprite Render */}
                      {currentActionSprite?.sprite_url ? (
                        <div
                          className={`candy-mascot-sprite ${isPlaying ? `mascot-anim-${activePreviewAction}` : ""}`}
                          style={
                            {
                              backgroundImage: `url(${currentActionSprite.sprite_url})`,
                              transform: `translate(${nudgeX}px, ${nudgeY}px)`,
                              "--action-offset-x": `${nudgeX}px`,
                              "--action-offset-y": `${nudgeY}px`,
                              position: "relative",
                              zIndex: 2,
                              cursor: isDragging ? "grabbing" : "grab",
                              pointerEvents: isVisibleInPhase ? "auto" : "none",
                            } as React.CSSProperties
                          }
                          title={t("mascots.dragHint") || "Drag to reposition mascot"}
                        />
                      ) : editingMascot?.master_image_url ? (
                        <img
                          src={editingMascot.master_image_url}
                          alt={editingMascot.name}
                          className={isPlaying ? "mascot-anim-idle" : ""}
                          draggable={false}
                          onDragStart={(e) => e.preventDefault()}
                          style={
                            {
                              width: "220px",
                              height: "220px",
                              objectFit: "contain",
                              transform: `translate(${nudgeX}px, ${nudgeY}px)`,
                              "--action-offset-x": `${nudgeX}px`,
                              "--action-offset-y": `${nudgeY}px`,
                              position: "relative",
                              zIndex: 2,
                              cursor: isDragging ? "grabbing" : "grab",
                              pointerEvents: isVisibleInPhase ? "auto" : "none",
                            } as React.CSSProperties
                          }
                          title={t("mascots.dragHint") || "Drag to reposition mascot"}
                        />
                      ) : (
                        <div
                          className="stage-mascot-placeholder"
                          style={
                            {
                              width: "220px",
                              height: "220px",
                              display: "grid",
                              placeItems: "center",
                              transform: `translate(${nudgeX}px, ${nudgeY}px)`,
                              "--action-offset-x": `${nudgeX}px`,
                              "--action-offset-y": `${nudgeY}px`,
                              cursor: isDragging ? "grabbing" : "grab",
                              pointerEvents: isVisibleInPhase ? "auto" : "none",
                            } as React.CSSProperties
                          }
                        >
                          <Smiley size={80} style={{ color: genColor }} />
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Drag helper hint strip */}
            <div className="stage-drag-helper-strip">
              <Crosshair size={14} weight="bold" style={{ color: "var(--accent)" }} />
              <span>{t("mascots.dragHint") || "Drag mascot directly on stage to reposition"}</span>
              <span className="coord-readout-badge">
                X: <strong>{nudgeX > 0 ? `+${nudgeX}` : nudgeX}px</strong> &nbsp;|&nbsp; Y:{" "}
                <strong>{nudgeY > 0 ? `+${nudgeY}` : nudgeY}px</strong> &nbsp;|&nbsp; Scale:{" "}
                <strong>{Math.round(targetScale * 100)}%</strong>
              </span>
            </div>
          </div>

          {/* Integrated Director Rehearsal Playbar */}
          <div className="director-rehearsal-playbar">
            <div className="rehearsal-top-row">
              <div className="rehearsal-controls-left">
                <button
                  type="button"
                  className={isScenarioMode ? "rehearsal-btn is-playing" : "rehearsal-btn"}
                  onClick={() => setIsScenarioMode(!isScenarioMode)}
                >
                  {isScenarioMode ? <Stop size={15} weight="fill" /> : <Play size={15} weight="fill" />}
                  <span>{isScenarioMode ? t("mascots.stopScenarioBtn") : t("mascots.playTimelineBtn")}</span>
                </button>

                {/* Reaction Toggle: Celebrate vs Oops */}
                <div className="reaction-style-toggle-group">
                  <button
                    type="button"
                    className={`pos-toggle-btn ${reactionStyle === "celebrate" ? "is-selected" : ""}`}
                    onClick={() => {
                      setReactionStyle("celebrate");
                      if (scenarioPhase === "reveal") setActivePreviewAction("celebrate");
                    }}
                    title={t("mascots.celebrateReactionTooltip")}
                  >
                    <span>🎉</span> {t("mascots.celebrateReactionBtn")}
                  </button>
                  <button
                    type="button"
                    className={`pos-toggle-btn ${reactionStyle === "oops" ? "is-selected" : ""}`}
                    onClick={() => {
                      setReactionStyle("oops");
                      if (scenarioPhase === "reveal") setActivePreviewAction("oops");
                    }}
                    title={t("mascots.oopsReactionTooltip")}
                  >
                    <span>😅</span> {t("mascots.oopsReactionBtn")}
                  </button>
                </div>
              </div>

              <div className="rehearsal-meta-right">
                <span className="rehearsal-timecode-badge">⏱ {scrubberTime.toFixed(1)}s / 16.0s</span>
              </div>
            </div>

            {/* Interactive Timeline Scrubber with 4 Phases */}
            <div className="director-scrubber-wrap">
              <div className="director-scrubber-track">
                <div
                  className={`scrubber-segment seg-intro ${scenarioPhase === "intro" ? "is-current" : ""}`}
                  style={{ width: "12.5%" }}
                  onClick={() => {
                    setIsScenarioMode(false);
                    onApplyTimelineTime(1.0);
                  }}
                  title="[0s - 2s] Intro (Pose: wave)"
                >
                  {t("mascots.timelineIntro")}
                </div>
                <div
                  className={`scrubber-segment seg-thinking ${
                    scenarioPhase === "question" || scenarioPhase === "thinking" ? "is-current" : ""
                  }`}
                  style={{ width: "43.75%" }}
                  onClick={() => {
                    setIsScenarioMode(false);
                    onApplyTimelineTime(5.5);
                  }}
                  title="[2s - 9s] Question & 5s Countdown (Pose: thinking)"
                >
                  {t("mascots.timelineThinking")}
                </div>
                <div
                  className={`scrubber-segment seg-reveal ${scenarioPhase === "reveal" ? "is-current" : ""}`}
                  style={{ width: "18.75%" }}
                  onClick={() => {
                    setIsScenarioMode(false);
                    onApplyTimelineTime(10.5);
                  }}
                  title="[9s - 12s] Reveal (Pose: celebrate/oops)"
                >
                  {reactionStyle === "celebrate" ? t("mascots.timelineReveal") : t("mascots.timelineOops")}
                </div>
                <div
                  className={`scrubber-segment seg-explain ${scenarioPhase === "explain" ? "is-current" : ""}`}
                  style={{ width: "25%" }}
                  onClick={() => {
                    setIsScenarioMode(false);
                    onApplyTimelineTime(14.0);
                  }}
                  title="[12s - 16s] Fact Card (Pose: celebrate)"
                >
                  {t("mascots.timelineExplain")}
                </div>
              </div>

              <input
                type="range"
                min={0}
                max={16}
                step={0.1}
                value={scrubberTime}
                className="director-scrubber-slider"
                onChange={(e) => {
                  setIsScenarioMode(false);
                  onApplyTimelineTime(Number(e.target.value));
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Right Column: Precision Coordinate & Scale Control Panel */}
      <div className="stage-config-col">
        <div className="wizard-card studio-config-card">
          {/* Tab Navigation Header */}
          <div className="studio-tabs-bar" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeConfigTab === "calibration"}
              className={`studio-tab-btn ${activeConfigTab === "calibration" ? "is-active" : ""}`}
              onClick={() => setActiveConfigTab("calibration")}
            >
              <Sliders size={16} weight="bold" />
              <span>{t("mascots.tabCalibration")}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeConfigTab === "channels"}
              className={`studio-tab-btn ${activeConfigTab === "channels" ? "is-active" : ""}`}
              onClick={() => setActiveConfigTab("channels")}
            >
              <Broadcast size={16} weight="bold" />
              <span>{t("mascots.tabChannels")}</span>
              <span className="tab-counter-pill">{assignedChannels.length}</span>
            </button>
          </div>

          {/* TAB 1: CALIBRATION & PRECISION POSITIONING */}
          {activeConfigTab === "calibration" ? (
            <div className="studio-tab-body">
              {/* Active Pose Selector */}
              <div className="config-section">
                <label className="config-section-label">
                  {t("mascots.activePoseLabel")}{" "}
                  <strong style={{ color: "var(--accent)" }}>{getLocalizedActionMeta(activePreviewAction, t).label.split(" ")[0]}</strong>
                </label>
                <div className="pose-selector-grid">
                  {ALL_MASCOT_ACTIONS.map((action) => {
                    const meta = getLocalizedActionMeta(action, t);
                    const hasSprite = Boolean(editingMascot?.actions[action]?.sprite_url);
                    const isSelected = activePreviewAction === action;

                    return (
                      <button
                        key={action}
                        type="button"
                        className={`pose-selector-chip ${isSelected ? "is-selected" : ""} ${hasSprite ? "is-ready" : "is-missing"}`}
                        onClick={() => {
                          setIsScenarioMode(false);
                          setActivePreviewAction(action);
                        }}
                      >
                        <span className="pose-icon">{meta.icon}</span>
                        <span className="pose-name">{meta.label.split(" ")[0]}</span>
                        {hasSprite ? (
                          <span className="pose-dot ready" title="Ready" />
                        ) : (
                          <span className="pose-dot missing" title="Missing Sprite" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Position & Visibility Section */}
              <div
                className="config-section position-visibility-card"
                style={{ background: "var(--surface-hover)", padding: "12px", borderRadius: "8px", border: "1px solid var(--line)" }}
              >
                <div style={{ marginBottom: "10px" }}>
                  <label className="config-section-label" style={{ marginBottom: "6px" }}>
                    {t("mascots.positionLabel") || "Vị trí Mascot"}
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                    <button
                      type="button"
                      className={`pos-toggle-btn ${targetPosition === "bottom_left" ? "is-selected" : ""}`}
                      onClick={() => setTargetPosition("bottom_left")}
                      style={{
                        padding: "6px 10px",
                        fontSize: "12px",
                        borderRadius: "6px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                      }}
                    >
                      <span>👈</span> {t("mascots.posBottomLeft") || "Góc trái"}
                    </button>
                    <button
                      type="button"
                      className={`pos-toggle-btn ${targetPosition === "bottom_right" ? "is-selected" : ""}`}
                      onClick={() => setTargetPosition("bottom_right")}
                      style={{
                        padding: "6px 10px",
                        fontSize: "12px",
                        borderRadius: "6px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                      }}
                    >
                      <span>👉</span> {t("mascots.posBottomRight") || "Góc phải"}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="config-section-label" style={{ marginBottom: "6px" }}>
                    {t("mascots.visibilityLabel") || "Hiển thị theo phân cảnh"}
                  </label>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                      <input type="checkbox" checked={showInIntro} onChange={(e) => setShowInIntro?.(e.target.checked)} />
                      <span>🎬 {t("mascots.showInIntro") || "Intro mở đầu (Mặc định: Tắt)"}</span>
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                      <input type="checkbox" checked={showInQuestion} onChange={(e) => setShowInQuestion?.(e.target.checked)} />
                      <span>❓ {t("mascots.showInQuestion") || "Câu hỏi & Reveal đáp án (Khuyên dùng)"}</span>
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                      <input type="checkbox" checked={showInOutro} onChange={(e) => setShowInOutro?.(e.target.checked)} />
                      <span>🏁 {t("mascots.showInOutro") || "Outro kết thúc (Mặc định: Tắt)"}</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Precise Scale Control (Steppers + Slider + Direct Input) */}
              <div className="config-section precision-control-card">
                <div className="precision-header-row">
                  <label className="config-section-label" style={{ margin: 0 }}>
                    {t("mascots.scaleLabel", { scale: targetScale.toFixed(2) })}
                  </label>
                  <div className="precision-badge-group">
                    <span className="scale-value-badge">{Math.round(targetScale * 100)}%</span>
                    <input
                      type="number"
                      min={30}
                      max={400}
                      step={1}
                      value={Math.round(targetScale * 100)}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (!isNaN(val)) setTargetScale(Math.max(0.3, Math.min(4.0, val / 100)));
                      }}
                      className="precision-number-input"
                      title="Direct percentage input"
                    />
                    <span className="unit-label">%</span>
                  </div>
                </div>

                {/* Scale Stepper Button Group */}
                <div className="stepper-action-row">
                  <button
                    type="button"
                    className="precision-step-btn"
                    onClick={() => setTargetScale(Math.max(0.3, Math.round((targetScale - 0.25) * 100) / 100))}
                    title="-25%"
                  >
                    -25%
                  </button>
                  <button
                    type="button"
                    className="precision-step-btn"
                    onClick={() => setTargetScale(Math.max(0.3, Math.round((targetScale - 0.1) * 100) / 100))}
                    title="-10%"
                  >
                    -10%
                  </button>
                  <button
                    type="button"
                    className="precision-step-btn"
                    onClick={() => setTargetScale(Math.max(0.3, Math.round((targetScale - 0.01) * 100) / 100))}
                    title="-1%"
                  >
                    -1%
                  </button>
                  <button
                    type="button"
                    className="precision-step-btn"
                    onClick={() => setTargetScale(Math.min(4.0, Math.round((targetScale + 0.01) * 100) / 100))}
                    title="+1%"
                  >
                    +1%
                  </button>
                  <button
                    type="button"
                    className="precision-step-btn"
                    onClick={() => setTargetScale(Math.min(4.0, Math.round((targetScale + 0.1) * 100) / 100))}
                    title="+10%"
                  >
                    +10%
                  </button>
                  <button
                    type="button"
                    className="precision-step-btn"
                    onClick={() => setTargetScale(Math.min(4.0, Math.round((targetScale + 0.25) * 100) / 100))}
                    title="+25%"
                  >
                    +25%
                  </button>
                </div>

                {/* Scale Slider */}
                <input
                  type="range"
                  className="scale-range-slider"
                  min={0.3}
                  max={3.0}
                  step={0.01}
                  value={targetScale}
                  onChange={(e) => setTargetScale(Number(e.target.value))}
                />

                {/* Preset Chips */}
                <div className="scale-presets-row" style={{ marginTop: "6px" }}>
                  <button
                    type="button"
                    className={`scale-preset-chip ${Math.abs(targetScale - 0.75) < 0.02 ? "is-active" : ""}`}
                    onClick={() => setTargetScale(0.75)}
                  >
                    75%
                  </button>
                  <button
                    type="button"
                    className={`scale-preset-chip ${Math.abs(targetScale - 1.0) < 0.02 ? "is-active" : ""}`}
                    onClick={() => setTargetScale(1.0)}
                  >
                    100%
                  </button>
                  <button
                    type="button"
                    className={`scale-preset-chip ${Math.abs(targetScale - 1.25) < 0.02 ? "is-active" : ""}`}
                    onClick={() => setTargetScale(1.25)}
                  >
                    125%
                  </button>
                  <button
                    type="button"
                    className={`scale-preset-chip ${Math.abs(targetScale - 1.5) < 0.02 ? "is-active" : ""}`}
                    onClick={() => setTargetScale(1.5)}
                  >
                    150%
                  </button>
                  <button
                    type="button"
                    className={`scale-preset-chip ${Math.abs(targetScale - 2.0) < 0.02 ? "is-active" : ""}`}
                    onClick={() => setTargetScale(2.0)}
                  >
                    200%
                  </button>
                </div>
              </div>

              {/* Pixel Precision X & Y Nudge Controls */}
              <div className="config-section nudge-box">
                <div className="nudge-header-row">
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Crosshair size={15} weight="bold" style={{ color: "var(--accent)" }} />
                    <label className="config-section-label" style={{ margin: 0 }}>
                      {t("mascots.nudgeFineTuneLabel")}
                    </label>
                  </div>
                  <button
                    type="button"
                    className="quiet-button compact"
                    onClick={() => {
                      setNudgeX(0);
                      setNudgeY(0);
                    }}
                    title={t("mascots.resetOffsetTooltip")}
                  >
                    <ArrowClockwise size={13} />
                    <span>{t("mascots.resetBtn")}</span>
                  </button>
                </div>

                {/* X Axis Stepper & Slider */}
                <div className="precision-axis-block">
                  <div className="precision-axis-header">
                    <span className="nudge-axis-tag x-tag">
                      X: <strong>{nudgeX > 0 ? `+${nudgeX}` : nudgeX}px</strong>
                    </span>
                    <div className="direct-px-input-wrap">
                      <input
                        type="number"
                        min={-2000}
                        max={2000}
                        value={nudgeX}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          if (!isNaN(val)) setNudgeX(Math.max(-2000, Math.min(2000, val)));
                        }}
                        className="precision-number-input"
                      />
                      <span className="unit-label">px</span>
                      <button type="button" className="quick-zero-btn" onClick={() => setNudgeX(0)} title="Reset X to 0">
                        0
                      </button>
                    </div>
                  </div>

                  <div className="stepper-action-row">
                    <button
                      type="button"
                      className="precision-step-btn"
                      onClick={() => setNudgeX((prev) => Math.max(-2000, prev - 100))}
                      title="-100px"
                    >
                      -100
                    </button>
                    <button
                      type="button"
                      className="precision-step-btn"
                      onClick={() => setNudgeX((prev) => Math.max(-2000, prev - 20))}
                      title="-20px"
                    >
                      -20
                    </button>
                    <button
                      type="button"
                      className="precision-step-btn"
                      onClick={() => setNudgeX((prev) => Math.max(-2000, prev - 5))}
                      title="-5px"
                    >
                      -5
                    </button>
                    <button
                      type="button"
                      className="precision-step-btn"
                      onClick={() => setNudgeX((prev) => Math.min(2000, prev + 5))}
                      title="+5px"
                    >
                      +5
                    </button>
                    <button
                      type="button"
                      className="precision-step-btn"
                      onClick={() => setNudgeX((prev) => Math.min(2000, prev + 20))}
                      title="+20px"
                    >
                      +20
                    </button>
                    <button
                      type="button"
                      className="precision-step-btn"
                      onClick={() => setNudgeX((prev) => Math.min(2000, prev + 100))}
                      title="+100px"
                    >
                      +100
                    </button>
                  </div>

                  <input
                    type="range"
                    min={-500}
                    max={1800}
                    value={nudgeX}
                    onChange={(e) => setNudgeX(Number(e.target.value))}
                    className="nudge-slider"
                  />
                </div>

                {/* Y Axis Stepper & Slider */}
                <div className="precision-axis-block" style={{ marginTop: "12px" }}>
                  <div className="precision-axis-header">
                    <span className="nudge-axis-tag y-tag">
                      Y: <strong>{nudgeY > 0 ? `+${nudgeY}` : nudgeY}px</strong>
                    </span>
                    <div className="direct-px-input-wrap">
                      <input
                        type="number"
                        min={-1500}
                        max={1500}
                        value={nudgeY}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          if (!isNaN(val)) setNudgeY(Math.max(-1500, Math.min(1500, val)));
                        }}
                        className="precision-number-input"
                      />
                      <span className="unit-label">px</span>
                      <button type="button" className="quick-zero-btn" onClick={() => setNudgeY(0)} title="Reset Y to 0">
                        0
                      </button>
                    </div>
                  </div>

                  <div className="stepper-action-row">
                    <button
                      type="button"
                      className="precision-step-btn"
                      onClick={() => setNudgeY((prev) => Math.max(-1500, prev - 100))}
                      title="-100px"
                    >
                      -100
                    </button>
                    <button
                      type="button"
                      className="precision-step-btn"
                      onClick={() => setNudgeY((prev) => Math.max(-1500, prev - 20))}
                      title="-20px"
                    >
                      -20
                    </button>
                    <button
                      type="button"
                      className="precision-step-btn"
                      onClick={() => setNudgeY((prev) => Math.max(-1500, prev - 5))}
                      title="-5px"
                    >
                      -5
                    </button>
                    <button
                      type="button"
                      className="precision-step-btn"
                      onClick={() => setNudgeY((prev) => Math.min(1500, prev + 5))}
                      title="+5px"
                    >
                      +5
                    </button>
                    <button
                      type="button"
                      className="precision-step-btn"
                      onClick={() => setNudgeY((prev) => Math.min(1500, prev + 20))}
                      title="+20px"
                    >
                      +20
                    </button>
                    <button
                      type="button"
                      className="precision-step-btn"
                      onClick={() => setNudgeY((prev) => Math.min(1500, prev + 100))}
                      title="+100px"
                    >
                      +100
                    </button>
                  </div>

                  <input
                    type="range"
                    min={-1000}
                    max={600}
                    value={nudgeY}
                    onChange={(e) => setNudgeY(Number(e.target.value))}
                    className="nudge-slider"
                  />
                </div>

                {/* Save Offset for active pose */}
                <button
                  type="button"
                  className="primary-button compact"
                  style={{ width: "100%", justifyContent: "center", marginTop: "14px" }}
                  disabled={calibrating || isCurrentActionOffsetClean}
                  onClick={onSaveCalibration}
                >
                  {calibrating ? <CircleNotch className="spin" size={14} /> : <FloppyDisk size={14} />}
                  <span>
                    {calibrating
                      ? t("mascots.savingCalibrationBtn")
                      : `${t("mascots.saveCalibrationBtn")} (${getLocalizedActionMeta(activePreviewAction, t).label.split(" ")[0]})`}
                  </span>
                </button>
              </div>

              {/* Visual Aids: Guides & Ghost Onion Skin */}
              <div className="config-section visual-aids-box">
                <div className="visual-aids-toggles">
                  <label className="filter-chip" style={{ cursor: "pointer" }}>
                    <input type="checkbox" checked={showGuides} onChange={(e) => setShowGuides(e.target.checked)} />
                    <span>{t("mascots.guidesToggle")}</span>
                  </label>
                  <label className="filter-chip" style={{ cursor: "pointer" }}>
                    <input type="checkbox" checked={onionSkinEnabled} onChange={(e) => setOnionSkinEnabled(e.target.checked)} />
                    <span>{t("mascots.onionSkinToggle")}</span>
                  </label>
                </div>

                {onionSkinEnabled ? (
                  <div className="onion-slider-row" style={{ marginTop: "10px" }}>
                    <small style={{ color: "var(--muted)", whiteSpace: "nowrap" }}>
                      {t("mascots.onionOpacityLabel", { percent: Math.round(onionSkinOpacity * 100) })}
                    </small>
                    <input
                      type="range"
                      min={0.15}
                      max={0.7}
                      step={0.05}
                      value={onionSkinOpacity}
                      onChange={(e) => setOnionSkinOpacity(Number(e.target.value))}
                      style={{ width: "120px" }}
                    />
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {/* TAB 2: BROADCAST CHANNEL DEPLOYMENT */}
          {activeConfigTab === "channels" ? (
            <div className="studio-tab-body">
              {/* Search Bar */}
              <div className="channel-search-box">
                <MagnifyingGlass size={16} className="search-icon" />
                <input
                  type="text"
                  placeholder={t("mascots.searchChannelsPlaceholder")}
                  value={channelSearchQuery}
                  onChange={(e) => setChannelSearchQuery(e.target.value)}
                />
                {channelSearchQuery ? (
                  <button type="button" className="icon-button compact clear-search-btn" onClick={() => setChannelSearchQuery("")}>
                    <X size={13} />
                  </button>
                ) : null}
              </div>

              {/* Filter Tabs */}
              <div className="channel-filter-tabs">
                <button
                  type="button"
                  className={`channel-filter-tab ${channelFilterTab === "all" ? "is-active" : ""}`}
                  onClick={() => setChannelFilterTab("all")}
                >
                  {t("mascots.filterAll")} <span className="tab-badge">{countAll}</span>
                </button>
                <button
                  type="button"
                  className={`channel-filter-tab ${channelFilterTab === "selected" ? "is-active" : ""}`}
                  onClick={() => setChannelFilterTab("selected")}
                >
                  {t("mascots.filterSelected", { count: countSelected })}
                </button>
                <button
                  type="button"
                  className={`channel-filter-tab ${channelFilterTab === "unassigned" ? "is-active" : ""}`}
                  onClick={() => setChannelFilterTab("unassigned")}
                >
                  {t("mascots.filterUnassigned", { count: countUnassigned })}
                </button>
                {countOther > 0 ? (
                  <button
                    type="button"
                    className={`channel-filter-tab ${channelFilterTab === "other" ? "is-active" : ""}`}
                    onClick={() => setChannelFilterTab("other")}
                  >
                    {t("mascots.filterOtherMascots", { count: countOther })}
                  </button>
                ) : null}
              </div>

              {/* Batch Selection Action Bar */}
              <div className="channel-batch-bar">
                <span className="channel-count-text">
                  {t("mascots.selectedChannelsSummary", {
                    count: assignedChannels.length,
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
                    disabled={assignedChannels.length === 0}
                  >
                    {t("mascots.deselectAllBtn")}
                  </button>
                </div>
              </div>

              {/* Channels List */}
              <div className="channels-card-list" style={{ maxHeight: "360px" }}>
                {filteredChannels.length === 0 ? (
                  <div className="channels-empty-state">
                    <Broadcast size={32} weight="duotone" />
                    <p>{channels.length === 0 ? t("mascots.noChannelsAvailable") : t("mascots.noChannelsFound")}</p>
                  </div>
                ) : (
                  filteredChannels.map((channel) => {
                    const isChecked = assignedChannels.includes(channel.channel_id);
                    const isCurrentlyThis = channel.mascot_id === editingMascot?.id;
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
                        <div className="channel-select-checkbox">
                          {isChecked ? (
                            <CheckCircle size={19} weight="fill" className="check-icon checked" />
                          ) : (
                            <Circle size={19} weight="regular" className="check-icon unchecked" />
                          )}
                        </div>

                        <div className="channel-select-info">
                          <div className="channel-select-title-row">
                            <strong className="channel-select-name">{channel.display_name}</strong>
                            <span className="channel-lang-chip">{langDisplay}</span>
                          </div>

                          <div className="channel-select-meta-row">
                            <span className="channel-id-code">{channel.channel_id}</span>
                            {isCurrentlyThis ? (
                              <span className="mascot-state-badge current">
                                <span className="pulse-dot green" />
                                {t("mascots.channelItemCurrentlyThis")}
                              </span>
                            ) : otherMascotInfo ? (
                              <span className="mascot-state-badge other" title={`Current mascot: ${otherMascotInfo.name}`}>
                                <Warning size={11} weight="bold" />
                                {t("mascots.currentlyAssignedToOther", { name: otherMascotInfo.name })}
                              </span>
                            ) : (
                              <span className="mascot-state-badge unassigned">{t("mascots.channelItemUnassigned")}</span>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            </div>
          ) : null}

          {/* Step 3 Footer Action Row */}
          <div className="wizard-action-row studio-footer-actions">
            <button type="button" className="quiet-button" onClick={onBackStep}>
              <ArrowLeft size={15} />
              <span>{t("mascots.backStatesBtn")}</span>
            </button>
            <button
              type="button"
              className="primary-button"
              style={{ flex: 1, justifyContent: "center" }}
              disabled={busyAction === "assign"}
              onClick={onApplyToChannels}
            >
              {busyAction === "assign" ? <CircleNotch className="spin" size={16} /> : <FloppyDisk size={16} />}
              <span>{busyAction === "assign" ? t("mascots.savingAndApplyingBtn") : t("mascots.saveAndApplyChannelsBtn")}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
