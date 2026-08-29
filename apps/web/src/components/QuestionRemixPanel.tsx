import {
  ArrowRight,
  ArrowsClockwise,
  CalendarBlank,
  CheckCircle,
  CircleNotch,
  Sparkle,
  ShieldCheck,
  WarningCircle,
} from "@phosphor-icons/react";
import type { QuestionHistoryCheckResult } from "@studio/shared";
import { useState } from "react";
import { useTranslation } from "../i18n";

export interface QuestionRemixPanelProps {
  historyCheck: QuestionHistoryCheckResult | null;
  isRemixing: boolean;
  remixingQuestionId?: string | null;
  remixAction?: { questionId: string; mode: "rephrase" | "replace" } | null;
  onRemixAll: (mode?: "rephrase" | "replace") => Promise<void> | void;
  onRemixSingle: (questionId: string, mode: "rephrase" | "replace") => Promise<void> | void;
  onContinueBuild?: () => void;
}

export function QuestionRemixPanel({
  historyCheck,
  isRemixing,
  remixingQuestionId,
  remixAction,
  onRemixAll,
  onRemixSingle,
  onContinueBuild,
}: QuestionRemixPanelProps) {
  const { t } = useTranslation();
  const [expandedCleanIds, setExpandedCleanIds] = useState<Record<string, boolean>>({});

  const toggleExpandClean = (id: string) => {
    setExpandedCleanIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const totalQuestions = historyCheck?.total_questions ?? (historyCheck?.items?.length || 0);
  const duplicateCount = historyCheck?.duplicate_count ?? 0;
  const remixedCount = historyCheck?.items.filter((item) => item.status === "remixed").length || 0;
  const cleanRate = totalQuestions > 0 ? Math.round(((totalQuestions - duplicateCount) / totalQuestions) * 100) : 100;

  const isGlobalRemixing = isRemixing && !remixingQuestionId;

  const [showOnlyDuplicates, setShowOnlyDuplicates] = useState(false);

  const displayedItems = (historyCheck?.items || []).filter((item) => {
    if (!showOnlyDuplicates) return true;
    return item.status === "duplicate";
  });

  return (
    <section className="remix-section panel" style={{ marginTop: "12px" }}>
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

      {/* Questions List */}
      {historyCheck && historyCheck.items.length > 0 ? (
        <div className="remix-items-container">
          <div className="remix-list-header">
            <div className="remix-list-header-left">
              <h3 className="remix-list-heading">
                {t("remix.historyHeader", { count: displayedItems.length, total: showOnlyDuplicates ? ` / ${totalQuestions}` : "" })}
              </h3>
            </div>

            {/* Filter On/Off Toggle */}
            <div className="remix-filter-toggle-container">
              <label className="remix-toggle-label">
                <input
                  type="checkbox"
                  className="remix-toggle-input"
                  checked={showOnlyDuplicates}
                  onChange={(e) => setShowOnlyDuplicates(e.target.checked)}
                />
                <span className="remix-toggle-track">
                  <span className="remix-toggle-thumb" />
                </span>
                <span className="remix-toggle-text">
                  {t("remix.showOnlyDuplicates", { count: duplicateCount > 0 ? `(${duplicateCount})` : "" })}
                </span>
              </label>
            </div>
          </div>

          {displayedItems.length === 0 && showOnlyDuplicates ? (
            <div className="artifact-empty remix-filter-empty">
              <CheckCircle size={32} weight="fill" style={{ color: "#10b981", marginBottom: "8px" }} />
              <p>
                <strong>{t("remix.noDuplicatesTitle")}</strong>
              </p>
              <p style={{ fontSize: "13px", color: "var(--muted)", margin: "4px 0 12px" }}>
                {t("remix.noDuplicatesSubtext", { count: totalQuestions })}
              </p>
              <button type="button" className="quiet-button compact" onClick={() => setShowOnlyDuplicates(false)}>
                <span>{t("remix.viewAllQuestions")}</span>
              </button>
            </div>
          ) : (
            <div className="remix-cards-list">
              {displayedItems.map((item) => {
                const index = historyCheck.items.findIndex((cand) => cand.current_question_id === item.current_question_id);
                const qId = item.current_question_id || String(index);
                const isDupe = item.status === "duplicate";
                const isRemixed = item.status === "remixed";
                const isClean = item.status === "passed";
                const isExpanded = expandedCleanIds[qId] ?? false;

                // 1. CLEAN / PASSED QUESTION (Compact 1-Column Format)
                if (isClean && !isExpanded) {
                  return (
                    <div key={qId} className="remix-card is-clean is-compact">
                      <div className="compact-card-content">
                        <div className="compact-left">
                          <span className="q-badge">#{index + 1}</span>
                          <span className="match-status-pill is-clean-pill">
                            <ShieldCheck size={14} weight="bold" />
                            <span>{t("remix.cleanBadge")}</span>
                          </span>
                          <p className="compact-question-text">{item.current_question_text}</p>
                        </div>

                        <div className="compact-right">
                          <div className="compact-choices-row">
                            {item.current_choices.map((c, i) => {
                              const isCorrect = c === item.current_correct_answer;
                              return (
                                <span key={i} className={`choice-chip ${isCorrect ? "is-correct" : ""}`}>
                                  {isCorrect ? "✓ " : ""}
                                  {c}
                                </span>
                              );
                            })}
                          </div>

                          <button
                            type="button"
                            className="remix-action-btn is-replace compact-btn"
                            onClick={() => void onRemixSingle(item.current_question_id, "replace")}
                            disabled={isRemixing}
                            title={t("remix.replaceTooltip")}
                          >
                            {isRemixing && remixAction?.questionId === qId && remixAction?.mode === "replace" ? (
                              <CircleNotch className="spin" size={13} />
                            ) : (
                              <Sparkle size={13} weight="fill" />
                            )}
                            <span>{t("remix.replaceBtn")}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }

                // 2. DUPLICATE OR REMIXED QUESTION (Expanded 2-Column Comparison Format)
                const simPercent = Math.round(item.similarity_score * 100);
                const simColorClass = simPercent >= 80 ? "is-high-sim" : simPercent >= 50 ? "is-med-sim" : "is-low-sim";

                return (
                  <div key={qId} className={`remix-card ${isDupe ? "is-duplicate" : isRemixed ? "is-remixed" : "is-clean"}`}>
                    {/* Card Header with Question number, Badges, Similarity meter & Action buttons */}
                    <div className="remix-card-header">
                      <div className="remix-card-left-meta">
                        <span className="q-badge">{t("quiz.questionNumber", { number: index + 1 })}</span>
                        <span className={`match-status-badge is-${item.status}`}>
                          {isDupe ? (
                            <>
                              <WarningCircle size={15} weight="fill" />
                              <span>{t("remix.duplicateBadge")}</span>
                            </>
                          ) : isRemixed ? (
                            <>
                              <Sparkle size={15} weight="fill" />
                              <span>{t("remix.remixedBadge")}</span>
                            </>
                          ) : (
                            <>
                              <ShieldCheck size={15} weight="fill" />
                              <span>{t("remix.cleanBadge")}</span>
                            </>
                          )}
                        </span>

                        {item.matched_entry ? (
                          <div className={`similarity-meter-box ${simColorClass}`}>
                            <span className="similarity-label">{t("remix.similarityLabel", { score: simPercent })}</span>
                            <div className="similarity-meter-track">
                              <div className="similarity-meter-fill" style={{ width: `${Math.min(100, Math.max(10, simPercent))}%` }} />
                            </div>
                          </div>
                        ) : null}
                      </div>

                      <div className="remix-card-right-actions">
                        <div className="remix-actions-group">
                          {isDupe || isRemixed ? (
                            <button
                              type="button"
                              className="remix-action-btn is-rephrase"
                              onClick={() => void onRemixSingle(item.current_question_id, "rephrase")}
                              disabled={isRemixing}
                              title={t("remix.rephraseTooltip")}
                            >
                              {isRemixing && remixAction?.questionId === qId && remixAction?.mode === "rephrase" ? (
                                <CircleNotch className="spin" size={14} />
                              ) : (
                                <ArrowsClockwise size={14} />
                              )}
                              <span>{t("remix.rephraseBtn")}</span>
                            </button>
                          ) : null}

                          <button
                            type="button"
                            className="remix-action-btn is-replace"
                            onClick={() => void onRemixSingle(item.current_question_id, "replace")}
                            disabled={isRemixing}
                            title={t("remix.replaceTooltip")}
                          >
                            {isRemixing && remixAction?.questionId === qId && remixAction?.mode === "replace" ? (
                              <CircleNotch className="spin" size={14} />
                            ) : (
                              <Sparkle size={14} weight="fill" />
                            )}
                            <span>{t("remix.replaceBtn")}</span>
                          </button>
                        </div>

                        {isClean && (
                          <button type="button" className="compact-toggle-button" onClick={() => toggleExpandClean(qId)}>
                            {t("common.close")}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Card Body: Side-by-Side Comparison */}
                    <div className="remix-card-body">
                      {/* Current Question */}
                      <div className="remix-col current-col">
                        <div className="col-header-tag">
                          <span className="col-tag-dot" />
                          <span className="col-label">{t("remix.currentVersionLabel")}</span>
                        </div>
                        <p className="remix-question-text">"{item.current_question_text}"</p>
                        <div className="remix-choices-list">
                          {item.current_choices.map((c, i) => {
                            const isCorrect = c === item.current_correct_answer;
                            return (
                              <span key={i} className={`choice-chip ${isCorrect ? "is-correct" : ""}`}>
                                {isCorrect ? "✓ " : ""}
                                {c}
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      {/* Historical Match */}
                      {item.matched_entry ? (
                        <div className="remix-col history-col">
                          <div className="col-header-tag is-history">
                            <span className="col-tag-dot is-warning" />
                            <span className="col-label">{t("remix.matchedPastLabel", { title: item.matched_entry.episode_title })}</span>
                          </div>
                          <p className="remix-question-text history-text">"{item.matched_entry.question_text}"</p>
                          <div className="matched-meta-row">
                            <span className="meta-pill">
                              <CalendarBlank size={13} />
                              <span>
                                {new Date(item.matched_entry.rendered_at).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </span>
                            </span>
                            {item.match_reason ? <span className="match-reason-tag">{item.match_reason}</span> : null}
                          </div>
                        </div>
                      ) : (
                        <div className="remix-col history-col is-empty-match">
                          <p className="clean-note">
                            <ShieldCheck size={16} />
                            <span>{t("remix.noSimilarQuestionsNote")}</span>
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="artifact-empty remix-empty-state">
          <p>{t("remix.emptyStateNote")}</p>
        </div>
      )}
    </section>
  );
}
