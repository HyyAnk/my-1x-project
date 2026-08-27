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

export interface QuestionRemixPanelProps {
  historyCheck: QuestionHistoryCheckResult | null;
  isRemixing: boolean;
  remixingQuestionId?: string | null;
  onRemixAll: () => Promise<void> | void;
  onRemixSingle: (questionId: string) => Promise<void> | void;
  onContinueBuild?: () => void;
}

export function QuestionRemixPanel({
  historyCheck,
  isRemixing,
  remixingQuestionId,
  onRemixAll,
  onRemixSingle,
  onContinueBuild,
}: QuestionRemixPanelProps) {
  const [expandedCleanIds, setExpandedCleanIds] = useState<Record<string, boolean>>({});

  const toggleExpandClean = (id: string) => {
    setExpandedCleanIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const totalQuestions = historyCheck?.total_questions ?? (historyCheck?.items?.length || 0);
  const duplicateCount = historyCheck?.duplicate_count ?? 0;
  const remixedCount = historyCheck?.items.filter((item) => item.status === "remixed").length || 0;
  const cleanRate = totalQuestions > 0 ? Math.round(((totalQuestions - duplicateCount) / totalQuestions) * 100) : 100;

  const isGlobalRemixing = isRemixing && !remixingQuestionId;

  return (
    <section className="remix-section panel" style={{ marginTop: "12px" }}>
      {/* Header Section */}
      <div className="section-heading remix-header-row">
        <div>
          <p className="eyebrow">Content Quality & Anti-Duplicate</p>
          <h2 className="remix-main-title">Question Remix & Quality Check</h2>
        </div>
        <div className="scene-heading-actions">
          <button
            type="button"
            className="secondary-button remix-cta-button"
            onClick={() => void onRemixAll()}
            disabled={isRemixing || !historyCheck || duplicateCount === 0}
            title={duplicateCount === 0 ? "No duplicate questions to remix" : "Remix all detected duplicates"}
          >
            {isGlobalRemixing ? <CircleNotch className="spin" size={17} /> : <ArrowsClockwise size={17} />}
            <span>Remix Duplicates ({duplicateCount})</span>
          </button>
          {onContinueBuild ? (
            <button
              type="button"
              className="primary-button"
              onClick={onContinueBuild}
            >
              <span>Continue Build</span>
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
                  ? "Passed History Validation"
                  : `${duplicateCount} Duplicate Question${duplicateCount > 1 ? "s" : ""} Found`}
              </strong>
              <span className={`status-tag ${historyCheck?.passed ? "is-success" : "is-warning"}`}>
                {historyCheck?.passed ? "READY" : "ACTION RECOMMENDED"}
              </span>
            </div>
            <p className="status-subtext">
              {historyCheck?.passed
                ? "All questions are unique against past 30 days history."
                : `Anti-duplicate check threshold: <= ${historyCheck?.pass_threshold ?? 2} duplicates allowed.`}
            </p>
          </div>
        </div>

        <div className="stats-metrics-grid">
          <div className="metric-box">
            <span className="metric-label">Total Questions</span>
            <span className="metric-value">{totalQuestions}</span>
          </div>

          <div className={`metric-box ${duplicateCount > 0 ? "has-warning" : ""}`}>
            <span className="metric-label">Duplicates</span>
            <span className="metric-value warning-text">{duplicateCount}</span>
          </div>

          <div className={`metric-box ${remixedCount > 0 ? "has-remixed" : ""}`}>
            <span className="metric-label">AI Remixed</span>
            <span className="metric-value remixed-text">{remixedCount}</span>
          </div>

          <div className="metric-box clean-rate-box">
            <div className="clean-rate-header">
              <span className="metric-label">Clean Rate</span>
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
            <h3 className="remix-list-heading">
              Questions & History Verification ({historyCheck.items.length})
            </h3>
            <span className="remix-list-hint">
              Adaptive View: Clean questions are condensed. Duplicates show comparison & remix action.
            </span>
          </div>

          <div className="remix-cards-list">
            {historyCheck.items.map((item, index) => {
              const qId = item.current_question_id || String(index);
              const isDupe = item.status === "duplicate";
              const isRemixed = item.status === "remixed";
              const isClean = item.status === "passed";
              const isSingleRemixing = isRemixing && remixingQuestionId === qId;
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
                          <span>Clean</span>
                        </span>
                        <p className="compact-question-text">{item.current_question_text}</p>
                      </div>

                      <div className="compact-right">
                        <div className="compact-choices-row">
                          {item.current_choices.map((c, i) => {
                            const isCorrect = c === item.current_correct_answer;
                            return (
                              <span
                                key={i}
                                className={`choice-chip ${isCorrect ? "is-correct" : ""}`}
                              >
                                {isCorrect ? "✓ " : ""}
                                {c}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              // 2. DUPLICATE OR REMIXED QUESTION (Expanded 2-Column Comparison Format)
              const simPercent = Math.round(item.similarity_score * 100);
              const simColorClass =
                simPercent >= 80 ? "is-high-sim" : simPercent >= 50 ? "is-med-sim" : "is-low-sim";

              return (
                <div
                  key={qId}
                  className={`remix-card ${isDupe ? "is-duplicate" : isRemixed ? "is-remixed" : "is-clean"}`}
                >
                  {/* Card Header with Question number, Badges, Similarity meter & Action button */}
                  <div className="remix-card-header">
                    <div className="remix-card-left-meta">
                      <span className="q-badge">Question #{index + 1}</span>
                      <span className={`match-status-badge is-${item.status}`}>
                        {isDupe ? (
                          <>
                            <WarningCircle size={15} weight="fill" />
                            <span>Duplicate in History</span>
                          </>
                        ) : isRemixed ? (
                          <>
                            <Sparkle size={15} weight="fill" />
                            <span>AI Remixed</span>
                          </>
                        ) : (
                          <>
                            <ShieldCheck size={15} weight="fill" />
                            <span>Verified Clean</span>
                          </>
                        )}
                      </span>

                      {item.matched_entry ? (
                        <div className={`similarity-meter-box ${simColorClass}`}>
                          <span className="similarity-label">Similarity: {simPercent}%</span>
                          <div className="similarity-meter-track">
                            <div
                              className="similarity-meter-fill"
                              style={{ width: `${Math.min(100, Math.max(10, simPercent))}%` }}
                            />
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <div className="remix-card-right-actions">
                      {(isDupe || isRemixed) && (
                        <button
                          type="button"
                          className={`remix-item-button ${isDupe ? "is-dupe-btn" : "is-remixed-btn"}`}
                          onClick={() => void onRemixSingle(item.current_question_id)}
                          disabled={isRemixing}
                          title="Remix only this question with AI"
                        >
                          {isSingleRemixing ? (
                            <CircleNotch className="spin" size={15} />
                          ) : (
                            <ArrowsClockwise size={15} />
                          )}
                          <span>{isRemixed ? "Re-remix" : "Remix this question"}</span>
                        </button>
                      )}

                      {isClean && (
                        <button
                          type="button"
                          className="compact-toggle-button"
                          onClick={() => toggleExpandClean(qId)}
                        >
                          Collapse
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
                        <span className="col-label">Current Episode Version</span>
                      </div>
                      <p className="remix-question-text">"{item.current_question_text}"</p>
                      <div className="remix-choices-list">
                        {item.current_choices.map((c, i) => {
                          const isCorrect = c === item.current_correct_answer;
                          return (
                            <span
                              key={i}
                              className={`choice-chip ${isCorrect ? "is-correct" : ""}`}
                            >
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
                          <span className="col-label">
                            Matched Past Episode: <strong>{item.matched_entry.episode_title}</strong>
                          </span>
                        </div>
                        <p className="remix-question-text history-text">
                          "{item.matched_entry.question_text}"
                        </p>
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
                          {item.match_reason ? (
                            <span className="match-reason-tag">{item.match_reason}</span>
                          ) : null}
                        </div>
                      </div>
                    ) : (
                      <div className="remix-col history-col is-empty-match">
                        <p className="clean-note">
                          <ShieldCheck size={16} />
                          <span>No similar questions found in past 30 days history.</span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="artifact-empty remix-empty-state">
          <p>
            No question history comparison available. Click <strong>Generate script / Quiz</strong> in
            Step 1 to perform automated history checking.
          </p>
        </div>
      )}
    </section>
  );
}
