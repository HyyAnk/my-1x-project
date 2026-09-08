import { CheckCircle, Sparkle, WarningCircle } from "@phosphor-icons/react";
import { useTranslation } from "../../../../i18n";
import type { QuestionBankBatchGenResponse } from "../../types/questionBankUi.types";
import { AiGenerateDeficitOverview } from "./AiGenerateDeficitOverview";

export interface AiGenerateResultListProps {
  result: QuestionBankBatchGenResponse;
  targetCount: number;
  onReset: () => void;
  onClose: () => void;
}

export function AiGenerateResultList({ result, targetCount, onReset, onClose }: AiGenerateResultListProps) {
  const { t } = useTranslation();

  return (
    <div className="qb-modal-body">
      {result.job ? (
        <div className="qb-gen-result-header">
          <Sparkle size={28} weight="fill" style={{ color: "#06b6d4" }} />
          <div>
            <h3 className="qb-result-title">{t("questionBank.aiModal.backgroundStartedTitle")}</h3>
            <p className="qb-result-subtitle">{t("questionBank.aiModal.backgroundStartedDesc", { count: targetCount })}</p>
          </div>
        </div>
      ) : (
        <div className="qb-gen-result-header">
          <CheckCircle size={28} weight="fill" className="qb-text-success" />
          <div>
            <h3 className="qb-result-title">{t("questionBank.aiModal.successTitleComplete")}</h3>
            <p className="qb-result-subtitle">
              {t("questionBank.aiModal.statsSummary", {
                total: result.generatedCount,
                approved: result.approvedCount,
                rejected: result.rejectedCount,
              })}
            </p>
          </div>
        </div>
      )}

      {/* Updated Matrix Coverage */}
      {result.matrixCoverage && <AiGenerateDeficitOverview matrixCoverage={result.matrixCoverage} variant="result" />}

      {result.rejectedCount > 0 && (
        <div className="qb-rejection-box">
          <div className="qb-rejection-title">
            <WarningCircle size={16} weight="fill" />
            <span>{t("questionBank.aiModal.rejectionReport")}</span>
          </div>
          <ul className="qb-rejection-list">
            {result.rejectedQuestions.map((rej, idx) => (
              <li key={idx}>
                &quot;{rej.question.question}&quot; - {rej.issues.map((i) => i.message).join("; ")}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="qb-modal-footer">
        <button type="button" className="qb-btn qb-btn-secondary" onClick={onReset}>
          {t("questionBank.aiModal.generateAnotherBtn")}
        </button>
        <button type="button" className="qb-btn qb-btn-primary" onClick={onClose}>
          {result.job ? t("questionBank.aiModal.closeAndTrackBtn") : t("questionBank.aiModal.viewInBankBtn")}
        </button>
      </div>
    </div>
  );
}
