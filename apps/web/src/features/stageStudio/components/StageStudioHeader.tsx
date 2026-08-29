import { ArrowClockwise, Broadcast, DeviceMobile, DotsThreeVertical, GridFour, MonitorPlay, X } from "@phosphor-icons/react";
import type { useStageStudio } from "../hooks/useStageStudio";

type StageStudioHeaderProps = {
  studio: ReturnType<typeof useStageStudio>;
  onClose: () => void;
};

export function StageStudioHeader({ studio, onClose }: StageStudioHeaderProps) {
  const {
    t,
    isSingleChannelMode,
    targetChannel,
    activeMascot,
    aspectRatio,
    setAspectRatio,
    stageViewMode,
    setStageViewMode,
    showGuides,
    setShowGuides,
    showSafeMargins,
    setShowSafeMargins,
    handleResetLayout,
  } = studio;

  return (
    <header className="stage-studio-header">
      {/* Sleek Title & Identity */}
      <div className="stage-studio-identity">
        <div className="stage-brand-pill">
          <span className="studio-brand-dot" />
          <span id="stage-studio-title" className="studio-brand-name">
            {t("stageStudio.title")}
          </span>
        </div>
        <span className="studio-separator">/</span>
        <span className="stage-target-badge">
          {isSingleChannelMode && targetChannel
            ? targetChannel.display_name || targetChannel.slug
            : activeMascot?.name || t("stageStudio.targetMascotHost")}
        </span>
        <span className="stage-resolution-pill">{t("stageStudio.resolutionBadge")}</span>
      </div>

      {/* Minimalist Toolbar Controls */}
      <div className="stage-studio-toolbar">
        {/* Aspect Ratio 16:9 vs 9:16 */}
        <div className="studio-segmented-group" title={t("stageStudio.aspectRatioTooltip")}>
          <button
            type="button"
            className={`studio-segment-btn ${aspectRatio === "16:9" ? "is-active" : ""}`}
            onClick={() => setAspectRatio("16:9")}
            aria-label="16:9"
          >
            <MonitorPlay size={13} />
            <span>16:9</span>
          </button>
          <button
            type="button"
            className={`studio-segment-btn ${aspectRatio === "9:16" ? "is-active" : ""}`}
            onClick={() => setAspectRatio("9:16")}
            aria-label="9:16"
          >
            <DeviceMobile size={13} />
            <span>9:16</span>
          </button>
        </div>

        {/* View Mode: Scene vs Grid */}
        <div className="studio-segmented-group" title={t("stageStudio.viewModeTooltip")}>
          <button
            type="button"
            className={`studio-segment-btn ${stageViewMode === "video_stage" ? "is-active" : ""}`}
            onClick={() => setStageViewMode("video_stage")}
            aria-label={t("stageStudio.videoSceneMode")}
          >
            <Broadcast size={13} />
            <span>{t("stageStudio.videoSceneMode")}</span>
          </button>
          <button
            type="button"
            className={`studio-segment-btn ${stageViewMode === "grid" ? "is-active" : ""}`}
            onClick={() => setStageViewMode("grid")}
            aria-label={t("stageStudio.gridBlueprintMode")}
          >
            <GridFour size={13} />
            <span>{t("stageStudio.gridBlueprintMode")}</span>
          </button>
        </div>

        <details className="studio-options-menu">
          <summary
            className={`studio-options-trigger ${showGuides || showSafeMargins ? "has-active-option" : ""}`}
            title={t("stageStudio.viewOptions")}
            aria-label={t("stageStudio.viewOptions")}
          >
            <DotsThreeVertical size={15} weight="bold" />
          </summary>
          <div className="studio-options-popover">
            <label className="studio-menu-option">
              <input type="checkbox" checked={showGuides} onChange={(event) => setShowGuides(event.target.checked)} />
              <span>{t("stageStudio.baselineGuides")}</span>
            </label>
            <label className="studio-menu-option">
              <input type="checkbox" checked={showSafeMargins} onChange={(event) => setShowSafeMargins(event.target.checked)} />
              <span>{t("stageStudio.safeArea")}</span>
            </label>
            <button type="button" className="studio-menu-option is-action" onClick={handleResetLayout}>
              <ArrowClockwise size={13} />
              <span>{t("stageStudio.resetLayout")}</span>
            </button>
          </div>
        </details>

        <div className="studio-header-divider" />

        {/* Close Button */}
        <button type="button" className="studio-close-btn" onClick={onClose} title={t("stageStudio.closeTooltip")}>
          <X size={14} />
        </button>
      </div>
    </header>
  );
}
