import { useTranslation } from "../../../../i18n";
import type { MatrixCoverageStats } from "../../types/questionBankUi.types";

export interface AiGenerateDeficitOverviewProps {
  matrixCoverage?: MatrixCoverageStats | null;
  variant?: "preview" | "result";
}

export function AiGenerateDeficitOverview({
  matrixCoverage,
  variant = "preview",
}: AiGenerateDeficitOverviewProps) {
  const { t } = useTranslation();

  if (!matrixCoverage) return null;

  const gradient =
    variant === "result"
      ? "linear-gradient(90deg, #10b981 0%, #06b6d4 100%)"
      : "linear-gradient(90deg, #0891b2 0%, #8b5cf6 100%)";

  return (
    <div className="qb-matrix-preview-card">
      <div className="qb-matrix-preview-header">
        <span>🎯 {t("questionBank.aiModal.matrixStatsTitle")}</span>
        <span className="qb-progress-pct">{matrixCoverage.coverage_percent}%</span>
      </div>
      <div className="qb-progress-track">
        <div
          className="qb-progress-fill"
          style={{
            width: `${Math.max(2, matrixCoverage.coverage_percent)}%`,
            background: gradient,
          }}
        />
      </div>
      <div className="qb-matrix-preview-stats">
        {t("questionBank.aiModal.matrixStatsCoverage", {
          covered: matrixCoverage.covered_combos.toLocaleString(),
          total: matrixCoverage.total_combos.toLocaleString(),
          pct: matrixCoverage.coverage_percent,
          remaining: (matrixCoverage.total_combos - matrixCoverage.covered_combos).toLocaleString(),
        })}
      </div>
    </div>
  );
}
