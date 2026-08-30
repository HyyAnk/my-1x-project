import { useState } from "react";
import { CheckCircle } from "@phosphor-icons/react";
import type { QuestionHistoryCheckResult } from "@studio/shared";
import { useTranslation } from "../i18n";
import { QuestionRemixSummaryHeader } from "./remix/QuestionRemixSummaryHeader";
import { QuestionRemixItemCard } from "./remix/QuestionRemixItemCard";

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
  const [showOnlyDuplicates, setShowOnlyDuplicates] = useState(false);

  const toggleExpandClean = (id: string) => {
    setExpandedCleanIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const totalQuestions = historyCheck?.total_questions ?? (historyCheck?.items?.length || 0);
  const duplicateCount = historyCheck?.duplicate_count ?? 0;
  const remixedCount = historyCheck?.items.filter((item) => item.status === "remixed").length || 0;
  const cleanRate = totalQuestions > 0 ? Math.round(((totalQuestions - duplicateCount) / totalQuestions) * 100) : 100;
  const isGlobalRemixing = isRemixing && !remixingQuestionId;

  const displayedItems = (historyCheck?.items || []).filter((item) => {
    if (!showOnlyDuplicates) return true;
    return item.status === "duplicate";
  });

  return (
    <section className="remix-section panel" style={{ marginTop: "12px" }}>
      <QuestionRemixSummaryHeader
        historyCheck={historyCheck}
        totalQuestions={totalQuestions}
        duplicateCount={duplicateCount}
        remixedCount={remixedCount}
        cleanRate={cleanRate}
        isRemixing={isRemixing}
        isGlobalRemixing={isGlobalRemixing}
        onRemixAll={onRemixAll}
        onContinueBuild={onContinueBuild}
      />

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
                return (
                  <QuestionRemixItemCard
                    key={qId}
                    item={item}
                    index={index}
                    isExpandedClean={expandedCleanIds[qId] ?? false}
                    isRemixing={isRemixing}
                    remixAction={remixAction}
                    onToggleExpandClean={toggleExpandClean}
                    onRemixSingle={onRemixSingle}
                  />
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
