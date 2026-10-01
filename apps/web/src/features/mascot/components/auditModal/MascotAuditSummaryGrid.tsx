import type { MascotGreenScreenAuditSummary } from "@studio/shared";
import { useTranslation } from "../../../../i18n";

export interface MascotAuditSummaryGridProps {
  summary?: MascotGreenScreenAuditSummary;
}

export function MascotAuditSummaryGrid({ summary }: MascotAuditSummaryGridProps) {
  const { t } = useTranslation();

  const totalChecked = summary?.totalChecked ?? 0;
  const compliantCount = summary?.compliantCount ?? 0;
  const violationCount = summary?.violationCount ?? 0;
  const missingRawCount = summary?.missingRawCount ?? 0;
  const transparencyCount = summary?.transparencyCount ?? 0;
  const insufficientChromaCount = summary?.insufficientChromaCount ?? 0;

  return (
    <>
      <div className="mascot-audit-metrics">
        <div className="audit-metric-card">
          <span className="audit-metric-label">
            {t("mascots.auditTotalChecked") || "Total Checked"}
          </span>
          <span className="audit-metric-value">{totalChecked}</span>
        </div>
        <div className="audit-metric-card is-compliant">
          <span className="audit-metric-label">
            {t("mascots.auditCompliantCount") || "Compliant"}
          </span>
          <span className="audit-metric-value">{compliantCount}</span>
        </div>
        <div
          className={`audit-metric-card ${
            violationCount > 0 ? "has-active-violations" : "is-violations"
          }`}
        >
          <span className="audit-metric-label">
            {t("mascots.auditViolationsCount") || "Violations"}
          </span>
          <span className="audit-metric-value">{violationCount}</span>
        </div>
      </div>

      <div className="audit-breakdown-row">
        <div className="audit-breakdown-chip">
          <span>{t("mascots.auditMissingRawCount") || "Missing Raw"}:</span>
          <span className={`audit-chip-count ${missingRawCount > 0 ? "is-warning" : ""}`}>
            {missingRawCount}
          </span>
        </div>
        <div className="audit-breakdown-chip">
          <span>{t("mascots.auditTransparencyCount") || "Transparency Leaks"}:</span>
          <span className={`audit-chip-count ${transparencyCount > 0 ? "is-danger" : ""}`}>
            {transparencyCount}
          </span>
        </div>
        <div className="audit-breakdown-chip">
          <span>{t("mascots.auditInsufficientChromaCount") || "Non-Green Backdrop"}:</span>
          <span
            className={`audit-chip-count ${insufficientChromaCount > 0 ? "is-warning" : ""}`}
          >
            {insufficientChromaCount}
          </span>
        </div>
      </div>
    </>
  );
}
