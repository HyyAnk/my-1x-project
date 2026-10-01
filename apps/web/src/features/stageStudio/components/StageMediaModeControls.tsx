import type { ChannelMascotMediaMode } from "@studio/shared";
import type { useStageStudio } from "../hooks/useStageStudio";

type StageMediaModeControlsProps = {
  studio: ReturnType<typeof useStageStudio>;
};

export function StageMediaModeControls({ studio }: StageMediaModeControlsProps) {
  const { t, mascotMediaMode, setMascotMediaMode } = studio;

  return (
    <section className="inspector-section" aria-labelledby="stage-media-mode-title">
      <div className="inspector-section-header">
        <h3 id="stage-media-mode-title" className="inspector-section-title">
          {t("stageStudio.mediaModeTitle")}
        </h3>
      </div>

      <label className="stage-layout-select-field">
        <span className="sr-only">{t("stageStudio.mediaModeTitle")}</span>
        <select
          value={mascotMediaMode}
          onChange={(event) => setMascotMediaMode(event.target.value as ChannelMascotMediaMode)}
          aria-describedby="stage-media-mode-description"
        >
          <option value="inherit">{t("stageStudio.mediaModeInherit")}</option>
          <option value="static">{t("stageStudio.mediaModeStatic")}</option>
          <option value="animation">{t("stageStudio.mediaModeAnimation")}</option>
        </select>
      </label>

      <div id="stage-media-mode-description" className="stage-preset-purpose">
        {t("stageStudio.mediaModeHelp")}
      </div>
    </section>
  );
}
