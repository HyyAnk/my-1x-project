import { ArrowLeft, CheckCircle, CircleNotch, Sparkle } from "@phosphor-icons/react";
import { type MascotActionType, type MascotProfile, type MascotStateVariant } from "@studio/shared";
import { useTranslation } from "../../../i18n";
import { CORE_GAMEPLAY_ACTIONS, getLocalizedActionMeta, type MascotMotionPreset, type MascotMotionIntensity } from "../constants";
import { MascotMotionPresetGrid, MascotMotionSliders, MascotMotionResetConfirm } from "./motion";

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
  selectedVariant?: MascotStateVariant | null;
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
  selectedVariant,
}: MascotMotionControlsProps) {
  const { t } = useTranslation();
  const activeActionMeta = getLocalizedActionMeta(activePreviewAction, t);
  const actionShortLabel = activeActionMeta.label.split(" ")[0];
  const currentPreset = actionMotions[activePreviewAction] || "breathe";
  const currentSpeed = actionSpeeds[activePreviewAction] || 1.0;
  const currentIntensity = actionIntensities[activePreviewAction] || "normal";

  const hasSprite = Boolean(
    editingMascot?.render_bundle?.assets?.actions?.[activePreviewAction]?.image_url ||
    editingMascot?.actions?.[activePreviewAction]?.sprite_url,
  );
  const readyCount = CORE_GAMEPLAY_ACTIONS.filter((act) =>
    Boolean(editingMascot?.render_bundle?.assets?.actions?.[act]?.image_url || editingMascot?.actions?.[act]?.sprite_url),
  ).length;
  const editingTargetBadge = selectedVariant
    ? t("mascots.editingSlotBadge", { slot: selectedVariant.slot_index })
    : t("mascots.editingBaseBadge");

  return (
    <div className="motion-controls-card">
      <div className="motion-controls-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Sparkle size={14} weight="fill" style={{ color: "var(--accent)" }} />
            <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700 }}>{t("mascots.motionStudioTitle")}</h3>
          </div>
          <p style={{ margin: "2px 0 0", fontSize: "11.5px", color: "var(--muted)" }}>
            {actionShortLabel} · {hasSprite ? t("mascots.motionReadyBadge") : t("mascots.motionMissingBadge")} ·{" "}
            {t("mascots.motionReadyCount", { ready: readyCount, total: CORE_GAMEPLAY_ACTIONS.length })}
          </p>
        </div>

        <span className="action-ready-badge motion-editing-target" style={{ fontSize: "11px" }}>
          {editingTargetBadge}
        </span>
      </div>

      <div className="motion-controls-body">
        <MascotMotionPresetGrid
          currentPreset={currentPreset}
          activePreviewAction={activePreviewAction}
          actionShortLabel={actionShortLabel}
          calibrating={calibrating}
          onChangeMotionPreset={onChangeMotionPreset}
          onSaveMotion={onSaveMotion}
        />
        <MascotMotionSliders
          activePreviewAction={activePreviewAction}
          currentSpeed={currentSpeed}
          currentIntensity={currentIntensity}
          onChangeMotionSpeed={onChangeMotionSpeed}
          onChangeMotionIntensity={onChangeMotionIntensity}
        />
        <MascotMotionResetConfirm onResetDefaultMotions={onResetDefaultMotions} />
      </div>

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
