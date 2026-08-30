import { ArrowsClockwise, CalendarBlank, CircleNotch, ShieldCheck, Sparkle, WarningCircle } from "@phosphor-icons/react";
import type { QuestionHistoryCheckResult } from "@studio/shared";
import { useTranslation } from "../../i18n";

type QuestionHistoryItem = NonNullable<QuestionHistoryCheckResult["items"]>[number];

export interface QuestionRemixItemCardProps {
  item: QuestionHistoryItem;
  index: number;
  isExpandedClean: boolean;
  isRemixing: boolean;
  remixAction?: { questionId: string; mode: "rephrase" | "replace" } | null;
  onToggleExpandClean: (id: string) => void;
  onRemixSingle: (questionId: string, mode: "rephrase" | "replace") => Promise<void> | void;
}

export function QuestionRemixItemCard({
  item,
  index,
  isExpandedClean,
  isRemixing,
  remixAction,
  onToggleExpandClean,
  onRemixSingle,
}: QuestionRemixItemCardProps) {
  const { t } = useTranslation();
  const qId = item.current_question_id || String(index);
  const isDupe = item.status === "duplicate";
  const isRemixed = item.status === "remixed";
  const isClean = item.status === "passed";

  // 1. CLEAN / PASSED QUESTION (Compact 1-Column Format)
  if (isClean && !isExpandedClean) {
    return (
      <div className="remix-card is-clean is-compact">
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
    <div className={`remix-card ${isDupe ? "is-duplicate" : isRemixed ? "is-remixed" : "is-clean"}`}>
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
            <button type="button" className="compact-toggle-button" onClick={() => onToggleExpandClean(qId)}>
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
}
