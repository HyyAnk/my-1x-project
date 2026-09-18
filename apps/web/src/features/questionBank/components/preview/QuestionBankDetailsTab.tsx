import { CheckCircle, Clock } from "@phosphor-icons/react";
import type { BankQuestionWithCooldown } from "../../types/questionBankUi.types";
import { useTranslation } from "../../../../i18n";

export interface QuestionBankDetailsTabProps {
  question: BankQuestionWithCooldown;
  currentExplanation?: string | null;
  currentFunFact?: string | null;
}

export function QuestionBankDetailsTab({
  question,
  currentExplanation = question.explanation,
  currentFunFact = question.fun_fact,
}: QuestionBankDetailsTabProps) {
  const { t } = useTranslation();
  const cooldown = question.channel_cooldown;

  return (
    <>
      {/* Explanation & Facts */}
      <div className="qb-preview-info-box">
        <div className="qb-info-row">
          <strong>{t("questionBank.preview.explanation")}</strong>
          <p>{currentExplanation || t("questionBank.preview.noExplanation")}</p>
        </div>
        {currentFunFact && (
          <div className="qb-info-row qb-info-funfact">
            <strong>{t("questionBank.preview.funFact")}</strong>
            <p>{currentFunFact}</p>
          </div>
        )}
      </div>

      {/* Question Spec Metadata Grid */}
      <div className="qb-metadata-grid">
        <div className="qb-metadata-item">
          <span className="qb-metadata-label">Archetype</span>
          <span className="qb-metadata-val">{question.archetype_id}</span>
        </div>
        <div className="qb-metadata-item">
          <span className="qb-metadata-label">Domain</span>
          <span className="qb-metadata-val">{question.domain_id.replaceAll("_", " ")}</span>
        </div>
        <div className="qb-metadata-item">
          <span className="qb-metadata-label">Topic / Subtopic</span>
          <span className="qb-metadata-val">{(question.subtopic_id || "").replaceAll("_", " ")}</span>
        </div>
        <div className="qb-metadata-item">
          <span className="qb-metadata-label">Thinking Time</span>
          <span className="qb-metadata-val">{question.thinking_seconds ?? 4}s</span>
        </div>
        <div className="qb-metadata-item">
          <span className="qb-metadata-label">Audience / Age</span>
          <span className="qb-metadata-val">{question.age_band || "family"}</span>
        </div>
        <div className="qb-metadata-item">
          <span className="qb-metadata-label">Difficulty</span>
          <span className="qb-metadata-val">⭐ {question.difficulty ?? 2}/5</span>
        </div>

        {/* Tags */}
        {question.tags && question.tags.length > 0 && (
          <div className="qb-metadata-item" style={{ gridColumn: "span 2" }}>
            <span className="qb-metadata-label">Tags</span>
            <span className="qb-metadata-val">{question.tags.join(", ")}</span>
          </div>
        )}

        {/* Channel Cooldown Badge */}
        {cooldown && (
          <div className="qb-metadata-item" style={{ gridColumn: "span 2" }}>
            <span className="qb-metadata-label">Channel Cooldown</span>
            <div style={{ marginTop: "4px" }}>
              {cooldown.is_cooldown ? (
                <span
                  className="qb-badge qb-badge-cooldown"
                  title={t("questionBank.table.cooldownLastUsed", {
                    episode: cooldown.episode_title || "recent",
                  })}
                >
                  <Clock size={13} weight="bold" />
                  <span>
                    {cooldown.content_type === "short_reel"
                      ? `Short (${cooldown.days_remaining}d)`
                      : cooldown.content_type === "episode"
                        ? `Episode (${cooldown.days_remaining}d)`
                        : `Cooldown (${cooldown.days_remaining}d)`}
                  </span>
                </span>
              ) : (
                <span className="qb-badge qb-badge-ready" title={t("questionBank.table.readyTitle")}>
                  <CheckCircle size={13} weight="fill" />
                  <span>{t("questionBank.table.ready")}</span>
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Visual Spec Image Prompt */}
      {question.visual_spec?.prompt && (
        <div className="qb-preview-info-box">
          <strong>Visual Prompt (English):</strong>
          <p>{question.visual_spec.prompt}</p>
        </div>
      )}

      {/* Technical Inspect View */}
      <details style={{ marginTop: "8px", fontSize: "12px", color: "var(--muted)" }}>
        <summary style={{ cursor: "pointer", fontWeight: 600, userSelect: "none" }}>Technical Inspect View</summary>
        <pre
          style={{
            marginTop: "6px",
            padding: "8px",
            background: "var(--surface-strong)",
            borderRadius: "var(--radius-sm)",
            fontSize: "11px",
            overflowX: "auto",
            maxHeight: "180px",
          }}
        >
          {JSON.stringify(question, null, 2)}
        </pre>
      </details>
    </>
  );
}
