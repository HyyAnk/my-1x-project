import { CircleNotch, ShieldCheck, Sparkle } from "@phosphor-icons/react";
import type { QuestionHistoryCheckResult } from "@studio/shared";
import { useTranslation } from "../../i18n";

type QuestionHistoryItem = NonNullable<QuestionHistoryCheckResult["items"]>[number];

export interface QuestionRemixCompactCardProps {
  item: QuestionHistoryItem;
  index: number;
  qId: string;
  isRemixing: boolean;
  remixAction?: { questionId: string; mode: "rephrase" | "replace" } | null;
  onRemixSingle: (questionId: string, mode: "rephrase" | "replace") => Promise<void> | void;
}

export function QuestionRemixCompactCard({
  item,
  index,
  qId,
  isRemixing,
  remixAction,
  onRemixSingle,
}: QuestionRemixCompactCardProps) {
  const { t } = useTranslation();

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
