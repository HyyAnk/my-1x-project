import {
  ArrowLeft,
  ArrowRight,
  ArrowsInSimple,
  ArrowsOutSimple,
  CheckCircle,
  Circle,
  CircleNotch,
  FloppyDisk,
  Pause,
  Play,
  SlidersHorizontal,
  Smiley,
  Stop,
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

type MascotCalibrationStepProps = {
  editingMascot: MascotProfile | null;
  mascots: MascotProfile[];
  channels: Channel[];
  genColor: string;
  busyAction: string | null;
  batchState: {
    currentIndex: number;
    total: number;
    currentAction: MascotActionType | null;
    queue: MascotActionType[];
  } | null;
  itemProgress: number;
  activePreviewAction: MascotActionType;
  setActivePreviewAction: (action: MascotActionType) => void;
  previewFps: number;
  setPreviewFps: (fps: number) => void;
  isPlaying: boolean;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  currentFrameIndex: number;
  setCurrentFrameIndex: React.Dispatch<React.SetStateAction<number>>;
  stagePreviewMode: "grid" | "video_stage";
  setStagePreviewMode: (mode: "grid" | "video_stage") => void;
  targetPosition: "bottom_left" | "bottom_right";
  setTargetPosition: (pos: "bottom_left" | "bottom_right") => void;
  targetScale: number;
  setTargetScale: (scale: number) => void;
  assignedChannels: string[];
  setAssignedChannels: React.Dispatch<React.SetStateAction<string[]>>;
  isScenarioMode: boolean;
  setIsScenarioMode: (mode: boolean) => void;
  scenarioPhase: "intro" | "question" | "thinking" | "reveal" | "explain";
  scenarioCountdown: number;
  theaterMode: boolean;
  setTheaterMode: React.Dispatch<React.SetStateAction<boolean>>;
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
  batchState,
  itemProgress,
  activePreviewAction,
  setActivePreviewAction,
  previewFps,
  setPreviewFps,
  isPlaying,
  setIsPlaying,
  currentFrameIndex,
  setCurrentFrameIndex,
  stagePreviewMode,
  setStagePreviewMode,
  targetPosition,
  setTargetPosition,
  targetScale,
  setTargetScale,
  assignedChannels,
  setAssignedChannels,
  isScenarioMode,
  setIsScenarioMode,
  scenarioPhase,
  scenarioCountdown,
  theaterMode,
  setTheaterMode,
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
  const activeFramesCount = currentActionSprite?.frames_count || 1;

  return (
    <div className="wizard-step-content step-live-studio-grid">
      {/* Left Column: Interactive Frame Player & Stage Simulator */}
      <div className="live-player-col">
        <div className="wizard-card">
          <div className="wizard-card-header-flex">
            <div>
              <h3>{t("mascots.stageTheaterTitle")}</h3>
              <p className="wizard-card-sub">{t("mascots.stageTheaterSub")}</p>
            </div>

            <div className="stage-mode-toggles" style={{ display: "flex", gap: "8px", alignItems: "center" }}>
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
              <button
                type="button"
                className={`icon-button ${theaterMode ? "is-active" : ""}`}
                title={theaterMode ? t("mascots.theaterModeCollapse") : t("mascots.theaterModeExpand")}
                onClick={() => setTheaterMode((p) => !p)}
              >
                {theaterMode ? <ArrowsInSimple size={16} /> : <ArrowsOutSimple size={16} />}
              </button>
            </div>
          </div>

          {/* Scenario Playback Toolbar */}
          <div className="scenario-bar-container">
            <div className="scenario-bar-top">
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  className={isScenarioMode ? "quiet-button danger compact" : "primary-button compact"}
                  onClick={() => {
                    setIsScenarioMode(!isScenarioMode);
                  }}
                >
                  {isScenarioMode ? <Stop size={14} weight="fill" /> : <Play size={14} weight="fill" />}
                  <span>{isScenarioMode ? t("mascots.stopScenarioBtn") : t("mascots.playTimelineBtn")}</span>
                </button>

                <div className="reaction-style-toggle-group" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                  <button
                    type="button"
                    className={`pos-toggle-btn ${reactionStyle === "celebrate" ? "is-selected" : ""}`}
                    style={{ padding: "4px 8px", fontSize: "11px" }}
                    onClick={() => {
                      setReactionStyle("celebrate");
                      if (scenarioPhase === "reveal") setActivePreviewAction("celebrate");
                    }}
                    title={t("mascots.celebrateReactionTooltip")}
                  >
                    {t("mascots.celebrateReactionBtn")}
                  </button>
                  <button
                    type="button"
                    className={`pos-toggle-btn ${reactionStyle === "oops" ? "is-selected" : ""}`}
                    style={{ padding: "4px 8px", fontSize: "11px" }}
                    onClick={() => {
                      setReactionStyle("oops");
                      if (scenarioPhase === "reveal") setActivePreviewAction("oops");
                    }}
                    title={t("mascots.oopsReactionTooltip")}
                  >
                    {t("mascots.oopsReactionBtn")}
                  </button>
                </div>

                <span style={{ fontSize: "12px", color: "var(--accent)", fontWeight: 700, marginLeft: "auto" }}>
                  ⏱ {scrubberTime.toFixed(1)}s / 16.0s
                </span>
              </div>
            </div>

            {/* Interactive Director Timeline Scrubber */}
            <div className="director-scrubber-wrap">
              <div className="director-scrubber-track">
                <div
                  className={`scrubber-segment seg-intro ${scenarioPhase === "intro" ? "is-current" : ""}`}
                  style={{ width: "12.5%" }}
                  onClick={() => { setIsScenarioMode(false); onApplyTimelineTime(1.0); }}
                  title="[0s - 2s] Intro (Pose: wave)"
                >
                  {t("mascots.timelineIntro")}
                </div>
                <div
                  className={`scrubber-segment seg-thinking ${scenarioPhase === "question" || scenarioPhase === "thinking" ? "is-current" : ""}`}
                  style={{ width: "43.75%" }}
                  onClick={() => { setIsScenarioMode(false); onApplyTimelineTime(5.5); }}
                  title="[2s - 9s] Question & 5s Countdown (Pose: thinking)"
                >
                  {t("mascots.timelineThinking")}
                </div>
                <div
                  className={`scrubber-segment seg-reveal ${scenarioPhase === "reveal" ? "is-current" : ""}`}
                  style={{ width: "18.75%" }}
                  onClick={() => { setIsScenarioMode(false); onApplyTimelineTime(10.5); }}
                  title="[9s - 12s] Reveal (Pose: celebrate/oops)"
                >
                  {reactionStyle === "celebrate" ? t("mascots.timelineReveal") : t("mascots.timelineOops")}
                </div>
                <div
                  className={`scrubber-segment seg-explain ${scenarioPhase === "explain" ? "is-current" : ""}`}
                  style={{ width: "25%" }}
                  onClick={() => { setIsScenarioMode(false); onApplyTimelineTime(14.0); }}
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

          {/* Action Selector Pills */}
          <div className="live-action-pills" style={{ marginBottom: "12px" }}>
            {ALL_MASCOT_ACTIONS.map((action) => {
              const meta = getLocalizedActionMeta(action, t);
              const hasSprite = Boolean(editingMascot?.actions[action]?.sprite_url);
              const isActionBusy = busyAction === action || Boolean(batchState && batchState.currentAction === action);
              return (
                <button
                  key={action}
                  type="button"
                  className={`live-action-pill ${activePreviewAction === action ? "is-active" : ""} ${hasSprite || isActionBusy ? "" : "is-disabled"}`}
                  onClick={() => {
                    setIsScenarioMode(false);
                    setActivePreviewAction(action);
                    setCurrentFrameIndex(0);
                  }}
                >
                  <span>{isActionBusy ? <CircleNotch className="spin" size={13} /> : meta.icon}</span>
                  <span>{meta.label.split(" ")[0]}</span>
                  {isActionBusy ? <span style={{ fontSize: "10px", color: "var(--accent)" }}>({itemProgress}%)</span> : null}
                </button>
              );
            })}
          </div>

          {/* Stage Simulator Screen */}
          <div className={`stage-simulator-screen ${stagePreviewMode === "video_stage" ? "is-video-bg" : "is-grid-bg"} ${theaterMode ? "theater-mode" : ""}`}>
            {theaterMode ? (
              <button
                type="button"
                className="icon-button"
                style={{ position: "absolute", top: "16px", right: "16px", zIndex: 100, background: "rgba(0,0,0,0.6)" }}
                onClick={() => setTheaterMode(false)}
              >
                <X size={18} />
              </button>
            ) : null}

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
                    <div className={`sim-choice ${scenarioPhase === "reveal" ? "is-dimmed" : ""}`}>{t("mascots.simChoiceA")}</div>
                    <div className={`sim-choice ${scenarioPhase === "reveal" ? "is-correct" : ""}`}>
                      {scenarioPhase === "reveal" ? `✓ ${t("mascots.simChoiceB")}` : t("mascots.simChoiceB")}
                    </div>
                    <div className={`sim-choice ${scenarioPhase === "reveal" ? "is-dimmed" : ""}`}>{t("mascots.simChoiceC")}</div>
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

            {/* Alignment Guides Overlay */}
            {showGuides ? (
              <div className="alignment-guides-overlay" aria-hidden="true">
                <div className="guide-center-crosshair-h" />
                <div className="guide-center-crosshair-v" />
                <div className="guide-ground-baseline" />
                <div className="guide-bounds-box" />
              </div>
            ) : null}

            {/* Animated Mascot Character Anchor */}
            <div
              className={`stage-mascot-anchor anchor-${targetPosition}`}
              style={{
                transform: `scale(${targetScale})`,
              }}
            >
              {/* Onion Skin Ghost Reference Layer */}
              {onionSkinEnabled && editingMascot?.actions.idle?.sprite_url ? (
                <div
                  className="stage-mascot-sprite-render onion-skin-layer"
                  style={{
                    width: "220px",
                    height: "220px",
                    backgroundImage: `url(${editingMascot.actions.idle.sprite_url})`,
                    backgroundSize: `${(editingMascot.actions.idle.frames_count || 1) * 100}% 100%`,
                    backgroundPosition: "0% 0%",
                    opacity: onionSkinOpacity,
                    filter: "sepia(100%) hue-rotate(150deg) saturate(300%)",
                    position: "absolute",
                    inset: 0,
                    zIndex: 1,
                    pointerEvents: "none",
                  }}
                />
              ) : null}

              {currentActionSprite?.sprite_url ? (
                <div
                  className={`stage-mascot-sprite-render ${isPlaying && (currentActionSprite.frames_count || 1) === 1 ? `mascot-anim-${activePreviewAction}` : ""}`}
                  style={{
                    width: "220px",
                    height: "220px",
                    backgroundImage: `url(${currentActionSprite.sprite_url})`,
                    backgroundSize: (currentActionSprite.frames_count || 1) === 1 ? "contain" : `${(currentActionSprite.frames_count || 1) * 100}% 100%`,
                    backgroundPosition: (currentActionSprite.frames_count || 1) === 1 ? "center bottom" : `${(currentFrameIndex / ((currentActionSprite.frames_count || 1) - 1 || 1)) * 100}% 0%`,
                    backgroundRepeat: "no-repeat",
                    transform: `translate(${nudgeX}px, ${nudgeY}px)`,
                    position: "relative",
                    zIndex: 2,
                  }}
                />
              ) : editingMascot?.master_image_url ? (
                <img
                  src={editingMascot.master_image_url}
                  alt="Mascot"
                  className={isPlaying ? "mascot-anim-idle" : ""}
                  style={{ width: "200px", height: "200px", objectFit: "contain", transform: `translate(${nudgeX}px, ${nudgeY}px)` }}
                />
              ) : (
                <div className="stage-mascot-placeholder">
                  <Smiley size={64} style={{ color: genColor }} />
                </div>
              )}
            </div>
          </div>

          {/* Player Controls Toolbar */}
          <div className="live-player-toolbar">
            <button
              type="button"
              className="icon-button"
              onClick={() => setIsPlaying((p) => !p)}
              title={isPlaying ? t("mascots.pauseAnimTooltip") : t("mascots.playAnimTooltip")}
            >
              {isPlaying ? <Pause size={18} weight="fill" /> : <Play size={18} weight="fill" />}
            </button>

            <div className="frame-stepper-group">
              <button
                type="button"
                className="icon-button"
                onClick={() => setCurrentFrameIndex((prev) => (prev - 1 + activeFramesCount) % activeFramesCount)}
                title={t("mascots.prevFrameTooltip")}
              >
                <ArrowLeft size={14} />
              </button>
              <span className="frame-indicator">
                {t("mascots.frameIndicator", { current: currentFrameIndex + 1, total: activeFramesCount })}
              </span>
              <button
                type="button"
                className="icon-button"
                onClick={() => setCurrentFrameIndex((prev) => (prev + 1) % activeFramesCount)}
                title={t("mascots.nextFrameTooltip")}
              >
                <ArrowRight size={14} />
              </button>
            </div>

            <div className="fps-slider-group">
              <label htmlFor="preview-fps">{t("mascots.speedLabel", { fps: previewFps })}</label>
              <input
                id="preview-fps"
                type="range"
                min={4}
                max={24}
                step={1}
                value={previewFps}
                onChange={(e) => setPreviewFps(Number(e.target.value))}
              />
            </div>
          </div>

          {/* Phase 2: Calibration & Alignment Inspector Toolbar */}
          <div className="calibration-inspector-toolbar">
            <div className="calibration-header-row">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <SlidersHorizontal size={16} weight="bold" style={{ color: "var(--accent)" }} />
                <strong style={{ fontSize: "13px" }}>{t("mascots.inspectorTitle")}</strong>
                <span className="action-tag-pill is-ready" style={{ fontSize: "10.5px" }}>
                  Pose: {getLocalizedActionMeta(activePreviewAction, t).label.split(" ")[0]}
                </span>
              </div>

              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <label className="filter-chip" style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <input
                    type="checkbox"
                    checked={showGuides}
                    onChange={(e) => setShowGuides(e.target.checked)}
                  />
                  <span>{t("mascots.guidesToggle")}</span>
                </label>
                <label className="filter-chip" style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <input
                    type="checkbox"
                    checked={onionSkinEnabled}
                    onChange={(e) => setOnionSkinEnabled(e.target.checked)}
                  />
                  <span>{t("mascots.onionSkinToggle")}</span>
                </label>
              </div>
            </div>

            {onionSkinEnabled ? (
              <div className="onion-slider-row" style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "8px" }}>
                <small style={{ color: "var(--muted)", whiteSpace: "nowrap" }}>{t("mascots.onionOpacityLabel", { percent: Math.round(onionSkinOpacity * 100) })}</small>
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

            <div className="nudge-controls-row">
              <div className="nudge-group">
                <label>{t("mascots.axisXLabel", { val: nudgeX > 0 ? `+${nudgeX}` : nudgeX })}</label>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <button type="button" className="icon-button compact" onClick={() => setNudgeX((x) => Math.max(-40, x - 1))} title={t("mascots.nudgeLeftTooltip")}>-</button>
                  <input
                    type="range"
                    min={-40}
                    max={40}
                    value={nudgeX}
                    onChange={(e) => setNudgeX(Number(e.target.value))}
                    style={{ width: "90px" }}
                  />
                  <button type="button" className="icon-button compact" onClick={() => setNudgeX((x) => Math.min(40, x + 1))} title={t("mascots.nudgeRightTooltip")}>+</button>
                </div>
              </div>

              <div className="nudge-group">
                <label>{t("mascots.axisYLabel", { val: nudgeY > 0 ? `+${nudgeY}` : nudgeY })}</label>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <button type="button" className="icon-button compact" onClick={() => setNudgeY((y) => Math.max(-40, y - 1))} title={t("mascots.nudgeUpTooltip")}>-</button>
                  <input
                    type="range"
                    min={-40}
                    max={40}
                    value={nudgeY}
                    onChange={(e) => setNudgeY(Number(e.target.value))}
                    style={{ width: "90px" }}
                  />
                  <button type="button" className="icon-button compact" onClick={() => setNudgeY((y) => Math.min(40, y + 1))} title={t("mascots.nudgeDownTooltip")}>+</button>
                </div>
              </div>

              <div style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  className="quiet-button compact"
                  onClick={() => {
                    setNudgeX(0);
                    setNudgeY(0);
                  }}
                  title={t("mascots.resetOffsetTooltip")}
                >
                  {t("mascots.resetBtn")}
                </button>
                <button
                  type="button"
                  className="primary-button compact"
                  disabled={calibrating || (nudgeX === (currentActionSprite?.offset_x || 0) && nudgeY === (currentActionSprite?.offset_y || 0))}
                  onClick={onSaveCalibration}
                >
                  {calibrating ? <CircleNotch className="spin" size={14} /> : <FloppyDisk size={14} />}
                  <span>{calibrating ? t("mascots.savingCalibrationBtn") : t("mascots.saveCalibrationBtn")}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Stage Configuration & Channel Assignment */}
      <div className="stage-config-col">
        <div className="wizard-card">
          <h3>{t("mascots.stageConfigTitle")}</h3>
          <p className="wizard-card-sub">{t("mascots.stageConfigSub")}</p>

          <div className="form-group">
            <label>{t("mascots.stagePositionLabel")}</label>
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
          </div>

          <div className="stage-control-card">
            <div className="stage-scale-header">
              <label className="stage-control-label">
                {t("mascots.scaleLabel", { scale: targetScale.toFixed(2) })}
              </label>
              <span className="scale-value-badge">{Math.round(targetScale * 100)}%</span>
            </div>
            <input
              id="target-scale"
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
                {t("mascots.presetCompact")}
              </button>
              <button
                type="button"
                className={`scale-preset-chip ${Math.abs(targetScale - 1.0) < 0.01 ? "is-active" : ""}`}
                onClick={() => setTargetScale(1.0)}
              >
                {t("mascots.presetStandard")}
              </button>
              <button
                type="button"
                className={`scale-preset-chip ${Math.abs(targetScale - 1.15) < 0.01 ? "is-active" : ""}`}
                onClick={() => setTargetScale(1.15)}
              >
                {t("mascots.presetLarge")}
              </button>
            </div>
          </div>

          <div className="form-group" style={{ marginTop: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
              <label style={{ margin: 0 }}>{t("mascots.assignChannelsLabel", { count: assignedChannels.length })}</label>
              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  type="button"
                  className="quiet-button compact"
                  onClick={() => setAssignedChannels(channels.map((c) => c.channel_id))}
                  disabled={channels.length === 0}
                >
                  {t("mascots.selectAllBtn")}
                </button>
                <button
                  type="button"
                  className="quiet-button compact"
                  onClick={() => setAssignedChannels([])}
                  disabled={assignedChannels.length === 0}
                >
                  {t("mascots.deselectAllBtn")}
                </button>
              </div>
            </div>

            <div className="channels-card-list" style={{ maxHeight: "220px" }}>
              {channels.length === 0 ? (
                <div className="channels-empty-state" style={{ padding: "20px" }}>
                  <p style={{ margin: 0, fontSize: "12px" }}>{t("mascots.noChannelsAvailable")}</p>
                </div>
              ) : (
                channels.map((channel) => {
                  const checked = assignedChannels.includes(channel.channel_id);
                  const isOther = channel.mascot_id && channel.mascot_id !== editingMascot?.id;
                  const otherName = isOther ? mascots.find((m) => m.id === channel.mascot_id)?.name || channel.mascot_id : null;
                  const lang = channel.language || channel.market || "EN";
                  const langTag = lang.toLowerCase().includes("viet") ? "🇻🇳 VI" : lang.toLowerCase().includes("eng") ? "🇺🇸 EN" : lang.toUpperCase().slice(0, 4);

                  return (
                    <article
                      key={channel.channel_id}
                      className={`channel-select-card ${checked ? "is-selected" : ""} ${isOther ? "has-other-mascot" : ""}`}
                      style={{ padding: "8px 12px" }}
                      onClick={() => {
                        if (checked) {
                          setAssignedChannels((prev) => prev.filter((id) => id !== channel.channel_id));
                        } else {
                          setAssignedChannels((prev) => [...prev, channel.channel_id]);
                        }
                      }}
                    >
                      <div className="channel-select-checkbox">
                        {checked ? (
                          <CheckCircle size={18} weight="fill" className="check-icon checked" />
                        ) : (
                          <Circle size={18} weight="regular" className="check-icon unchecked" />
                        )}
                      </div>
                      <div className="channel-select-info">
                        <div className="channel-select-title-row">
                          <strong className="channel-select-name" style={{ fontSize: "12.5px" }}>{channel.display_name}</strong>
                          <span className="channel-lang-chip" style={{ fontSize: "10px" }}>{langTag}</span>
                        </div>
                        {isOther && otherName ? (
                          <div style={{ marginTop: "2px" }}>
                            <span className="mascot-state-badge other" style={{ fontSize: "10px", padding: "0 5px" }}>
                              {t("mascots.currentlyAssignedToOther", { name: otherName })}
                            </span>
                          </div>
                        ) : null}
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </div>

          <div className="wizard-action-row" style={{ marginTop: "24px", display: "flex", gap: "10px" }}>
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
