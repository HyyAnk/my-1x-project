import { Sparkle, CheckCircle, Trophy } from "@phosphor-icons/react";
import type { QuestionBankMilestoneTrackProps } from "../../types/questionBankProgress.types";
import { useTranslation } from "../../../../i18n";

/**
 * Question milestone partition component displaying active tier badge,
 * progress metrics, segmented rail with shimmer, and milestone checkpoints.
 */
export function QuestionBankMilestoneTrack({
  currentTotal,
  milestoneProgress,
  isCollapsed = false,
  compact = false,
  className = "",
}: QuestionBankMilestoneTrackProps) {
  const { t } = useTranslation();
  const { activeTier, nextTier, targetTotal, targetPercent, isMaxTier, track, bracketPercent } = milestoneProgress;

  const remainingToNext = Math.max(0, targetTotal - currentTotal);
  const nextTierLabel = nextTier ? nextTier.name : activeTier.name;

  return (
    <div
      className={`qb-milestone-track ${compact ? "is-compact" : ""} ${isCollapsed ? "is-collapsed" : ""} ${className}`.trim()}
      role="region"
      aria-label={t("questionBank.splitBar.volumeTrackTitle")}
    >
      {/* Metric Header Row */}
      <div className="qb-milestone-track-header">
        <div className="qb-milestone-track-meta">
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

        <div className="qb-hero-percent-badge" style={{ color: activeTier.accentColor }}>
          <span className="qb-percent-val">{targetPercent}%</span>
        </div>
      </div>

      {/* Segmented Milestone Progress Rail */}
      <div
        className="qb-segmented-rail qb-compact-rail qb-milestone-track-rail"
        role="progressbar"
        aria-valuenow={currentTotal}
        aria-valuemin={0}
        aria-valuemax={targetTotal}
        aria-valuetext={t("questionBank.splitBar.compactAriaMilestones", {
          current: currentTotal.toLocaleString(),
          target: targetTotal.toLocaleString(),
          percent: targetPercent,
        })}
      >
        {track.map((node) => {
          let segmentPercent = 0;
          if (node.status === "achieved") {
            segmentPercent = 100;
          } else if (node.status === "active") {
            segmentPercent = bracketPercent;
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

      {/* Compact Checkpoint Markers */}
      {!isCollapsed && (
        <div className="qb-segmented-markers-row qb-milestone-track-markers" role="list" aria-label="Milestone checkpoints">
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
      )}
    </div>
  );
}
