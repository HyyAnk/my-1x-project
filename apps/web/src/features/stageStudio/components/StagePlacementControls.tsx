import { ArrowCounterClockwise, ArrowsLeftRight, Copy, SidebarSimple } from "@phosphor-icons/react";
import type { useStageStudio } from "../hooks/useStageStudio";

type StagePlacementControlsProps = {
  studio: ReturnType<typeof useStageStudio>;
};

export function StagePlacementControls({ studio }: StagePlacementControlsProps) {
  const { t, position, setPosition, scale, setScale, offsetX, setOffsetX, offsetY, setOffsetY, flipHorizontal, setFlipHorizontal } = studio;

  const resetOffsets = () => {
    setOffsetX(0);
    setOffsetY(0);
  };

  return (
    <section className="inspector-section">
      <div className="inspector-section-header">
        <h3 className="inspector-section-title">{t("stageStudio.anchorAndFlipTitle")}</h3>
        <div style={{ display: "flex", gap: "4px" }}>
          {studio.aspectRatio === "9:16" ? (
            <button
              type="button"
              className="inspector-icon-action"
              onClick={() => studio.copyPlacementFrom("16:9", "9:16")}
              title="Copy from 16:9"
              aria-label="Copy from 16:9"
            >
              <Copy size={13} />
            </button>
          ) : (
            <button
              type="button"
              className="inspector-icon-action"
              onClick={() => studio.copyPlacementFrom("9:16", "16:9")}
              title="Copy from 9:16"
              aria-label="Copy from 9:16"
            >
              <Copy size={13} />
            </button>
          )}
          <button
            type="button"
            className="inspector-icon-action"
            onClick={resetOffsets}
            title={t("stageStudio.resetOffsetsTooltip")}
            aria-label={t("stageStudio.resetOffsetsTooltip")}
          >
            <ArrowCounterClockwise size={13} />
          </button>
        </div>
      </div>

      <div className="stage-compact-control-row">
        <span className="stage-control-label">{t("stageStudio.anchorLabel")}</span>
        <div className="stage-segmented-pill-group">
          <button
            type="button"
            className={`stage-pill-btn ${position === "bottom_left" ? "is-active" : ""}`}
            onClick={() => setPosition("bottom_left")}
            title={t("stageStudio.anchorLeftTooltip")}
            aria-pressed={position === "bottom_left"}
          >
            <SidebarSimple size={12} weight="fill" style={{ transform: "scaleX(-1)" }} />
            <span>{t("stageStudio.anchorLeft")}</span>
          </button>
          <button
            type="button"
            className={`stage-pill-btn ${position === "bottom_right" ? "is-active" : ""}`}
            onClick={() => setPosition("bottom_right")}
            title={t("stageStudio.anchorRightTooltip")}
            aria-pressed={position === "bottom_right"}
          >
            <SidebarSimple size={12} weight="fill" />
            <span>{t("stageStudio.anchorRight")}</span>
          </button>
        </div>
        <button
          type="button"
          className={`stage-icon-toggle ${flipHorizontal ? "is-active" : ""}`}
          onClick={() => setFlipHorizontal((current) => !current)}
          title={t("stageStudio.flipDirectionTooltip")}
          aria-label={t("stageStudio.flipDirectionTooltip")}
          aria-pressed={flipHorizontal}
        >
          <ArrowsLeftRight size={14} />
        </button>
      </div>

      <SliderControl
        label={t("stageStudio.scaleTitle")}
        min={0.3}
        max={3}
        step={0.01}
        value={scale}
        displayValue={Math.round(scale * 100)}
        unit="%"
        inputMin={30}
        inputMax={300}
        onSliderChange={setScale}
        onInputChange={(value) => setScale(Math.max(0.3, Math.min(3, value / 100)))}
      />
      <SliderControl
        label="X"
        min={-800}
        max={800}
        step={5}
        value={offsetX}
        displayValue={offsetX}
        unit="px"
        inputMin={-1500}
        inputMax={1500}
        onSliderChange={setOffsetX}
        onInputChange={(value) => setOffsetX(Math.max(-1500, Math.min(1500, value)))}
      />
      <SliderControl
        label="Y"
        min={-800}
        max={800}
        step={5}
        value={offsetY}
        displayValue={offsetY}
        unit="px"
        inputMin={-1500}
        inputMax={1500}
        onSliderChange={setOffsetY}
        onInputChange={(value) => setOffsetY(Math.max(-1500, Math.min(1500, value)))}
      />
    </section>
  );
}

type SliderControlProps = {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  displayValue: number;
  unit: string;
  inputMin: number;
  inputMax: number;
  onSliderChange: (value: number) => void;
  onInputChange: (value: number) => void;
};

function SliderControl({
  label,
  min,
  max,
  step,
  value,
  displayValue,
  unit,
  inputMin,
  inputMax,
  onSliderChange,
  onInputChange,
}: SliderControlProps) {
  return (
    <label className="stage-compact-slider-row">
      <span className="stage-control-label">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onSliderChange(Number(event.target.value))}
        className="inspector-slider"
      />
      <span className="stage-val-input-wrap">
        <input
          type="number"
          min={inputMin}
          max={inputMax}
          value={displayValue}
          onChange={(event) => onInputChange(Number(event.target.value) || 0)}
          className="stage-num-input"
        />
        <span className="stage-val-unit">{unit}</span>
      </span>
    </label>
  );
}
