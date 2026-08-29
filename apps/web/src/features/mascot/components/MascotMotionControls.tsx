import { useState } from "react";
import { ArrowLeft, CheckCircle, CircleNotch, Sparkle, ArrowCounterClockwise, FloppyDisk } from "@phosphor-icons/react";
import type { MascotActionType, MascotProfile } from "@studio/shared";
import { useTranslation } from "../../../i18n";
import { getLocalizedActionMeta, MOTION_PRESETS, type MascotMotionPreset, type MascotMotionIntensity } from "../constants";

export type MascotMotionControlsProps = {
  editingMascot: MascotProfile | null;
  activePreviewAction: MascotActionType;
  actionMotions: Record<MascotActionType, MascotMotionPreset>;
  actionSpeeds: Record<MascotActionType, number>;
  actionIntensities: Record<MascotActionType, MascotMotionIntensity>;
  onChangeMotionPreset: (action: MascotActionType, preset: MascotMotionPreset) => void;
  onChangeMotionSpeed: (action: MascotActionType, speed: number) => void;
  onChangeMotionIntensity: (action: MascotActionType, intensity: MascotMotionIntensity) => void;
  onResetDefaultMotions: () => void;
  onSaveMotion: (action?: MascotActionType) => void;
  onFinishMascot: () => void;
  onBackStep: () => void;
  calibrating: boolean;
  busyAction: string | null;
};

