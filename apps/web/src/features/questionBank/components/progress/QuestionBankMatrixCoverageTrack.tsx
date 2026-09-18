import { Sparkle, WarningCircle, CheckCircle } from "@phosphor-icons/react";
import type { QuestionBankMatrixCoverageTrackProps } from "../../types/questionBankProgress.types";
import { useTranslation } from "../../../../i18n";

/**
 * 2D Taxonomy Matrix Coverage track displaying combo saturation,
 * smooth gradient progress rail, deficit count, and quick auto-fill action.
 */
export function QuestionBankMatrixCoverageTrack({
  matrixCoverage,
  onOpenAiAutoFill,
  isCollapsed = false,
  compact = false,
  className = "",
}: QuestionBankMatrixCoverageTrackProps) {
  const { t } = useTranslation();

  if (!matrixCoverage) {
    return (
      <div
        className={`qb-matrix-track is-empty ${compact ? "is-compact" : ""} ${isCollapsed ? "is-collapsed" : ""} ${className}`.trim()}
        role="region"
        aria-label={t("questionBank.splitBar.matrixTrackTitle")}
      >
        <div className="qb-matrix-track-header">
          <div className="qb-matrix-track-meta">
            <div className="qb-matrix-badge">
              <span className="qb-matrix-badge-icon">🎯</span>
              <span className="qb-matrix-badge-name">{t("questionBank.splitBar.matrixTrackTitle")}</span>
            </div>
            <div className="qb-matrix-count-group is-skeleton">
              <span className="qb-matrix-skeleton-text">-- / -- Combos</span>
            </div>
          </div>
          <div className="qb-matrix-percent-badge is-skeleton">
            <span className="qb-percent-val">--%</span>
          </div>
        </div>

        <div
          className="qb-matrix-track-rail qb-compact-rail is-empty"
          role="progressbar"
          aria-valuenow={0}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuetext={t("questionBank.splitBar.matrixTrackTitle")}
        >
          <div className="qb-matrix-track-fill is-empty" style={{ width: "0%" }} />
        </div>
      </div>
    );
  }

  const covered = matrixCoverage.covered_combos ?? 0;
  const total = matrixCoverage.total_combos ?? 0;
  const percent =
    typeof matrixCoverage.coverage_percent === "number"
      ? matrixCoverage.coverage_percent
      : total > 0
        ? Number(((covered / total) * 100).toFixed(1))
        : 0;
  const clampedPercent = Math.max(0, Math.min(100, percent));
  const deficit = Math.max(0, total - covered);
  const isFullCoverage = total > 0 && deficit === 0;

  return (
    <div
      className={`qb-matrix-track ${compact ? "is-compact" : ""} ${isCollapsed ? "is-collapsed" : ""} ${className}`.trim()}
      role="region"
      aria-label={t("questionBank.splitBar.matrixTrackTitle")}
    >
      {/* Metric Header Row */}
      <div className="qb-matrix-track-header">
        <div className="qb-matrix-track-meta">
          <div className="qb-matrix-badge">
            <span className="qb-matrix-badge-icon">🎯</span>
            <span className="qb-matrix-badge-name">{t("questionBank.splitBar.matrixTrackTitle")}</span>
          </div>

          <div className="qb-matrix-count-group">
            <span className="qb-matrix-combo-summary">
              {covered.toLocaleString()} / {total.toLocaleString()} Combos
            </span>
            <span className="qb-matrix-current-num">{covered.toLocaleString()}</span> <span className="qb-matrix-target-slash">/</span>{" "}
            <span className="qb-matrix-target-num">{total.toLocaleString()}</span> <span className="qb-matrix-unit-label">Combos</span>
          </div>
        </div>

        <div className="qb-matrix-percent-badge">
          <span className="qb-percent-val">{percent}%</span>
        </div>
      </div>

      {/* Dedicated Matrix Progress Rail */}
      <div
        className="qb-matrix-track-rail qb-compact-rail"
        role="progressbar"
        aria-valuenow={covered}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuetext={t("questionBank.splitBar.compactAriaMatrix", {
          covered: covered.toLocaleString(),
          total: total.toLocaleString(),
          percent,
        })}
      >
        <div className="qb-matrix-track-fill" style={{ width: `${clampedPercent}%` }}>
          <div className="qb-shimmer-sweep" />
        </div>
      </div>

      {/* Deficit & Quick Action Row */}
      {!isCollapsed && (
        <div className="qb-matrix-track-footer">
          {isFullCoverage ? (
            <span className="qb-matrix-track-deficit is-covered" title={t("questionBank.splitBar.allCombosCoveredDesc")}>
              <CheckCircle size={13} weight="fill" className="qb-matrix-check-icon" />
              <span>{t("questionBank.splitBar.allCombosCovered")}</span>
            </span>
          ) : (
            <span className="qb-matrix-track-deficit is-warning" title={`${deficit.toLocaleString()} combos unfilled`}>
              <WarningCircle size={13} weight="fill" className="qb-matrix-warning-icon" />
              <span>{t("questionBank.splitBar.unfilledCombos", { count: deficit.toLocaleString() })}</span>
            </span>
          )}

          {onOpenAiAutoFill && deficit > 0 && (
            <button
              type="button"
              className="qb-matrix-autofill-btn"
              onClick={onOpenAiAutoFill}
              title={t("questionBank.splitBar.autoFillTooltip")}
              aria-label={t("questionBank.splitBar.autoFillShortcut")}
            >
              <Sparkle size={12} weight="fill" />
              <span>{t("questionBank.splitBar.autoFillShortcut")}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
