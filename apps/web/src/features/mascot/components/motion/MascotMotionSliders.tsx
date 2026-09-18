import { type MascotActionType } from "@studio/shared";
import { useTranslation } from "../../../../i18n";
import { type MascotMotionIntensity } from "../../constants";

export interface MascotMotionSlidersProps {
  activePreviewAction: MascotActionType;
  currentSpeed: number;
  currentIntensity: MascotMotionIntensity;
  onChangeMotionSpeed: (action: MascotActionType, speed: number) => void;
  onChangeMotionIntensity: (action: MascotActionType, intensity: MascotMotionIntensity) => void;
}

const SPEED_OPTIONS = [0.5, 1.0, 1.5, 2.0] as const;
const INTENSITY_OPTIONS: readonly MascotMotionIntensity[] = ["subtle", "normal", "dynamic"];

export function MascotMotionSliders({
  activePreviewAction,
  currentSpeed,
  currentIntensity,
  onChangeMotionSpeed,
  onChangeMotionIntensity,
}: MascotMotionSlidersProps) {
  const { t } = useTranslation();

  const getSpeedLabel = (spd: number) => {
    if (spd === 0.5) return t("mascots.speedSlow");
    if (spd === 1.0) return t("mascots.speedNormal");
    if (spd === 1.5) return t("mascots.speedFast");
    return t("mascots.speedDynamic");
  };

  const getIntensityLabel = (intensity: MascotMotionIntensity) => {
    if (intensity === "subtle") return t("mascots.intensitySubtle");
    if (intensity === "normal") return t("mascots.intensityNormal");
    return t("mascots.intensityDynamic");
  };

  return (
    <>
      <div>
        <label className="motion-section-title">
          <span>{t("mascots.animationSpeedLabel")}</span>
          <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--muted)" }}>{currentSpeed}x</span>
        </label>
        <div className="motion-pills-row">
          {SPEED_OPTIONS.map((spd) => (
            <button
              key={spd}
              type="button"
              className={`motion-speed-pill ${currentSpeed === spd ? "is-active" : ""}`}
              onClick={() => onChangeMotionSpeed(activePreviewAction, spd)}
            >
              {getSpeedLabel(spd)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="motion-section-title">
          <span>{t("mascots.motionIntensityLabel")}</span>
          <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--muted)", textTransform: "capitalize" }}>{currentIntensity}</span>
        </label>
        <div className="motion-intensity-row">
          {INTENSITY_OPTIONS.map((intensity) => (
            <button
              key={intensity}
              type="button"
              className={`motion-speed-pill ${currentIntensity === intensity ? "is-active" : ""}`}
              onClick={() => onChangeMotionIntensity(activePreviewAction, intensity)}
            >
              {getIntensityLabel(intensity)}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
