import { Sparkle, CheckCircle, Trophy } from "@phosphor-icons/react";
import type { MatrixCoverageStats } from "../types/questionBankUi.types";
import type { MilestoneProgressResult } from "../utils/questionBankMilestones";
import { useTranslation } from "../../../i18n";

export interface QuestionBankTargetProgressBarProps {
  currentTotal: number;
  milestoneProgress: MilestoneProgressResult;
  matrixCoverage?: MatrixCoverageStats | null;
}

export function QuestionBankTargetProgressBar({ currentTotal, milestoneProgress, matrixCoverage }: QuestionBankTargetProgressBarProps) {
  const { t } = useTranslation();
  const { activeTier, nextTier, targetTotal, targetPercent, isMaxTier, track } = milestoneProgress;

  const remainingToNext = Math.max(0, targetTotal - currentTotal);
  const nextTierLabel = nextTier ? nextTier.name : activeTier.name;

  return (
    <div className="qb-segmented-progress-card" role="region" aria-label="Question Bank Target Progress and Milestone Roadmap">
      {/* Top Metric Strip: Visual Hierarchy & Status */}
      <div className="qb-progress-hero-strip">
        <div className="qb-progress-hero-left">
          <div className={`qb-hero-tier-badge ${activeTier.badgeClass}`}>
            <span className="qb-hero-tier-icon">{activeTier.icon}</span>
            <span className="qb-hero-tier-name">{activeTier.name}</span>
            <span className="qb-hero-tier-lvl">Lvl {activeTier.level}</span>
          </div>

          <div className="qb-hero-count-group">
            <span className="qb-hero-current-num">{currentTotal.toLocaleString()}</span>
            <span className="qb-hero-target-slash">/</span>
            <span className="qb-hero-target-num">{targetTotal.toLocaleString()}</span>
            <span className="qb-hero-unit-label">questions</span>
          </div>

          {isMaxTier ? (
            <span className="qb-hero-status-pill is-max">
              <Trophy size={13} weight="fill" />
              <span>{t("questionBank.maxTierReached")}</span>
            </span>
          ) : (
            <span className="qb-hero-status-pill">
              <Sparkle size={12} weight="fill" />
              <span>
                {t("questionBank.remainingToNextTier", {
                  count: remainingToNext.toLocaleString(),
                  tier: nextTierLabel,
                })}
              </span>
            </span>
          )}
        </div>

        <div className="qb-progress-hero-right">
          {matrixCoverage && (
            <div className="qb-hero-matrix-pill">
              <span className="qb-matrix-icon">🎯</span>
              <span className="qb-matrix-text">
                {t("questionBank.matrixProgress", {
                  covered: matrixCoverage.covered_combos.toLocaleString(),
                  total: matrixCoverage.total_combos.toLocaleString(),
                  pct: matrixCoverage.coverage_percent,
                })}
              </span>
            </div>
          )}

          <div className="qb-hero-percent-badge" style={{ color: activeTier.accentColor }}>
            <span className="qb-percent-val">{targetPercent}%</span>
          </div>
        </div>
      </div>

      {/* Segmented Milestone Rail */}
      <div
        className="qb-segmented-rail"
        role="progressbar"
        aria-valuenow={currentTotal}
        aria-valuemin={0}
        aria-valuemax={targetTotal}
        aria-valuetext={`${currentTotal} of ${targetTotal} questions (${targetPercent}%)`}
      >
        {track.map((node) => {
          let segmentPercent = 0;
          if (node.status === "achieved") {
            segmentPercent = 100;
          } else if (node.status === "active") {
            segmentPercent = milestoneProgress.bracketPercent;
          }

          return (
            <div
              key={node.tier.id}
              className={`qb-rail-segment qb-segment-${node.status} ${node.tier.badgeClass}`}
              title={`${node.tier.name} (Lvl ${node.tier.level}): ${node.tier.prevTarget.toLocaleString()} - ${node.tier.target.toLocaleString()} questions. ${node.status === "achieved" ? "Completed" : node.status === "active" ? `${segmentPercent}% done` : "Upcoming"}`}
            >
              <div
                className="qb-segment-fill"
                style={{
                  width: `${Math.max(0, Math.min(100, segmentPercent))}%`,
                  background: node.tier.gradient,
                }}
              >
                {node.status === "active" && <div className="qb-shimmer-sweep" />}
              </div>
            </div>
          );
        })}
      </div>

      {/* Milestone Node Markers & Labels */}
      <div className="qb-segmented-markers-row" role="list" aria-label="Milestone checkpoints">
        {track.map((node) => {
          const isAchieved = node.status === "achieved";
          const isActive = node.status === "active";

          return (
            <div
              key={node.tier.id}
              className={`qb-milestone-marker qb-marker-${node.status} ${node.tier.badgeClass}`}
              title={`${node.tier.name}: ${node.tier.target.toLocaleString()} questions — ${node.tier.tagline}`}
              role="listitem"
            >
              <span className="qb-marker-pin">
                {isAchieved ? (
                  <CheckCircle size={13} weight="fill" className="qb-marker-check" />
                ) : (
                  <span className="qb-marker-emoji">{node.tier.icon}</span>
                )}
              </span>

              <span className="qb-marker-label">
                <span className="qb-marker-name">{node.tier.name}</span>
                <span className="qb-marker-target">{node.formattedTarget}</span>
              </span>

              {isActive && <span className="qb-marker-active-dot" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