export function MascotMotionControls({
  editingMascot,
  activePreviewAction,
  actionMotions,
  actionSpeeds,
  actionIntensities,
  onChangeMotionPreset,
  onChangeMotionSpeed,
  onChangeMotionIntensity,
  onResetDefaultMotions,
  onSaveMotion,
  onFinishMascot,
  onBackStep,
  calibrating,
  busyAction,
}: MascotMotionControlsProps) {
  const { t } = useTranslation();
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const activeActionMeta = getLocalizedActionMeta(activePreviewAction, t);
  const currentPreset = actionMotions[activePreviewAction] || "breathe";
  const currentSpeed = actionSpeeds[activePreviewAction] || 1.0;
  const currentIntensity = actionIntensities[activePreviewAction] || "normal";
  const hasSprite = Boolean(editingMascot?.actions[activePreviewAction]?.sprite_url);

  return (
    <div className="motion-controls-card">
      {/* Header */}
      <div className="motion-controls-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Sparkle size={14} weight="fill" style={{ color: "var(--accent)" }} />
            <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700 }}>{t("mascots.motionStudioTitle")}</h3>
          </div>
          <p style={{ margin: "2px 0 0", fontSize: "11.5px", color: "var(--muted)" }}>
            {activeActionMeta.label.split(" ")[0]} · {hasSprite ? t("mascots.motionReadyBadge") : t("mascots.motionMissingBadge")}
          </p>
        </div>

        <span className="action-ready-badge" style={{ fontSize: "11px" }}>
          {Object.values(editingMascot?.actions || {}).filter((a) => a?.sprite_url).length}/7 Ready
        </span>
      </div>

      {/* Body */}
      <div className="motion-controls-body">
        {/* Motion Presets Grid */}
        <div>
          <label className="motion-section-title">
            <span>{t("mascots.motionPresetLabel")}</span>
            <span style={{ fontSize: "11px", fontWeight: 500, color: "var(--accent)" }}>
              {MOTION_PRESETS.find((p) => p.id === currentPreset)?.label}
            </span>
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

          {/* Dedicated Save Button for Active Pose */}
          <button
            type="button"
            className="quiet-button primary compact"
            style={{ width: "100%", justifyContent: "center", marginTop: "10px" }}
            disabled={calibrating}
            onClick={() => onSaveMotion(activePreviewAction)}
          >
            {calibrating ? <CircleNotch className="spin" size={14} /> : <FloppyDisk size={14} />}
            <span>
              {calibrating ? t("mascots.savingMotionBtn") : `${t("mascots.saveMotionBtn")} (${activeActionMeta.label.split(" ")[0]})`}
            </span>
          </button>
        </div>

        {/* Speed Controls */}
        <div>
          <label className="motion-section-title">
            <span>{t("mascots.animationSpeedLabel")}</span>
            <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--muted)" }}>{currentSpeed}x</span>
          </label>
          <div className="motion-pills-row">
            {[0.5, 1.0, 1.5, 2.0].map((spd) => (
              <button
                key={spd}
                type="button"
                className={`motion-speed-pill ${currentSpeed === spd ? "is-active" : ""}`}
                onClick={() => onChangeMotionSpeed(activePreviewAction, spd)}
              >
                {spd === 0.5
                  ? t("mascots.speedSlow")
                  : spd === 1.0
                    ? t("mascots.speedNormal")
                    : spd === 1.5
                      ? t("mascots.speedFast")
                      : t("mascots.speedDynamic")}
              </button>
            ))}
          </div>
        </div>

        {/* Intensity Controls */}
        <div>
          <label className="motion-section-title">
            <span>{t("mascots.motionIntensityLabel")}</span>
            <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--muted)", textTransform: "capitalize" }}>
              {currentIntensity}
            </span>
          </label>
          <div className="motion-intensity-row">
            {(["subtle", "normal", "dynamic"] as const).map((intensity) => (
              <button
                key={intensity}
                type="button"
                className={`motion-speed-pill ${currentIntensity === intensity ? "is-active" : ""}`}
                onClick={() => onChangeMotionIntensity(activePreviewAction, intensity)}
              >
                {intensity === "subtle"
                  ? t("mascots.intensitySubtle")
                  : intensity === "normal"
                    ? t("mascots.intensityNormal")
                    : t("mascots.intensityDynamic")}
              </button>
            ))}
          </div>
        </div>

        {/* Reset Actions with confirmation */}
        <div className="motion-batch-actions" style={{ marginTop: "4px" }}>
          {!showResetConfirm ? (
            <button
              type="button"
              className="quiet-button compact"
              style={{ width: "100%", justifyContent: "center" }}
              onClick={() => setShowResetConfirm(true)}
              title={t("mascots.resetDefaultMotionsTooltip")}
            >
              <ArrowCounterClockwise size={13} />
              <span>{t("mascots.resetDefaultMotionsBtn")}</span>
            </button>
          ) : (
            <div
              className="motion-reset-confirm-box"
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "8px",
                padding: "6px 10px",
                background: "rgba(239, 68, 68, 0.08)",
                border: "1px solid rgba(239, 68, 68, 0.25)",
                borderRadius: "var(--radius-sm)",
              }}
            >
              <span style={{ fontSize: "11.5px", color: "var(--ink-secondary)" }}>{t("mascots.resetConfirmPrompt")}</span>
              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  type="button"
                  className="quiet-button compact"
                  style={{ fontSize: "11px", padding: "3px 8px" }}
                  onClick={() => setShowResetConfirm(false)}
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="button"
                  className="primary-button compact"
                  style={{ fontSize: "11px", padding: "3px 10px", backgroundColor: "#ef4444", color: "#fff", borderColor: "#ef4444" }}
                  onClick={() => {
                    onResetDefaultMotions();
                    setShowResetConfirm(false);
                  }}
                >
                  {t("mascots.confirmResetBtn")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="motion-controls-footer">
        <button type="button" className="quiet-button" onClick={onBackStep}>
          <ArrowLeft size={14} />
          <span>{t("mascots.backStatesBtn")}</span>
        </button>

        <button
          type="button"
          className="primary-button"
          style={{ flex: 1, justifyContent: "center" }}
          disabled={busyAction === "finish"}
          onClick={onFinishMascot}
        >
          {busyAction === "finish" ? <CircleNotch className="spin" size={15} /> : <CheckCircle size={15} weight="fill" />}
          <span>{busyAction === "finish" ? t("common.saving") : t("mascots.finishMascotBtn")}</span>
        </button>
      </div>
    </div>
  );
}
