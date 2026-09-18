import { Lock, CircleNotch, Clock, ArrowCounterClockwise, MagicWand, Trash } from "@phosphor-icons/react";
import { useTranslation } from "../../../i18n";

export interface MascotStyleAnchorActionsProps {
  isCore: boolean;
  hasImage: boolean;
  isThisGenerating: boolean;
  isThisQueued: boolean;
  isCardActionLocked: boolean;
  queuePosition: number;
  onGenerate: () => void;
  onDelete: () => void;
}

export function MascotStyleAnchorActions({
  isCore,
  hasImage,
  isThisGenerating,
  isThisQueued,
  isCardActionLocked,
  queuePosition,
  onGenerate,
  onDelete,
}: MascotStyleAnchorActionsProps) {
  const { t } = useTranslation();

  if (isCore) {
    return (
      <div className="style-anchor-actions is-core-actions">
        <span className="style-anchor-core-note">
          <Lock size={12} weight="bold" />
          <span>{t("mascots.styleAnchorCoreNote")}</span>
        </span>
      </div>
    );
  }

  const actionLabel = isThisGenerating
    ? t("mascots.generatingConceptBtn")
    : isThisQueued
      ? t("mascots.styleQueuedBadge", { position: queuePosition })
      : t(hasImage ? "mascots.rerollConceptBtn" : "mascots.generateStyleConceptBtn");

  const renderActionIcon = () => {
    if (isThisGenerating) {
      return <CircleNotch size={14} className="spin" />;
    }
    if (isThisQueued) {
      return <Clock size={14} />;
    }
    if (hasImage) {
      return <ArrowCounterClockwise size={14} />;
    }
    return <MagicWand size={14} weight="bold" />;
  };

  return (
    <div className="style-anchor-actions">
      <button
        type="button"
        className={`${hasImage ? "quiet-button" : "primary-button"} compact ${isThisQueued ? "is-queued-btn" : ""}`}
        onClick={onGenerate}
        disabled={isCardActionLocked}
        title={actionLabel}
      >
        {renderActionIcon()}
        <span>{actionLabel}</span>
      </button>

      <button
        type="button"
        className="quiet-button compact danger-icon-btn"
        onClick={onDelete}
        disabled={isCardActionLocked}
        title={t("mascots.deleteStyleBtn")}
      >
        <Trash size={14} />
      </button>
    </div>
  );
}
