import { Sparkle, X } from "@phosphor-icons/react";
import { useTranslation } from "../../../i18n";
import type {
  BankTaxonomy,
  MatrixCoverageStats,
  QuestionBankBatchGenPayload,
  QuestionBankBatchGenResponse,
  QuestionBankJobState,
} from "../types/questionBankUi.types";
import {
  AiGenerateActiveJobBanner,
  AiGenerateBatchSettings,
  AiGenerateChunkProgress,
  AiGenerateDeficitOverview,
  AiGenerateManualConfig,
  AiGenerateModeSelector,
  AiGenerateResultList,
  useAiGenerateForm,
} from "./aiGenerate";

export interface QuestionBankAiGenerateModalProps {
  taxonomy: BankTaxonomy | null;
  matrixCoverage?: MatrixCoverageStats | null;
  generating: boolean;
  batchJob?: QuestionBankJobState | null;
  onGenerate: (payload: QuestionBankBatchGenPayload) => Promise<QuestionBankBatchGenResponse>;
  onClose: () => void;
}

export function QuestionBankAiGenerateModal({
  taxonomy,
  matrixCoverage,
  generating,
  batchJob,
  onGenerate,
  onClose,
}: QuestionBankAiGenerateModalProps) {
  const { t } = useTranslation();
  const form = useAiGenerateForm({ taxonomy, onGenerate });

  return (
    <div className="qb-modal-backdrop" onClick={onClose}>
      <div className="qb-modal-card qb-modal-card-large" onClick={(e) => e.stopPropagation()}>
        <div className="qb-modal-header">
          <div className="qb-modal-header-icon">
            <Sparkle size={20} weight="fill" />
            <h2 className="qb-modal-title">{t("questionBank.aiModal.title")}</h2>
          </div>
          <button type="button" className="qb-modal-close" onClick={onClose} title={t("common.close")}>
            <X size={18} />
          </button>
        </div>

        {form.result ? (
          <AiGenerateResultList
            result={form.result}
            targetCount={form.targetCount}
            onReset={() => form.setResult(null)}
            onClose={onClose}
          />
        ) : (
          <form className="qb-modal-body" onSubmit={form.handleSubmit}>
            {form.error && <div className="qb-modal-error">{form.error}</div>}
            <AiGenerateActiveJobBanner batchJob={batchJob} onClose={onClose} />
            <AiGenerateModeSelector mode={form.mode} onChangeMode={form.setMode} disabled={generating} />

            {form.mode === "auto" ? (
              <>
                <p className="qb-modal-intro">{t("questionBank.aiModal.modeAutoDesc")}</p>
                <AiGenerateDeficitOverview matrixCoverage={matrixCoverage} />
              </>
            ) : (
              <AiGenerateManualConfig
                taxonomy={taxonomy}
                domainId={form.domainId}
                subtopicId={form.subtopicId}
                archetypeId={form.archetypeId}
                onDomainChange={form.handleDomainChange}
                onSubtopicChange={form.handleSubtopicChange}
                onArchetypeChange={form.setArchetypeId}
                disabled={generating}
              />
            )}

            <AiGenerateBatchSettings
              targetCount={form.targetCount}
              difficulty={form.difficulty}
              onChangeTargetCount={form.setTargetCount}
              onChangeDifficulty={form.setDifficulty}
              disabled={generating}
            />

            <AiGenerateChunkProgress generating={generating} targetCount={form.targetCount} />

            <div className="qb-modal-footer">
              <button type="button" className="qb-btn qb-btn-ghost" onClick={onClose}>
                {t("questionBank.aiModal.cancelBtn")}
              </button>
              <button type="submit" className="qb-btn qb-btn-primary" disabled={generating}>
                {generating ? (
                  <>
                    <span className="qb-spinner" />
                    <span>{t("questionBank.aiModal.generatingProgress")}</span>
                  </>
                ) : (
                  <>
                    <Sparkle size={16} weight="fill" />
                    <span>
                      {form.mode === "auto"
                        ? t("questionBank.aiModal.autoFillBtn", { count: form.targetCount })
                        : t("questionBank.aiModal.manualFillBtn", { count: form.targetCount })}
                    </span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
