import { ArrowClockwise, Sparkle } from "@phosphor-icons/react";
import type { BankIndex } from "../types/questionBankUi.types";
import { useTranslation } from "../../../i18n";

export interface QuestionBankHeaderStatsProps {
  stats: BankIndex | null;
  recalculating: boolean;
  onRecalculate: () => void;
  onOpenAiModal: () => void;
}

const ARCHETYPE_KEYS: Array<{ id: string; defaultLabel: string }> = [
  { id: "verdict_fact_myth", defaultLabel: "Fact vs Myth" },
  { id: "speed_blitz", defaultLabel: "Speed Blitz" },
  { id: "deep_trivia", defaultLabel: "Deep Trivia" },
  { id: "versus_faceoff", defaultLabel: "1v1 Faceoff" },
  { id: "visual_spotting", defaultLabel: "Visual Spotting" },
  { id: "visual_identification", defaultLabel: "Visual ID" },
  { id: "mystery_reveal", defaultLabel: "Mystery Reveal" },
  { id: "clue_deduction", defaultLabel: "Clue Deduction" },
];

export function QuestionBankHeaderStats({ stats, recalculating, onRecalculate, onOpenAiModal }: QuestionBankHeaderStatsProps) {
  const { t } = useTranslation();
  const currentTotal = stats?.current_total ?? 0;
  const targetTotal = stats?.target_total ?? 10000;
  const progressPercent = Math.min(100, Math.round((currentTotal / targetTotal) * 1000) / 10);

  return (
    <div className="qb-header-stats-card">
      <div className="qb-header-main">
        <div className="qb-header-title-block">
          <div className="qb-header-badge">
            <Sparkle size={14} weight="fill" />
            <span>{t("questionBank.badge")}</span>
          </div>
          <h1 className="qb-header-title">{t("questionBank.title")}</h1>
          <p className="qb-header-desc">{t("questionBank.subtitle")}</p>
        </div>

        <div className="qb-header-actions">
          <button
            type="button"
            className="qb-btn qb-btn-secondary"
            onClick={onRecalculate}
            disabled={recalculating}
            title={t("questionBank.syncTooltip")}
          >
            <ArrowClockwise size={16} className={recalculating ? "qb-spin" : ""} />
            <span>{recalculating ? t("questionBank.syncing") : t("questionBank.syncIndex")}</span>
          </button>

          <button type="button" className="qb-btn qb-btn-primary" onClick={onOpenAiModal}>
            <Sparkle size={16} weight="fill" />
            <span>{t("questionBank.aiGenerateBatch")}</span>
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="qb-progress-section">
        <div className="qb-progress-labels">
          <span className="qb-progress-text">
            {t("questionBank.targetProgress", { current: currentTotal.toLocaleString(), target: targetTotal.toLocaleString() })}
          </span>
          <span className="qb-progress-pct">{progressPercent}%</span>
        </div>
        <div className="qb-progress-track">
          <div className="qb-progress-fill" style={{ width: `${Math.max(2, progressPercent)}%` }} />
        </div>
      </div>

      {/* Archetype Breakdown Pills */}
      <div className="qb-archetypes-grid">
        {ARCHETYPE_KEYS.map(({ id: archId }) => {
          const count = stats?.by_archetype?.[archId] ?? 0;
          const label = t(`questionBank.archetypes.${archId}` as any);
          return (
            <div key={archId} className="qb-archetype-pill">
              <span className="qb-pill-label">{label}</span>
              <span className="qb-pill-count">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
