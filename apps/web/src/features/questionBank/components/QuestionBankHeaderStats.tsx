import { ArrowClockwise, CaretDown, CaretUp, Sparkle } from "@phosphor-icons/react";
import type { BankIndex, MatrixCoverageStats } from "../types/questionBankUi.types";
import { useTranslation } from "../../../i18n";
import { getMilestoneProgress } from "../utils/questionBankMilestones";
import { QuestionBankCompactSplitProgress } from "./progress/QuestionBankCompactSplitProgress";

export interface QuestionBankHeaderStatsProps {
  stats: BankIndex | null;
  matrixCoverage?: MatrixCoverageStats | null;
  recalculating: boolean;
  selectedArchetype?: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onSelectArchetype?: (archetypeId: string) => void;
  onRecalculate: () => void;
  onOpenAiModal: () => void;
}

const ARCHETYPE_CHIPS: Array<{ id: string; defaultLabel: string; icon: string }> = [
  { id: "verdict_true_false", defaultLabel: "True or False", icon: "⚖️" },
  { id: "speed_blitz", defaultLabel: "Speed Blitz", icon: "⚡" },
  { id: "deep_trivia", defaultLabel: "Deep Trivia", icon: "🧠" },
  { id: "versus_faceoff", defaultLabel: "1v1 Faceoff", icon: "⚔️" },
  { id: "visual_spotting", defaultLabel: "Visual Spotting", icon: "👁️" },
  { id: "visual_identification", defaultLabel: "Visual ID", icon: "🔍" },
  { id: "mystery_reveal", defaultLabel: "Mystery Reveal", icon: "🎭" },
];

export function QuestionBankHeaderStats({
  stats,
  matrixCoverage,
  recalculating,
  selectedArchetype = "",
  isCollapsed = false,
  onToggleCollapse = () => {},
  onSelectArchetype = () => {},
  onRecalculate,
  onOpenAiModal,
}: QuestionBankHeaderStatsProps) {
  const { t } = useTranslation();
  const currentTotal = stats?.current_total ?? 0;
  const milestoneProgress = getMilestoneProgress(currentTotal);

  return (
    <div className="qb-header-stats-card">
      <div className="qb-header-main">
        <div className="qb-header-title-block">
          <div className="qb-header-badge">
            <Sparkle size={13} weight="fill" />
            <span>{t("questionBank.badge")}</span>
          </div>
          <h1 className="qb-header-title">{t("questionBank.title")}</h1>
        </div>

        <div className="qb-header-actions">
          <button
            type="button"
            className="qb-btn qb-btn-secondary"
            onClick={onRecalculate}
            disabled={recalculating}
            title={t("questionBank.syncTooltip")}
          >
            <ArrowClockwise size={15} className={recalculating ? "qb-spin" : ""} />
            <span>{recalculating ? t("questionBank.syncing") : t("questionBank.syncIndex")}</span>
          </button>

          <button type="button" className="qb-btn qb-btn-primary" onClick={onOpenAiModal}>
            <Sparkle size={15} weight="fill" />
            <span>{t("questionBank.aiGenerateBatch")}</span>
          </button>

          <button
            type="button"
            className="qb-btn qb-btn-ghost"
            onClick={onToggleCollapse}
            title={isCollapsed ? t("questionBank.expandStats") : t("questionBank.collapseStats")}
            aria-label={isCollapsed ? t("questionBank.expandStats") : t("questionBank.collapseStats")}
          >
            {isCollapsed ? <CaretDown size={16} weight="bold" /> : <CaretUp size={16} weight="bold" />}
          </button>
        </div>
      </div>

      {/* Unified Compact Split Progress Bar (Option 2 Architecture) */}
      <QuestionBankCompactSplitProgress
        currentTotal={currentTotal}
        milestoneProgress={milestoneProgress}
        matrixCoverage={matrixCoverage}
        isCollapsed={isCollapsed}
        onOpenAiAutoFill={onOpenAiModal}
      />

      {/* Interactive Archetype Filter Chip Bar */}
      {!isCollapsed && (
        <div className="qb-archetypes-chip-bar" role="tablist" aria-label="Archetype Filters">
          {ARCHETYPE_CHIPS.map(({ id: archId, defaultLabel, icon }) => {
            const isActive = selectedArchetype === archId || (archId === "verdict_true_false" && selectedArchetype === "verdict_fact_myth");
            const count =
              archId === "verdict_true_false"
                ? (stats?.by_archetype?.["verdict_true_false"] ?? 0) + (stats?.by_archetype?.["verdict_fact_myth"] ?? 0)
                : (stats?.by_archetype?.[archId] ?? 0);
            const label = t(`questionBank.archetypes.${archId}`) || defaultLabel;

            return (
              <button
                key={archId}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`qb-archetype-chip ${isActive ? "is-active" : ""}`}
                onClick={() => onSelectArchetype(isActive ? "" : archId)}
                title={`Filter by ${label}`}
              >
                <span className="qb-chip-icon">{icon}</span>
                <span className="qb-chip-label">{label}</span>
                <span className="qb-chip-count">{count}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
