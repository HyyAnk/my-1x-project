import { CalendarBlank, ShieldCheck } from "@phosphor-icons/react";
import type { QuestionHistoryCheckResult } from "@studio/shared";
import { useTranslation } from "../../i18n";

type QuestionHistoryItem = NonNullable<QuestionHistoryCheckResult["items"]>[number];

export interface QuestionRemixComparisonBodyProps {
  item: QuestionHistoryItem;
}

export function QuestionRemixComparisonBody({ item }: QuestionRemixComparisonBodyProps) {
  const { t } = useTranslation();

  return (
    <div className="remix-card-body">
      {/* Current Question */}
      <div className="remix-col current-col">
        <div className="col-header-tag">
          <span className="col-tag-dot" />
          <span className="col-label">{t("remix.currentVersionLabel")}</span>
        </div>
        <p className="remix-question-text">"{item.current_question_text}"</p>
        <div className="remix-choices-list">
          {item.current_choices.map((choice, i) => {
            const isCorrect = choice === item.current_correct_answer;
            return (
              <span key={i} className={`choice-chip ${isCorrect ? "is-correct" : ""}`}>
                {isCorrect ? "✓ " : ""}
                {choice}
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
  );
}
