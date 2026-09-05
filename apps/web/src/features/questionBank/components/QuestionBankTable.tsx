import { CaretLeft, CaretRight, CheckCircle, Clock, PencilSimple, Trash } from "@phosphor-icons/react";
import type { BankQuestionWithCooldown } from "../types/questionBankUi.types";
import { useTranslation } from "../../../i18n";

export interface QuestionBankTableProps {
  questions: BankQuestionWithCooldown[];
  total: number;
  loading: boolean;
  page: number;
  pageSize: number;
  selectedId: string | null;
  hasChannelSelected: boolean;
  onSelectQuestion: (q: BankQuestionWithCooldown) => void;
  onEditQuestion: (q: BankQuestionWithCooldown) => void;
  onDeleteQuestion: (id: string) => void;
  onPageChange: (newPage: number) => void;
}

export function QuestionBankTable({
  questions,
  total,
  loading,
  page,
  pageSize,
  selectedId,
  hasChannelSelected,
  onSelectQuestion,
  onEditQuestion,
  onDeleteQuestion,
  onPageChange,
}: QuestionBankTableProps) {
  const { t } = useTranslation();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (loading) {
    return (
      <div className="qb-table-loading">
        <div className="qb-spinner" />
        <span>{t("questionBank.table.loading")}</span>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="qb-table-empty">
        <p className="qb-empty-title">{t("questionBank.table.emptyTitle")}</p>
        <p className="qb-empty-desc">{t("questionBank.table.emptyDesc")}</p>
      </div>
    );
  }

  return (
    <div className="qb-table-container">
      <div className="qb-table-scroll">
        <table className="qb-table">
          <thead>
            <tr>
              <th style={{ width: "130px" }}>{t("questionBank.table.colIdArchetype")}</th>
              <th>{t("questionBank.table.colQuestion")}</th>
              {hasChannelSelected && <th style={{ width: "140px" }}>{t("questionBank.table.colCooldown")}</th>}
              <th style={{ width: "80px" }}>{t("questionBank.table.colDifficulty")}</th>
              <th style={{ width: "100px", textAlign: "right" }}>{t("questionBank.table.colActions")}</th>
            </tr>
          </thead>
          <tbody>
            {questions.map((q) => {
              const isSelected = q.id === selectedId;
              const cooldown = q.channel_cooldown;

              return (
                <tr key={q.id} className={`qb-row ${isSelected ? "is-selected" : ""}`} onClick={() => onSelectQuestion(q)}>
                  <td>
                    <div className="qb-cell-id">
                      <span className="qb-q-id">{q.id}</span>
                      <span className="qb-q-archetype">{q.archetype_id}</span>
                    </div>
                  </td>
                  <td>
                    <div className="qb-cell-question">
                      <div className="qb-q-title-row">
                        <span className="qb-lang-pill">{(q.language || "EN").toUpperCase()}</span>
                        <span className="qb-q-text">{q.question}</span>
                        {q.translations && Object.keys(q.translations).filter((l) => l !== (q.language || "en")).length > 0 && (
                          <span className="qb-trans-badge qb-trans-ready" title={t("questionBank.table.transReadyTitle")}>
                            {t("questionBank.table.transReady")}
                          </span>
                        )}
                      </div>
                      <span className="qb-q-sub">
                        {q.subtopic_id} • {t("questionBank.table.choicesCount", { count: q.choices?.length ?? 0 })} •{" "}
                        {t("questionBank.table.correctChoice", { id: q.correct_choice_id })}
                      </span>
                    </div>
                  </td>
                  {hasChannelSelected && (
                    <td>
                      {cooldown ? (
                        cooldown.is_cooldown ? (
                          <span
                            className="qb-badge qb-badge-cooldown"
                            title={t("questionBank.table.cooldownLastUsed", { episode: cooldown.episode_title || "recent" })}
                          >
                            <Clock size={13} weight="bold" />
                            <span>{t("questionBank.table.cooldownDaysRemaining", { days: cooldown.days_remaining })}</span>
                          </span>
                        ) : (
                          <span className="qb-badge qb-badge-ready" title={t("questionBank.table.readyTitle")}>
                            <CheckCircle size={13} weight="fill" />
                            <span>{t("questionBank.table.ready")}</span>
                          </span>
                        )
                      ) : (
                        <span className="qb-badge qb-badge-neutral">-</span>
                      )}
                    </td>
                  )}
                  <td>
                    <span className="qb-diff-badge">⭐ {q.difficulty}/5</span>
                  </td>
                  <td>
                    <div className="qb-actions-cell" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="qb-icon-btn"
                        onClick={() => onEditQuestion(q)}
                        title={t("questionBank.table.editTitle")}
                      >
                        <PencilSimple size={15} />
                      </button>
                      <button
                        type="button"
                        className="qb-icon-btn qb-icon-btn-danger"
                        onClick={() => onDeleteQuestion(q.id)}
                        title={t("questionBank.table.deleteTitle")}
                      >
                        <Trash size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="qb-pagination-bar">
        <span className="qb-page-info">
          {t("questionBank.table.showingRange", {
            start: total > 0 ? (page - 1) * pageSize + 1 : 0,
            end: Math.min(page * pageSize, total),
            total: total.toLocaleString(),
          })}
        </span>
        <div className="qb-page-controls">
          <button
            type="button"
            className="qb-page-btn"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            title={t("questionBank.table.prevPage")}
          >
            <CaretLeft size={14} />
          </button>
          <span className="qb-page-curr">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            className="qb-page-btn"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            title={t("questionBank.table.nextPage")}
          >
            <CaretRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
