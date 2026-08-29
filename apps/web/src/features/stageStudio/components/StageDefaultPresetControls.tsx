import { ArrowDown, ArrowClockwise, CircleNotch, FloppyDisk } from "@phosphor-icons/react";
import type { useStageStudio } from "../hooks/useStageStudio";

type StageDefaultPresetControlsProps = {
  studio: ReturnType<typeof useStageStudio>;
};

function signed(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

export function StageDefaultPresetControls({ studio }: StageDefaultPresetControlsProps) {
  const { t, defaultPlacement, presetLoading, presetSaving, presetLoadFailed, loadPreset, applyDefaultPlacement, saveCurrentAsDefault } =
    studio;

  return (
    <section className="inspector-section stage-default-preset-section" aria-labelledby="stage-default-preset-title">
      <div className="inspector-section-header">
        <h3 id="stage-default-preset-title" className="inspector-section-title">
          {t("stageStudio.defaultPresetTitle")}
        </h3>
        {presetLoading ? (
          <CircleNotch className="spin stage-preset-spinner" size={13} aria-label={t("stageStudio.loadingDefaultPreset")} />
        ) : null}
      </div>

      <div className="stage-preset-readout" aria-live="polite">
        <span>{defaultPlacement.position === "bottom_left" ? t("stageStudio.leftBadge") : t("stageStudio.rightBadge")}</span>
        <strong>{Math.round(defaultPlacement.scale * 100)}%</strong>
        <span>X {signed(defaultPlacement.offset_x)}</span>
        <span>Y {signed(defaultPlacement.offset_y)}</span>
      </div>

      <p className="stage-preset-purpose">{t("stageStudio.defaultPresetPurpose")}</p>

      {presetLoadFailed ? (
        <div className="stage-preset-error" role="status">
          <span>{t("stageStudio.defaultPresetLoadFailed")}</span>
          <button type="button" className="stage-preset-retry" onClick={() => void loadPreset()} disabled={presetLoading}>
            <ArrowClockwise size={12} />
            {t("stageStudio.retryPreview")}
          </button>
        </div>
      ) : null}

      <div className="stage-preset-actions">
        <button type="button" className="quiet-button compact" onClick={applyDefaultPlacement} disabled={presetLoading || presetSaving}>
          <ArrowDown size={13} />
          <span>{t("stageStudio.applyDefaultPreset")}</span>
        </button>
        <button
          type="button"
          className="quiet-button compact"
          onClick={() => void saveCurrentAsDefault()}
          disabled={presetLoading || presetSaving}
        >
          {presetSaving ? <CircleNotch className="spin" size={13} /> : <FloppyDisk size={13} />}
          <span>{presetSaving ? t("common.saving") : t("stageStudio.saveCurrentAsDefault")}</span>
        </button>
      </div>
    </section>
  );
}
