import { ArrowsClockwise, CircleNotch, ShieldCheck, Sparkle, WarningCircle } from "@phosphor-icons/react";
import type { QuestionHistoryCheckResult } from "@studio/shared";
import { useTranslation } from "../../i18n";

type QuestionHistoryItem = NonNullable<QuestionHistoryCheckResult["items"]>[number];

export interface QuestionRemixCardHeaderProps {
  item: QuestionHistoryItem;
  index: number;
  qId: string;
  isDupe: boolean;
  isRemixed: boolean;
  isClean: boolean;
  isRemixing: boolean;
  remixAction?: { questionId: string; mode: "rephrase" | "replace" } | null;
  onToggleExpandClean: (id: string) => void;
  onRemixSingle: (questionId: string, mode: "rephrase" | "replace") => Promise<void> | void;
}

export function QuestionRemixCardHeader({
  item,
  index,
  qId,
  isDupe,
  isRemixed,
  isClean,
  isRemixing,
  remixAction,
  onToggleExpandClean,
  onRemixSingle,
}: QuestionRemixCardHeaderProps) {
  const { t } = useTranslation();
  const simPercent = Math.round(item.similarity_score * 100);
  const simColorClass = simPercent >= 80 ? "is-high-sim" : simPercent >= 50 ? "is-med-sim" : "is-low-sim";

  return (
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
  );
}
