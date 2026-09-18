import { CircleNotch, FloppyDisk } from "@phosphor-icons/react";
import { type MascotActionType } from "@studio/shared";
import { useTranslation } from "../../../../i18n";
import { MOTION_PRESETS, type MascotMotionPreset } from "../../constants";

export interface MascotMotionPresetGridProps {
  currentPreset: MascotMotionPreset;
  activePreviewAction: MascotActionType;
  actionShortLabel: string;
  calibrating: boolean;
  onChangeMotionPreset: (action: MascotActionType, preset: MascotMotionPreset) => void;
  onSaveMotion: (action?: MascotActionType) => void;
}

export function MascotMotionPresetGrid({
  currentPreset,
  activePreviewAction,
  actionShortLabel,
  calibrating,
  onChangeMotionPreset,
  onSaveMotion,
}: MascotMotionPresetGridProps) {
  const { t } = useTranslation();
  const activePresetMeta = MOTION_PRESETS.find((p) => p.id === currentPreset);

  return (
    <div>
      <label className="motion-section-title">
        <span>{t("mascots.motionPresetLabel")}</span>
        <span style={{ fontSize: "11px", fontWeight: 500, color: "var(--accent)" }}>{activePresetMeta?.label}</span>
      </label>

      <div className="motion-preset-grid">
        {MOTION_PRESETS.map((preset) => {
          const isActive = currentPreset === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              className={`motion-preset-chip ${isActive ? "is-active" : ""}`}
              onClick={() => onChangeMotionPreset(activePreviewAction, preset.id)}
            >
              <span className="preset-icon">{preset.icon}</span>
              <div className="preset-meta">
                <span className="preset-name">{preset.label}</span>
                <span className="preset-sub">{preset.subtitle}</span>
              </div>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        className="quiet-button primary compact"
        style={{ width: "100%", justifyContent: "center", marginTop: "10px" }}
        disabled={calibrating}
        onClick={() => onSaveMotion(activePreviewAction)}
      >
        {calibrating ? <CircleNotch className="spin" size={14} /> : <FloppyDisk size={14} />}
        <span>{calibrating ? t("mascots.savingMotionBtn") : `${t("mascots.saveMotionBtn")} (${actionShortLabel})`}</span>
      </button>
    </div>
  );
}
