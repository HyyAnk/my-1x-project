import { Highlighter, Stop } from "@phosphor-icons/react";
import { useTranslation } from "../../../i18n";
import { useHighlightBackfill } from "../hooks/useHighlightBackfill";
import type { HighlightBackfillJobState } from "../types/questionBankHighlight.types";

function progressPercent(job: HighlightBackfillJobState): number {
  return job.progress.total > 0 ? Math.round((job.progress.processed / job.progress.total) * 100) : 0;
}

function FinishedJobSummary({ job }: { job: HighlightBackfillJobState }) {
  const { t } = useTranslation();
  if (job.status === "failed") return <p className="qb-highlight-note qb-highlight-note-error">{job.error}</p>;
  if (job.status !== "completed" && job.status !== "cancelled") return null;
  return (
    <p className="qb-highlight-note">
      {t(job.status === "completed" ? "questionBank.highlightBackfill.completed" : "questionBank.highlightBackfill.cancelled", {
        annotated: job.progress.annotated.toLocaleString(),
        unresolved: (job.progress.unresolved + job.progress.saveFailures).toLocaleString(),
      })}
    </p>
  );
}

/** Shows how many Question Bank questions still lack an LLM-chosen highlight phrase and runs the backfill. */
export function QuestionBankHighlightBackfillPanel() {
  const { t } = useTranslation();
  const { coverage, job, isRunning, error, start, cancel } = useHighlightBackfill();
  if (!coverage || (coverage.missing === 0 && !isRunning && job?.status !== "completed")) return null;

  return (
    <div className="qb-highlight-card" role="region" aria-label={t("questionBank.highlightBackfill.title")}>
      <div className="qb-highlight-row">
        <Highlighter size={18} className="qb-highlight-icon" />
        <div className="qb-highlight-copy">
          <strong>{t("questionBank.highlightBackfill.title")}</strong>
          <span>
            {t("questionBank.highlightBackfill.coverage", {
              withPhrase: coverage.withPhrase.toLocaleString(),
              total: coverage.total.toLocaleString(),
              missing: coverage.missing.toLocaleString(),
            })}
          </span>
        </div>
        {isRunning ? (
          <button type="button" className="qb-btn qb-btn-secondary" onClick={() => void cancel()}>
            <Stop size={14} />
            <span>{t("questionBank.highlightBackfill.cancel")}</span>
          </button>
        ) : (
          <button type="button" className="qb-btn qb-btn-primary" onClick={() => void start()} disabled={coverage.missing === 0}>
            <Highlighter size={14} />
            <span>{t("questionBank.highlightBackfill.start")}</span>
          </button>
        )}
      </div>
      {isRunning && job && (
        <div className="qb-highlight-progress">
          <div className="qb-highlight-track" aria-hidden="true">
            <div className="qb-highlight-fill" style={{ width: `${progressPercent(job)}%` }} />
          </div>
          <span>
            {t("questionBank.highlightBackfill.progress", {
              processed: job.progress.processed.toLocaleString(),
              total: job.progress.total.toLocaleString(),
              annotated: job.progress.annotated.toLocaleString(),
            })}
          </span>
        </div>
      )}
      {!isRunning && job && <FinishedJobSummary job={job} />}
      {error && <p className="qb-highlight-note qb-highlight-note-error">{error}</p>}
    </div>
  );
}
