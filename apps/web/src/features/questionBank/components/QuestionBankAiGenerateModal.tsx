import { useState } from "react";
import { CheckCircle, ShieldCheck, Sparkle, WarningCircle, X } from "@phosphor-icons/react";
import { useTranslation } from "../../../i18n";
import type {
  BankGameplayArchetypeId,
  BankTaxonomy,
  QuestionBankBatchGenPayload,
  QuestionBankBatchGenResponse,
} from "../types/questionBankUi.types";

const ARCHETYPE_OPTIONS: Array<{ id: BankGameplayArchetypeId }> = [
  { id: "verdict_fact_myth" },
  { id: "speed_blitz" },
  { id: "deep_trivia" },
  { id: "versus_faceoff" },
  { id: "visual_spotting" },
  { id: "visual_identification" },
  { id: "mystery_reveal" },
  { id: "clue_deduction" },
];

export interface QuestionBankAiGenerateModalProps {
  taxonomy: BankTaxonomy | null;
  generating: boolean;
  onGenerate: (payload: QuestionBankBatchGenPayload) => Promise<QuestionBankBatchGenResponse>;
  onClose: () => void;
}

export function QuestionBankAiGenerateModal({ taxonomy, generating, onGenerate, onClose }: QuestionBankAiGenerateModalProps) {
  const { t } = useTranslation();
  const [archetypeId, setArchetypeId] = useState<BankGameplayArchetypeId>("speed_blitz");
  const [domainId, setDomainId] = useState(taxonomy?.domains[0]?.id || "logic_puzzles");
  const [subtopicId, setSubtopicId] = useState("tricky_riddles");
  const [subtopicTitle, setSubtopicTitle] = useState("Tricky Brainteasers & Traps");
  const [count, setCount] = useState(5);
  const [difficulty, setDifficulty] = useState(2);
  const [result, setResult] = useState<QuestionBankBatchGenResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeDomain = taxonomy?.domains.find((d) => d.id === domainId);

  const handleDomainChange = (newDomainId: string) => {
    setDomainId(newDomainId);
    const domain = taxonomy?.domains.find((d) => d.id === newDomainId);
    if (domain && domain.subtopics.length > 0) {
      setSubtopicId(domain.subtopics[0].id);
      setSubtopicTitle(domain.subtopics[0].title);
    }
  };

  const handleSubtopicChange = (newSubId: string) => {
    setSubtopicId(newSubId);
    const sub = activeDomain?.subtopics.find((s) => s.id === newSubId);
    if (sub) setSubtopicTitle(sub.title);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    try {
      const res = await onGenerate({
        archetype_id: archetypeId,
        domain_id: domainId,
        subtopic_id: subtopicId,
        subtopic_title: subtopicTitle,
        count,
        difficulty,
        persist: true,
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("questionBank.aiModal.failedDefault"));
    }
  };

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

        {!result ? (
          <form className="qb-modal-body" onSubmit={handleSubmit}>
            {error && <div className="qb-modal-error">{error}</div>}

            <p className="qb-modal-intro">{t("questionBank.aiModal.intro")}</p>

            <div className="qb-form-grid">
              <div className="qb-form-group">
                <label className="qb-label">{t("questionBank.aiModal.archetypeLabel")}</label>
                <select
                  className="qb-select"
                  value={archetypeId}
                  onChange={(e) => setArchetypeId(e.target.value as BankGameplayArchetypeId)}
                  disabled={generating}
                >
                  {ARCHETYPE_OPTIONS.map((a) => (
                    <option key={a.id} value={a.id}>
                      {t(`questionBank.archetypes.${a.id}` as any)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="qb-form-group">
                <label className="qb-label">{t("questionBank.aiModal.domainLabel")}</label>
                <select className="qb-select" value={domainId} onChange={(e) => handleDomainChange(e.target.value)} disabled={generating}>
                  {(taxonomy?.domains || []).map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="qb-form-grid">
              <div className="qb-form-group">
                <label className="qb-label">{t("questionBank.aiModal.subtopicIdLabel")}</label>
                <select
                  className="qb-select"
                  value={subtopicId}
                  onChange={(e) => handleSubtopicChange(e.target.value)}
                  disabled={generating}
                >
                  {(activeDomain?.subtopics || []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title} ({s.id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="qb-form-group">
                <label className="qb-label">{t("questionBank.aiModal.countVal", { count })}</label>
                <input
                  type="range"
                  min={1}
                  max={20}
                  className="qb-range"
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  disabled={generating}
                />
              </div>
            </div>

            <div className="qb-form-group">
              <label className="qb-label">{t("questionBank.aiModal.difficultyVal", { difficulty })}</label>
              <input
                type="range"
                min={1}
                max={5}
                className="qb-range"
                value={difficulty}
                onChange={(e) => setDifficulty(Number(e.target.value))}
                disabled={generating}
              />
            </div>

            <div className="qb-qa-assurance-box">
              <ShieldCheck size={18} weight="fill" />
              <span>
                <strong>{t("questionBank.aiModal.qaAssuranceTitle")}</strong> {t("questionBank.aiModal.qaAssuranceDesc")}
              </span>
            </div>

            <div className="qb-modal-footer">
              <button type="button" className="qb-btn qb-btn-ghost" onClick={onClose} disabled={generating}>
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
                    <span>{t("questionBank.aiModal.startBtnCount", { count })}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          /* Report View After Generation */
          <div className="qb-modal-body">
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
              <button type="button" className="qb-btn qb-btn-secondary" onClick={() => setResult(null)}>
                {t("questionBank.aiModal.generateAnotherBtn")}
              </button>
              <button type="button" className="qb-btn qb-btn-primary" onClick={onClose}>
                {t("questionBank.aiModal.viewInBankBtn")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
