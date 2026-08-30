import {
  ArrowRight,
  ArrowsClockwise,
  CheckCircle,
  CircleNotch,
  WarningCircle,
} from "@phosphor-icons/react";
import type { QuestionHistoryCheckResult } from "@studio/shared";
import { useTranslation } from "../../i18n";

export interface QuestionRemixSummaryHeaderProps {
  historyCheck: QuestionHistoryCheckResult | null;
  totalQuestions: number;
  duplicateCount: number;
  remixedCount: number;
  cleanRate: number;
  isRemixing: boolean;
  isGlobalRemixing: boolean;
  onRemixAll: (mode?: "rephrase" | "replace") => Promise<void> | void;
  onContinueBuild?: () => void;
}

export function QuestionRemixSummaryHeader({
  historyCheck,
  totalQuestions,
  duplicateCount,
  remixedCount,
  cleanRate,
  isRemixing,
  isGlobalRemixing,
  onRemixAll,
  onContinueBuild,
}: QuestionRemixSummaryHeaderProps) {
  const { t } = useTranslation();

  return (
    <>
      {/* Header Section */}
      <div className="section-heading remix-header-row">
        <div>
          <h2 className="remix-main-title">{t("remix.title")}</h2>
        </div>
        <div className="scene-heading-actions">
          {duplicateCount > 0 ? (
            <button
              type="button"
              className="remix-bulk-btn has-duplicates"
              onClick={() => void onRemixAll("rephrase")}
              disabled={isRemixing || !historyCheck}
              title={t("remix.remixAllTooltip", { count: duplicateCount })}
            >
              {isGlobalRemixing ? <CircleNotch className="spin" size={16} /> : <ArrowsClockwise size={16} weight="bold" />}
              <span>{t("remix.remixDuplicatesBtn")}</span>
              <span className="remix-count-pill">{duplicateCount}</span>
            </button>
          ) : (
            <div className="remix-clean-badge" title={t("remix.allCleanBadge")}>
              <CheckCircle size={16} weight="fill" />
              <span>{t("remix.allCleanBadge")}</span>
            </div>
          )}

          {onContinueBuild ? (
            <button type="button" className="primary-button" onClick={onContinueBuild}>
              <span>{t("remix.continueBuildBtn")}</span>
              <ArrowRight size={16} />
            </button>
          ) : null}
        </div>
      </div>

      {/* Dashboard Stats Ribbon */}
      <div className={`remix-stats-ribbon ${historyCheck?.passed ? "is-passed" : "is-action-needed"}`}>
        <div className="stats-card status-summary-card">
          <div className="status-indicator-icon">
            {historyCheck?.passed ? (
              <CheckCircle size={32} weight="fill" className="status-icon-passed" />
            ) : (
              <WarningCircle size={32} weight="fill" className="status-icon-warning" />
            )}
          </div>
          <div className="status-text-meta">
            <div className="status-headline">
              <strong className="status-title">
                {historyCheck?.passed
                  ? t("remix.passedHistoryTitle")
                  : t("remix.duplicatesFoundTitle", { count: duplicateCount, plural: duplicateCount > 1 ? "s" : "" })}
              </strong>
              <span className={`status-tag ${historyCheck?.passed ? "is-success" : "is-warning"}`}>
                {historyCheck?.passed ? t("remix.readyTag") : t("remix.actionRecommendedTag")}
              </span>
            </div>
            {!historyCheck?.passed ? (
              <p className="status-subtext">{t("remix.thresholdSubtext", { threshold: historyCheck?.pass_threshold ?? 2 })}</p>
            ) : null}
          </div>
        </div>

        <div className="stats-metrics-grid">
          <div className="metric-box">
            <span className="metric-label">{t("remix.totalQuestions")}</span>
            <span className="metric-value">{totalQuestions}</span>
          </div>

          <div className={`metric-box ${duplicateCount > 0 ? "has-warning" : ""}`}>
            <span className="metric-label">{t("remix.duplicates")}</span>
            <span className="metric-value warning-text">{duplicateCount}</span>
          </div>

          <div className={`metric-box ${remixedCount > 0 ? "has-remixed" : ""}`}>
            <span className="metric-label">{t("remix.aiRemixed")}</span>
            <span className="metric-value remixed-text">{remixedCount}</span>
          </div>

          <div className="metric-box clean-rate-box">
            <div className="clean-rate-header">
              <span className="metric-label">{t("remix.cleanRate")}</span>
              <span className="clean-rate-percent">{cleanRate}%</span>
            </div>
            <div className="clean-progress-track">
              <div
                className={`clean-progress-bar ${cleanRate === 100 ? "is-full" : cleanRate >= 80 ? "is-good" : "is-low"}`}
                style={{ width: `${cleanRate}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
