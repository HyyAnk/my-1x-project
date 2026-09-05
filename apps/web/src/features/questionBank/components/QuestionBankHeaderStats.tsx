import { ArrowClockwise, CaretDown, CaretUp, Sparkle } from "@phosphor-icons/react";
import type { BankIndex, MatrixCoverageStats } from "../types/questionBankUi.types";
import { useTranslation } from "../../../i18n";
import { getMilestoneProgress } from "../utils/questionBankMilestones";

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
  { id: "verdict_fact_myth", defaultLabel: "Fact vs Myth", icon: "⚖️" },
  { id: "speed_blitz", defaultLabel: "Speed Blitz", icon: "⚡" },
  { id: "deep_trivia", defaultLabel: "Deep Trivia", icon: "🧠" },
  { id: "versus_faceoff", defaultLabel: "1v1 Faceoff", icon: "⚔️" },
  { id: "visual_spotting", defaultLabel: "Visual Spotting", icon: "👁️" },
  { id: "visual_identification", defaultLabel: "Visual ID", icon: "🔍" },
  { id: "mystery_reveal", defaultLabel: "Mystery Reveal", icon: "🎭" },
  { id: "clue_deduction", defaultLabel: "Clue Deduction", icon: "🕵️" },
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
  const activeTier = milestoneProgress.activeTier;
  const progressPercent = milestoneProgress.targetPercent;
  const comboPercent = matrixCoverage ? matrixCoverage.coverage_percent : 0;
  const unfilledCount = matrixCoverage ? matrixCoverage.total_combos - matrixCoverage.covered_combos : 0;

  return (
    <div className="qb-header-stats-card">
      <div className="qb-header-main">
        <div className="qb-header-title-block">
          <div className="qb-header-badge">
            <Sparkle size={13} weight="fill" />
            <span>{t("questionBank.badge")}</span>
          </div>
          <h1 className="qb-header-title">{t("questionBank.title")}</h1>
          <span
            className={`qb-header-tier-pill ${activeTier.badgeClass}`}
            title={`${activeTier.name} Tier: ${activeTier.tagline} (Target: ${activeTier.target.toLocaleString()} questions)`}
          >
            <span className="qb-tier-icon">{activeTier.icon}</span>
            <span className="qb-tier-name">{activeTier.name}</span>
            <span className="qb-tier-level">Lvl {activeTier.level}</span>
          </span>
          {matrixCoverage && (
            <span
              className="qb-header-total-pill"
              title={`${unfilledCount.toLocaleString()} combos unfilled`}
            >
              🎯 {matrixCoverage.covered_combos.toLocaleString()} / {matrixCoverage.total_combos.toLocaleString()} Combos ({matrixCoverage.coverage_percent}%)
            </span>
          )}
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

      {!isCollapsed && (
        <>
          {/* Dual KPI Micro Progress Bar */}
          <div className="qb-progress-section">
            <div className="qb-progress-labels">
              <span className="qb-progress-text">
                <strong className="qb-progress-tier-label">{activeTier.icon} {activeTier.name}:</strong>{" "}
                {t("questionBank.targetProgress", {
                  current: currentTotal.toLocaleString(),
                  target: milestoneProgress.targetTotal.toLocaleString(),
                })}
                {milestoneProgress.nextTier && (
                  <span className="qb-progress-next-tag">
                    {" "}&bull; Next: {milestoneProgress.nextTier.name} ({milestoneProgress.nextTier.target.toLocaleString()})
                  </span>
                )}
              </span>
              <span className="qb-progress-pct" style={{ color: activeTier.accentColor }}>
                {progressPercent}%
              </span>
            </div>
            <div className="qb-progress-track qb-milestone-track">
              <div
                className={`qb-progress-fill qb-milestone-fill ${activeTier.badgeClass}`}
                style={{
                  width: `${Math.max(2, progressPercent)}%`,
                  background: activeTier.gradient,
                }}
              >
                <div className="qb-shimmer-sweep" />
              </div>
            </div>

            {/* 6-Tier Milestone Stepper */}
            <div className="qb-milestone-stepper" role="list" aria-label="Question Bank Milestones">
              {milestoneProgress.track.map((node) => (
                <div
                  key={node.tier.id}
                  className={`qb-milestone-node qb-node-${node.status} ${node.tier.badgeClass}`}
                  title={`${node.tier.name} (${node.tier.target.toLocaleString()} questions): ${node.status}`}
                >
                  <span className="qb-node-indicator">
                    {node.status === "achieved" ? "✓" : node.tier.icon}
                  </span>
                  <span className="qb-node-target">{node.formattedTarget}</span>
                  {node.status === "active" && <span className="qb-node-pulse" />}
                </div>
              ))}
            </div>

            {matrixCoverage && (
              <div style={{ marginTop: "6px" }}>
                <div className="qb-progress-labels">
                  <span className="qb-progress-text" style={{ fontSize: "11px", color: "var(--muted)" }}>
                    {t("questionBank.matrixProgress", {
                      covered: matrixCoverage.covered_combos.toLocaleString(),
                      total: matrixCoverage.total_combos.toLocaleString(),
                      pct: matrixCoverage.coverage_percent,
                    })}
                  </span>
                  <span className="qb-progress-pct" style={{ fontSize: "11px" }}>{matrixCoverage.coverage_percent}%</span>
                </div>
                <div className="qb-progress-track" style={{ height: "4px" }}>
                  <div
                    className="qb-progress-fill"
                    style={{
                      width: `${Math.max(2, comboPercent)}%`,
                      background: "linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%)",
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Interactive Archetype Filter Chip Bar */}
          <div className="qb-archetypes-chip-bar" role="tablist" aria-label="Archetype Filters">
            {ARCHETYPE_CHIPS.map(({ id: archId, defaultLabel, icon }) => {
              const isActive = selectedArchetype === archId;
              const count = stats?.by_archetype?.[archId] ?? 0;
              const label = t(`questionBank.archetypes.${archId}` as any) || defaultLabel;

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
        </>
      )}
    </div>
  );
}
