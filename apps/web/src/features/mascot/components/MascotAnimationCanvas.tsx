import { ALL_MASCOT_ACTIONS, type MascotActionType, type MascotProfile } from "@studio/shared";
import { Play, Pause, ArrowsOutSimple, Smiley } from "@phosphor-icons/react";
import { useTranslation } from "../../../i18n";
import { getLocalizedActionMeta, type MascotMotionPreset } from "../constants";

export type MascotAnimationCanvasProps = {
  editingMascot: MascotProfile | null;
  activePreviewAction: MascotActionType;
  setActivePreviewAction: (action: MascotActionType) => void;
  isPlaying: boolean;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  canvasBackground: "dark" | "light" | "grid" | "clean";
  setCanvasBackground: (bg: "dark" | "light" | "grid" | "clean") => void;
  canvasZoom: number;
  setCanvasZoom: React.Dispatch<React.SetStateAction<number>>;
  flipHorizontal: boolean;
  setFlipHorizontal: React.Dispatch<React.SetStateAction<boolean>>;
  motionPreset: MascotMotionPreset;
  motionSpeed: number;
  motionIntensity: "subtle" | "normal" | "dynamic";
  genColor: string;
};

export function MascotAnimationCanvas({
  editingMascot,
  activePreviewAction,
  setActivePreviewAction,
  isPlaying,
  setIsPlaying,
  canvasBackground,
  setCanvasBackground,
  canvasZoom,
  setCanvasZoom,
  flipHorizontal,
  setFlipHorizontal,
  motionPreset,
  motionSpeed,
  motionIntensity,
  genColor,
}: MascotAnimationCanvasProps) {
  const { t } = useTranslation();
  const currentActionSprite = editingMascot?.actions[activePreviewAction];
  const activeActionMeta = getLocalizedActionMeta(activePreviewAction, t);

  const intensityMultiplier = motionIntensity === "subtle" ? 0.35 : motionIntensity === "dynamic" ? 2.2 : 1.0;

  return (
    <div className="motion-canvas-card">
      {/* Top Toolbar */}
      <div className="motion-canvas-toolbar">
        <div className="motion-canvas-toolbar-left">
          {/* Background Modes */}
          <div className="motion-bg-toggle-group">
            {(["dark", "light", "grid", "clean"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                className={`motion-bg-btn ${canvasBackground === mode ? "is-active" : ""}`}
                onClick={() => setCanvasBackground(mode)}
              >
                {mode === "dark"
                  ? t("mascots.bgDark")
                  : mode === "light"
                    ? t("mascots.bgLight")
                    : mode === "grid"
                      ? t("mascots.bgGrid")
                      : t("mascots.bgClean")}
              </button>
            ))}
          </div>
        </div>

        <div className="motion-canvas-toolbar-right">
          {/* Flip Horizontal */}
          <button
            type="button"
            className={`motion-tool-btn ${flipHorizontal ? "is-active" : ""}`}
            onClick={() => setFlipHorizontal((prev) => !prev)}
            title={t("mascots.canvasFlipTooltip")}
          >
            <span>⇄</span>
          </button>

          {/* Zoom Toggle */}
          <button
            type="button"
            className={`motion-tool-btn ${canvasZoom > 1 ? "is-active" : ""}`}
            onClick={() => setCanvasZoom((prev) => (prev === 1.0 ? 1.25 : prev === 1.25 ? 1.5 : 1.0))}
            title={t("mascots.canvasZoomTooltip")}
          >
            <ArrowsOutSimple size={13} />
            <span>{canvasZoom}x</span>
          </button>
        </div>
      </div>

      {/* Viewport Canvas */}
      <div className={`motion-canvas-viewport theme-${canvasBackground}`}>
        <div
          className="motion-mascot-wrapper"
          style={
            {
              transform: `scale(${canvasZoom}) ${flipHorizontal ? "scaleX(-1)" : ""}`,
              "--anim-speed": motionSpeed,
              "--anim-intensity": intensityMultiplier,
            } as React.CSSProperties
          }
        >
          {currentActionSprite?.sprite_url ? (
            <img
              src={currentActionSprite.sprite_url}
              alt={activeActionMeta.label}
              className={`motion-mascot-img ${isPlaying && motionPreset !== "none" ? `motion-${motionPreset}` : ""}`}
              style={{
                filter: `drop-shadow(0 12px 24px rgba(0,0,0,0.5)) drop-shadow(0 0 16px ${genColor}26)`,
              }}
            />
          ) : (
            <div className="motion-mascot-placeholder">
              <Smiley size={48} style={{ color: genColor || "var(--accent)" }} />
              <span>{t("mascots.motionMissingBadge")}</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Playback & Quick Pose Switcher Bar */}
      <div className="motion-canvas-bottom-bar">
        <div className="motion-canvas-play-row">
          <button
            type="button"
            className={`motion-play-btn ${isPlaying ? "is-playing" : ""}`}
            onClick={() => setIsPlaying((prev) => !prev)}
          >
            {isPlaying ? <Pause size={14} weight="fill" /> : <Play size={14} weight="fill" />}
            <span>{isPlaying ? t("mascots.playbackPause") : t("mascots.playbackPlay")}</span>
          </button>

          <div className="motion-play-status-pill">
            <span className={`motion-play-status-dot ${isPlaying ? "active" : ""}`} />
            <span>{isPlaying ? "Live Motion Active" : "Paused"}</span>
          </div>
        </div>

        {/* Quick Pose Switcher */}
        <div className="motion-quick-pose-strip">
          {ALL_MASCOT_ACTIONS.map((action) => {
            const meta = getLocalizedActionMeta(action, t);
            const isReady = Boolean(editingMascot?.actions[action]?.sprite_url);
            const isSelected = activePreviewAction === action;

            return (
              <button
                key={action}
                type="button"
                className={`motion-quick-pose-btn ${isSelected ? "is-selected" : ""}`}
                onClick={() => setActivePreviewAction(action)}
              >
                <span>{meta.icon}</span>
                <span>{meta.label.split(" ")[0]}</span>
                <span className={`pose-status-dot ${isReady ? "ready" : ""}`} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
