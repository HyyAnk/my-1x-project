import { useMemo } from "react";
import {
  ArrowClockwise,
  ArrowLeft,
  Broadcast,
  CheckCircle,
  Circle,
  CircleNotch,
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
import {
  ALL_MASCOT_ACTIONS,
  type Channel,
  type MascotActionType,
  type MascotProfile,
} from "@studio/shared";
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
  const countUnassigned = useMemo(
    () => channels.filter((c) => !c.mascot_id).length,
    [channels]
  );
  const countOther = useMemo(
    () => channels.filter((c) => Boolean(c.mascot_id && c.mascot_id !== editingMascot?.id)).length,
    [channels, editingMascot?.id]
  );

  // Filtered channel list
  const filteredChannels = useMemo(() => {
    return channels.filter((ch) => {
      // 1. Search Query Filter
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

      // 2. Tab Filter
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
    setAssignedChannels((prev) =>
      prev.includes(channelId) ? prev.filter((id) => id !== channelId) : [...prev, channelId]
    );
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

  const isCurrentActionOffsetClean =
    nudgeX === (currentActionSprite?.offset_x || 0) &&
    nudgeY === (currentActionSprite?.offset_y || 0);

  return (
    <div className="wizard-step-content step-live-studio-grid">
      {/* 1. Left Column: Studio Stage Monitor & Interactive Rehearsal */}
      <div className="live-player-col">
        <div className="wizard-card studio-monitor-card">
          {/* Monitor Top Control Header */}
          <div className="studio-monitor-header">
            <div className="monitor-title-group">
              <span className="live-status-pill">
                <span className="live-pulse-dot" />
                LIVE STAGE
              </span>
              <h3>{t("mascots.stageTheaterTitle")}</h3>
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

          {/* Stage Simulator Screen Box */}
          <div className="stage-screen-outer-wrapper">
            <div
              className={`stage-simulator-screen aspect-${aspectRatio.replace(":", "-")} ${
                stagePreviewMode === "video_stage" ? "is-video-bg" : "is-grid-bg"
              }`}
            >
              {/* Simulated Quiz UI Layers (Video Stage Mode) */}
              {stagePreviewMode === "video_stage" ? (
                scenarioPhase === "intro" ? (
                  <div className="sim-intro-view">
                    <span className="sim-intro-badge">{t("mascots.simIntroBadge")}</span>
                    <h2 className="sim-intro-title">{t("mascots.simIntroTitle")}</h2>
                    <p className="sim-intro-sub">{t("mascots.simIntroSub")}</p>
                  </div>
                ) : scenarioPhase === "explain" ? (
                  <div className="simulated-quiz-ui">
                    <div className="sim-wood-sign">Q1</div>
                    <div className="sim-question-card">{t("mascots.simQuestionTitle")}</div>
                    <div className="sim-fact-view">
                      <span className="sim-fact-label">{t("mascots.simFactLabel")}</span>
                      <p className="sim-fact-text">{t("mascots.simFactText")}</p>
                    </div>
                  </div>
                ) : (
                  <div className="simulated-quiz-ui">
                    <div className="sim-wood-sign">Q1</div>
                    <div className="sim-question-card">{t("mascots.simQuestionTitle")}</div>
                    <div className="sim-hero-box">🖼️ HERO (Cheetah)</div>
                    <div className="sim-choices-box">
                      <div className={`sim-choice ${scenarioPhase === "reveal" ? "is-dimmed" : ""}`}>
                        {t("mascots.simChoiceA")}
                      </div>
                      <div className={`sim-choice ${scenarioPhase === "reveal" ? "is-correct" : ""}`}>
                        {scenarioPhase === "reveal" ? `✓ ${t("mascots.simChoiceB")}` : t("mascots.simChoiceB")}
                      </div>
                      <div className={`sim-choice ${scenarioPhase === "reveal" ? "is-dimmed" : ""}`}>
                        {t("mascots.simChoiceC")}
                      </div>
                    </div>
                    <div className="sim-thinking-bar">
                      <div
                        className="sim-bar-progress"
                        style={{
                          width: scenarioPhase === "thinking" ? `${(scenarioCountdown / 5) * 100}%` : "100%",
                          transition: "width 1s linear",
                        }}
                      />
                      <span
                        className="sim-star-marker"
                        style={{
                          left: scenarioPhase === "thinking" ? `${(scenarioCountdown / 5) * 95}%` : "95%",
                          transition: "left 1s linear",
                        }}
                      >
                        ★ {scenarioPhase === "thinking" ? scenarioCountdown : 5}
                      </span>
                    </div>
                  </div>
                )
              ) : null}

              {/* Dynamic Alignment Guides Overlay */}
              {showGuides ? (
                <div className="alignment-guides-overlay" aria-hidden="true">
                  <div className="guide-center-crosshair-h" />
                  <div className="guide-center-crosshair-v" />
                  <div className="guide-ground-baseline" />
                  <div className={`guide-bounds-box pos-${targetPosition}`} />
                </div>
              ) : null}

              {/* Animated Mascot Character Anchor */}
              <div
                className={`stage-mascot-anchor anchor-${targetPosition}`}
                style={{
                  transform: `scale(${targetScale}) scaleX(${flipHorizontal ? -1 : 1})`,
                  transformOrigin: targetPosition === "bottom_left" ? "bottom left" : "bottom right",
                }}
              >
                {/* Onion Skin Ghost Reference Layer (Idle Pose Comparison) */}
                {onionSkinEnabled && editingMascot?.actions.idle?.sprite_url ? (
                  <div
                    className="stage-mascot-sprite-render onion-skin-layer"
                    style={{
                      width: "220px",
                      height: "220px",
                      backgroundImage: `url(${editingMascot.actions.idle.sprite_url})`,
                      backgroundSize: "contain",
                      backgroundPosition: "center bottom",
                      backgroundRepeat: "no-repeat",
                      opacity: onionSkinOpacity,
                      filter: "sepia(100%) hue-rotate(150deg) saturate(300%)",
                      position: "absolute",
                      inset: 0,
                      zIndex: 1,
                      pointerEvents: "none",
                    }}
                  />
                ) : null}

                {/* Main Active Sprite Render with CSS Micro-Motion */}
                {currentActionSprite?.sprite_url ? (
                  <div
                    className={`stage-mascot-sprite-render ${
                      isPlaying ? `mascot-anim-${activePreviewAction}` : ""
                    }`}
                    style={{
                      width: "220px",
                      height: "220px",
                      backgroundImage: `url(${currentActionSprite.sprite_url})`,
                      backgroundSize: "contain",
                      backgroundPosition: "center bottom",
                      backgroundRepeat: "no-repeat",
                      transform: `translate(${nudgeX}px, ${nudgeY}px)`,
                      position: "relative",
                      zIndex: 2,
                    }}
                  />
                ) : editingMascot?.master_image_url ? (
                  <img
                    src={editingMascot.master_image_url}
                    alt={editingMascot.name}
                    className={isPlaying ? "mascot-anim-idle" : ""}
                    style={{
                      width: "200px",
                      height: "200px",
                      objectFit: "contain",
                      transform: `translate(${nudgeX}px, ${nudgeY}px)`,
                      position: "relative",
                      zIndex: 2,
                    }}
                  />
                ) : (
                  <div className="stage-mascot-placeholder">
                    <Smiley size={64} style={{ color: genColor }} />
                  </div>
                )}
              </div>
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
                <span className="rehearsal-timecode-badge">
                  ⏱ {scrubberTime.toFixed(1)}s / 16.0s
                </span>
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

      {/* 2. Right Column: Dual-Tab Pro Control Panel */}
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

          {/* TAB 1: CALIBRATION & SPATIAL ALIGNMENT */}
          {activeConfigTab === "calibration" ? (
            <div className="studio-tab-body">
              {/* Active Pose Selector */}
              <div className="config-section">
                <label className="config-section-label">
                  {t("mascots.activePoseLabel")}{" "}
                  <strong style={{ color: "var(--accent)" }}>
                    {getLocalizedActionMeta(activePreviewAction, t).label.split(" ")[0]}
                  </strong>
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
                        className={`pose-selector-chip ${isSelected ? "is-selected" : ""} ${
                          hasSprite ? "is-ready" : "is-missing"
                        }`}
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

              {/* Stage Position, Scale & Flip */}
              <div className="config-section">
                <label className="config-section-label">{t("mascots.stagePositionLabel")}</label>
                <div className="position-toggle-row">
                  <button
                    type="button"
                    className={`pos-toggle-btn ${targetPosition === "bottom_left" ? "is-selected" : ""}`}
                    onClick={() => setTargetPosition("bottom_left")}
                  >
                    {t("mascots.bottomLeftOption")}
                  </button>
                  <button
                    type="button"
                    className={`pos-toggle-btn ${targetPosition === "bottom_right" ? "is-selected" : ""}`}
                    onClick={() => setTargetPosition("bottom_right")}
                  >
                    {t("mascots.bottomRightOption")}
                  </button>
                </div>

                {/* Scale Control with Range Slider & Presets */}
                <div className="stage-control-card" style={{ marginTop: "12px" }}>
                  <div className="stage-scale-header">
                    <label className="stage-control-label">
                      {t("mascots.scaleLabel", { scale: targetScale.toFixed(2) })}
                    </label>
                    <span className="scale-value-badge">{Math.round(targetScale * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    className="scale-range-slider"
                    min={0.7}
                    max={1.3}
                    step={0.05}
                    value={targetScale}
                    onChange={(e) => setTargetScale(Number(e.target.value))}
                  />
                  <div className="scale-presets-row">
                    <button
                      type="button"
                      className={`scale-preset-chip ${Math.abs(targetScale - 0.85) < 0.01 ? "is-active" : ""}`}
                      onClick={() => setTargetScale(0.85)}
                    >
                      {t("mascots.presetCompact")} (85%)
                    </button>
                    <button
                      type="button"
                      className={`scale-preset-chip ${Math.abs(targetScale - 1.0) < 0.01 ? "is-active" : ""}`}
                      onClick={() => setTargetScale(1.0)}
                    >
                      {t("mascots.presetStandard")} (100%)
                    </button>
                    <button
                      type="button"
                      className={`scale-preset-chip ${Math.abs(targetScale - 1.15) < 0.01 ? "is-active" : ""}`}
                      onClick={() => setTargetScale(1.15)}
                    >
                      {t("mascots.presetLarge")} (115%)
                    </button>
                  </div>
                </div>

                {/* Flip Horizontal Toggle */}
                <div className="flip-toggle-row" style={{ marginTop: "10px" }}>
                  <label className="custom-checkbox-row" style={{ cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={flipHorizontal}
                      onChange={(e) => setFlipHorizontal(e.target.checked)}
                    />
                    <span>{t("mascots.flipHorizontalLabel")}</span>
                  </label>
                  <small style={{ color: "var(--muted)" }}>{t("mascots.flipHorizontalTooltip")}</small>
                </div>
              </div>

              {/* Pixel Precision Nudge Controls */}
              <div className="config-section nudge-box">
                <div className="nudge-header-row">
                  <label className="config-section-label" style={{ margin: 0 }}>
                    {t("mascots.nudgeFineTuneLabel")}
                  </label>
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

                {/* X Axis Stepper */}
                <div className="nudge-axis-row">
                  <span className="nudge-axis-tag">X: {nudgeX > 0 ? `+${nudgeX}` : nudgeX}px</span>
                  <div className="nudge-stepper-group">
                    <button
                      type="button"
                      className="stepper-btn"
                      onClick={() => setNudgeX((prev) => Math.max(-40, prev - 5))}
                      title="-5px"
                    >
                      -5
                    </button>
                    <button
                      type="button"
                      className="stepper-btn"
                      onClick={() => setNudgeX((prev) => Math.max(-40, prev - 1))}
                      title="-1px"
                    >
                      <Minus size={12} />
                    </button>
                    <input
                      type="range"
                      min={-40}
                      max={40}
                      value={nudgeX}
                      onChange={(e) => setNudgeX(Number(e.target.value))}
                      className="nudge-slider"
                    />
                    <button
                      type="button"
                      className="stepper-btn"
                      onClick={() => setNudgeX((prev) => Math.min(40, prev + 1))}
                      title="+1px"
                    >
                      <Plus size={12} />
                    </button>
                    <button
                      type="button"
                      className="stepper-btn"
                      onClick={() => setNudgeX((prev) => Math.min(40, prev + 5))}
                      title="+5px"
                    >
                      +5
                    </button>
                  </div>
                </div>

                {/* Y Axis Stepper */}
                <div className="nudge-axis-row">
                  <span className="nudge-axis-tag">Y: {nudgeY > 0 ? `+${nudgeY}` : nudgeY}px</span>
                  <div className="nudge-stepper-group">
                    <button
                      type="button"
                      className="stepper-btn"
                      onClick={() => setNudgeY((prev) => Math.max(-40, prev - 5))}
                      title="-5px"
                    >
                      -5
                    </button>
                    <button
                      type="button"
                      className="stepper-btn"
                      onClick={() => setNudgeY((prev) => Math.max(-40, prev - 1))}
                      title="-1px"
                    >
                      <Minus size={12} />
                    </button>
                    <input
                      type="range"
                      min={-40}
                      max={40}
                      value={nudgeY}
                      onChange={(e) => setNudgeY(Number(e.target.value))}
                      className="nudge-slider"
                    />
                    <button
                      type="button"
                      className="stepper-btn"
                      onClick={() => setNudgeY((prev) => Math.min(40, prev + 1))}
                      title="+1px"
                    >
                      <Plus size={12} />
                    </button>
                    <button
                      type="button"
                      className="stepper-btn"
                      onClick={() => setNudgeY((prev) => Math.min(40, prev + 5))}
                      title="+5px"
                    >
                      +5
                    </button>
                  </div>
                </div>

                {/* Save Offset for active pose */}
                <button
                  type="button"
                  className="primary-button compact"
                  style={{ width: "100%", justifyContent: "center", marginTop: "12px" }}
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
                    <input
                      type="checkbox"
                      checked={showGuides}
                      onChange={(e) => setShowGuides(e.target.checked)}
                    />
                    <span>{t("mascots.guidesToggle")}</span>
                  </label>
                  <label className="filter-chip" style={{ cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={onionSkinEnabled}
                      onChange={(e) => setOnionSkinEnabled(e.target.checked)}
                    />
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
                  <button
                    type="button"
                    className="icon-button compact clear-search-btn"
                    onClick={() => setChannelSearchQuery("")}
                  >
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
                        className={`channel-select-card ${isChecked ? "is-selected" : ""} ${
                          otherMascotInfo ? "has-other-mascot" : ""
                        }`}
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
                              <span
                                className="mascot-state-badge other"
                                title={`Current mascot: ${otherMascotInfo.name}`}
                              >
                                <Warning size={11} weight="bold" />
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
              <span>
                {busyAction === "assign"
                  ? t("mascots.savingAndApplyingBtn")
                  : t("mascots.saveAndApplyChannelsBtn")}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
