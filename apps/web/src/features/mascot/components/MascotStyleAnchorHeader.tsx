import { Lock, CheckCircle, WarningCircle, Trash, Clock, CircleNotch } from "@phosphor-icons/react";
import type { MascotStyle } from "@studio/shared";
import { useTranslation } from "../../../i18n";

export interface MascotStyleAnchorHeaderProps {
  style: MascotStyle;
  isCore: boolean;
  hasImage: boolean;
  keywordsList: string[];
  filledPosesCount?: number;
  onDelete?: () => void;
  isBusy?: boolean;
  isQueued?: boolean;
  queuePosition?: number;
  isGenerating?: boolean;
  isUploadedConcept?: boolean;
}

export function MascotStyleAnchorHeader({
  style,
  isCore,
  hasImage,
  keywordsList,
  filledPosesCount = 0,
  onDelete,
  isBusy = false,
  isQueued = false,
  queuePosition = 0,
  isGenerating = false,
  isUploadedConcept = false,
}: MascotStyleAnchorHeaderProps) {
  const { t } = useTranslation();

  return (
    <div className="style-anchor-header">
      <div className="style-anchor-header-left">
        <span className="style-anchor-name">{style.name}</span>
        {keywordsList.length > 0 ? (
          <div className="style-anchor-keywords-list">
            {keywordsList.slice(0, 2).map((kw, i) => (
              <span key={i} className="style-anchor-keyword-chip" title={kw}>
                {kw}
              </span>
            ))}
            {keywordsList.length > 2 ? (
              <span className="style-anchor-keyword-more" title={keywordsList.slice(2).join(", ")}>
                +{keywordsList.length - 2}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="style-anchor-header-right">
        {isCore ? (
          <div className="style-anchor-badge-group">
            {isUploadedConcept ? (
              <span className="style-anchor-badge badge-uploaded" title={t("mascots.coreStyleUploadedTooltip")}>
                {t("mascots.coreStyleUploadedBadge")}
              </span>
            ) : (
              <span className="style-anchor-badge badge-core">{t("mascots.styleAnchorCoreBadge")}</span>
            )}
            <span className="style-anchor-badge badge-locked">
              <Lock size={12} weight="bold" />
              <span>{t("mascots.styleAnchorStatusLocked")}</span>
            </span>
          </div>
        ) : (
          <div className="style-anchor-badge-group">
            {isUploadedConcept ? (
              <span
                className="style-anchor-badge badge-uploaded-ref"
                title={t("mascots.customStyleUploadedAnchorTooltip")}
              >
                {t("mascots.customStyleUploadedAnchorRef")}
              </span>
            ) : null}
            {isGenerating ? (
              <span
                className="style-anchor-badge badge-generating"
                style={{ background: "rgba(6, 182, 212, 0.15)", color: "var(--accent, #06b6d4)", borderColor: "var(--accent, #06b6d4)" }}
              >
                <CircleNotch size={12} className="spin" />
                <span>{t("mascots.generatingBadge")}</span>
              </span>
            ) : isQueued ? (
              <span
                className="style-anchor-badge badge-queued"
                style={{ background: "rgba(245, 158, 11, 0.15)", color: "#f59e0b", borderColor: "#f59e0b" }}
              >
                <Clock size={12} />
                <span>{t("mascots.styleQueuedBadge", { position: queuePosition })}</span>
              </span>
            ) : hasImage ? (
              <span className="style-anchor-badge badge-locked">
                <CheckCircle size={12} weight="fill" />
                <span>{t("mascots.styleAnchorLockedBadge")}</span>
              </span>
            ) : (
              <span className="style-anchor-badge badge-missing">
                <WarningCircle size={12} weight="fill" />
                <span>{t("mascots.styleAnchorMissingBadge")}</span>
              </span>
            )}
            {filledPosesCount > 0 ? (
              <span className="style-anchor-badge badge-poses">{t("mascots.styleAnchorPosesCount", { count: filledPosesCount })}</span>
            ) : null}
          </div>
        )}

        {onDelete && !isCore && (
          <button
            type="button"
            className="quiet-button compact danger-icon-btn"
            onClick={onDelete}
            disabled={isBusy}
            title={t("mascots.deleteStyleBtn")}
          >
            <Trash size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
