import { useState } from "react";
import { CheckCircle, Compass, Funnel, ShieldCheck, Sparkle, WarningCircle, X } from "@phosphor-icons/react";
import { useTranslation } from "../../../i18n";
import type {
  BankGameplayArchetypeId,
  BankTaxonomy,
  MatrixCoverageStats,
  QuestionBankBatchGenPayload,
  QuestionBankBatchGenResponse,
  QuestionBankJobState,
} from "../types/questionBankUi.types";

const ARCHETYPE_OPTIONS: Array<{ id: BankGameplayArchetypeId; label: string; icon: string }> = [
  { id: "verdict_true_false", label: "True or False", icon: "⚖️" },
  { id: "speed_blitz", label: "Speed Blitz", icon: "⚡" },
  { id: "deep_trivia", label: "Deep Trivia", icon: "🧠" },
  { id: "versus_faceoff", label: "1v1 Faceoff", icon: "⚔️" },
  { id: "visual_spotting", label: "Visual Spotting", icon: "👁️" },
  { id: "visual_identification", label: "Visual ID", icon: "🔍" },
  { id: "mystery_reveal", label: "Mystery Reveal", icon: "🎭" },
  { id: "clue_deduction", label: "Clue Deduction", icon: "🕵️" },
];

const BATCH_SIZE_OPTIONS = [20, 40, 60, 100, 200, 500];

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
  const [mode, setMode] = useState<"auto" | "manual">("auto");
  const [targetCount, setTargetCount] = useState(20);
  const [archetypeId, setArchetypeId] = useState<BankGameplayArchetypeId | "">("");
  const [domainId, setDomainId] = useState<string>("");
  const [subtopicId, setSubtopicId] = useState<string>("");
  const [subtopicTitle, setSubtopicTitle] = useState<string>("");
  const [difficulty, setDifficulty] = useState(2);
  const [result, setResult] = useState<QuestionBankBatchGenResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeDomain = taxonomy?.domains.find((d) => d.id === domainId);

  const handleDomainChange = (newDomainId: string) => {
    setDomainId(newDomainId);
    if (!newDomainId) {
      setSubtopicId("");
      setSubtopicTitle("");
      return;
    }
    const domain = taxonomy?.domains.find((d) => d.id === newDomainId);
    if (domain && domain.subtopics.length > 0) {
      setSubtopicId(domain.subtopics[0].id);
      setSubtopicTitle(domain.subtopics[0].title);
    } else {
      setSubtopicId("");
      setSubtopicTitle("");
    }
  };

  const handleSubtopicChange = (newSubId: string) => {
    setSubtopicId(newSubId);
    const sub = activeDomain?.subtopics.find((s) => s.id === newSubId);
    if (sub) setSubtopicTitle(sub.title);
    else setSubtopicTitle("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    try {
      const payload: QuestionBankBatchGenPayload = {
        mode,
        count: targetCount,
        target_count: targetCount,
        difficulty,
        persist: true,
      };

      if (mode === "manual") {
        if (archetypeId) payload.archetype_id = archetypeId as BankGameplayArchetypeId;
        if (domainId) payload.domain_id = domainId;
        if (subtopicId) {
          payload.subtopic_id = subtopicId;
          payload.subtopic_title = subtopicTitle;
        }
      }

      const res = await onGenerate(payload);
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("questionBank.aiModal.failedDefault"));
    }
  };

  const totalChunks = Math.ceil(targetCount / 20);

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

            {/* Active Job Banner */}
            {batchJob && batchJob.status === "running" && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                  padding: "10px 14px",
                  marginBottom: "16px",
                  borderRadius: "8px",
                  background: "rgba(6, 182, 212, 0.08)",
                  border: "1px solid rgba(6, 182, 212, 0.25)",
                  fontSize: "13px",
                }}
              >
                <span>
                  {t("questionBank.aiModal.activeJobNotice", {
                    completed: batchJob.progress.completedCount,
                    target: batchJob.targetCount,
                  })}
                </span>
                <button
                  type="button"
                  className="qb-btn qb-btn-secondary qb-btn-sm"
                  onClick={onClose}
                  style={{ whiteSpace: "nowrap" }}
                >
                  {t("questionBank.aiModal.viewInActivityBarBtn")}
                </button>
              </div>
            )}

            {/* Mode Switching Tabs */}
            <div className="qb-mode-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={mode === "auto"}
                className={`qb-mode-tab-btn ${mode === "auto" ? "is-active" : ""}`}
                onClick={() => setMode("auto")}
                disabled={generating}
              >
                <Compass size={16} weight="bold" />
                <span>{t("questionBank.aiModal.modeAuto")}</span>
                <span className="qb-badge-auto">{t("questionBank.aiModal.modeAutoTag")}</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "manual"}
                className={`qb-mode-tab-btn ${mode === "manual" ? "is-active" : ""}`}
                onClick={() => setMode("manual")}
                disabled={generating}
              >
                <Funnel size={16} weight="bold" />
                <span>{t("questionBank.aiModal.modeManual")}</span>
              </button>
            </div>

            {/* Mode-Specific Explanations & Controls */}
            {mode === "auto" ? (
              <>
                <p className="qb-modal-intro">{t("questionBank.aiModal.modeAutoDesc")}</p>

                {/* Matrix Coverage Preview */}
                {matrixCoverage && (
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
                          background: "linear-gradient(90deg, #0891b2 0%, #8b5cf6 100%)",
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
                )}
              </>
            ) : (
              <>
                <p className="qb-modal-intro">{t("questionBank.aiModal.modeManualDesc")}</p>

                <div className="qb-form-grid">
                  <div className="qb-form-group">
                    <label className="qb-label">{t("questionBank.aiModal.domainLabel")}</label>
                    <select
                      className="qb-select"
                      value={domainId}
                      onChange={(e) => handleDomainChange(e.target.value)}
                      disabled={generating}
                    >
                      <option value="">{t("questionBank.filters.allDomains")}</option>
                      {(taxonomy?.domains || []).map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="qb-form-group">
                    <label className="qb-label">{t("questionBank.aiModal.subtopicIdLabel")}</label>
                    <select
                      className="qb-select"
                      value={subtopicId}
                      onChange={(e) => handleSubtopicChange(e.target.value)}
                      disabled={generating || !domainId}
                    >
                      <option value="">{t("questionBank.aiModal.allSubtopicsOption")}</option>
                      {(activeDomain?.subtopics || []).map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.title} ({s.id})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="qb-form-group">
                  <label className="qb-label">{t("questionBank.aiModal.archetypeLabel")}</label>
                  <select
                    className="qb-select"
                    value={archetypeId}
                    onChange={(e) => setArchetypeId(e.target.value as BankGameplayArchetypeId)}
                    disabled={generating}
                  >
                    <option value="">{t("questionBank.aiModal.allArchetypesOption")}</option>
                    {ARCHETYPE_OPTIONS.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.icon} {t(`questionBank.archetypes.${a.id}` as any) || a.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div
                  className="qb-qa-assurance-box"
                  style={{ background: "rgba(59, 130, 246, 0.08)", borderColor: "rgba(59, 130, 246, 0.25)" }}
                >
                  <ShieldCheck size={18} weight="fill" />
                  <span>{t("questionBank.aiModal.leastVariantNotice")}</span>
                </div>
              </>
            )}

            {/* Target Batch Size Chips */}
            <div className="qb-form-group">
              <label className="qb-label">{t("questionBank.aiModal.targetCountLabel")}</label>
              <div className="qb-volume-chips">
                {BATCH_SIZE_OPTIONS.map((size) => (
                  <button
                    key={size}
                    type="button"
                    className={`qb-volume-chip ${targetCount === size ? "is-selected" : ""}`}
                    onClick={() => setTargetCount(size)}
                    disabled={generating}
                  >
                    {size} Questions ({Math.ceil(size / 20)} {Math.ceil(size / 20) === 1 ? "chunk" : "chunks"})
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty Slider */}
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

            {/* Chunking / Auto-QA Info */}
            <div className="qb-qa-assurance-box">
              <ShieldCheck size={18} weight="fill" />
              <span>
                <strong>{t("questionBank.aiModal.qaAssuranceTitle")}</strong> {t("questionBank.aiModal.qaAssuranceDesc")}
              </span>
            </div>

            {/* Generating Live Feedback */}
            {generating && (
              <div className="qb-chunk-progress-box">
                <div className="qb-chunk-progress-header">
                  <span>
                    <span className="qb-spinner" style={{ display: "inline-block", marginRight: "8px" }} />
                    {totalChunks > 1
                      ? t("questionBank.aiModal.generatingChunk", {
                          current: 1,
                          total: totalChunks,
                          completed: 0,
                          target: targetCount,
                        })
                      : t("questionBank.aiModal.generatingProgress")}
                  </span>
                </div>
                <div className="qb-chunk-progress-note">{t("questionBank.aiModal.chunkNotice")}</div>
              </div>
            )}

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
                      {mode === "auto"
                        ? t("questionBank.aiModal.autoFillBtn", { count: targetCount })
                        : t("questionBank.aiModal.manualFillBtn", { count: targetCount })}
                    </span>
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          /* Report View After Generation */
          <div className="qb-modal-body">
            {result.job ? (
              <div className="qb-gen-result-header">
                <Sparkle size={28} weight="fill" style={{ color: "#06b6d4" }} />
                <div>
                  <h3 className="qb-result-title">{t("questionBank.aiModal.backgroundStartedTitle")}</h3>
                  <p className="qb-result-subtitle">
                    {t("questionBank.aiModal.backgroundStartedDesc", { count: targetCount })}
                  </p>
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
            {result.matrixCoverage && (
              <div className="qb-matrix-preview-card">
                <div className="qb-matrix-preview-header">
                  <span>🎯 {t("questionBank.aiModal.matrixStatsTitle")}</span>
                  <span className="qb-progress-pct">{result.matrixCoverage.coverage_percent}%</span>
                </div>
                <div className="qb-progress-track">
                  <div
                    className="qb-progress-fill"
                    style={{
                      width: `${Math.max(2, result.matrixCoverage.coverage_percent)}%`,
                      background: "linear-gradient(90deg, #10b981 0%, #06b6d4 100%)",
                    }}
                  />
                </div>
                <div className="qb-matrix-preview-stats">
                  {t("questionBank.aiModal.matrixStatsCoverage", {
                    covered: result.matrixCoverage.covered_combos.toLocaleString(),
                    total: result.matrixCoverage.total_combos.toLocaleString(),
                    pct: result.matrixCoverage.coverage_percent,
                    remaining: (result.matrixCoverage.total_combos - result.matrixCoverage.covered_combos).toLocaleString(),
                  })}
                </div>
              </div>
            )}

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
                {result.job
                  ? t("questionBank.aiModal.closeAndTrackBtn")
                  : t("questionBank.aiModal.viewInBankBtn")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
