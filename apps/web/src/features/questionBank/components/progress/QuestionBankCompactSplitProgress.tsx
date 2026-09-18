import type { QuestionBankCompactSplitProgressProps } from "../../types/questionBankProgress.types";
import { QuestionBankMilestoneTrack } from "./QuestionBankMilestoneTrack";
import { QuestionBankMatrixCoverageTrack } from "./QuestionBankMatrixCoverageTrack";
import { useTranslation } from "../../../../i18n";

/**
 * Unified Compact Split Progress Bar container component (Option 2 Architecture).
 * Integrates the Milestone Volume Progression track on the left and the 2D Taxonomy
 * Matrix Coverage track on the right, joined seamlessly with a vertical split divider.
 */
export function QuestionBankCompactSplitProgress({
  currentTotal,
  milestoneProgress,
  matrixCoverage,
  onOpenAiAutoFill,
  isCollapsed = false,
  compact = false,
  className = "",
}: QuestionBankCompactSplitProgressProps) {
  const { t } = useTranslation();

  const containerClasses = ["qb-compact-split-progress", compact ? "is-compact" : "", isCollapsed ? "is-collapsed" : "", className]
    .filter(Boolean)
    .join(" ");

  const ariaLabel = t("questionBank.splitBar.compactSplitTitle") || "Question Bank Target Progress and Matrix Coverage";

  return (
    <div className={containerClasses} role="region" aria-label={ariaLabel}>
      {/* Left Partition: Total Question Volume and Milestone Roadmap */}
      <QuestionBankMilestoneTrack
        currentTotal={currentTotal}
        milestoneProgress={milestoneProgress}
        isCollapsed={isCollapsed}
        compact={compact}
      />

      {/* Visual Separation: Vertical Split Divider */}
      <div className="qb-split-divider" role="separator" aria-orientation="vertical" />

      {/* Right Partition: 2D Archetype x Taxonomy Matrix Coverage */}
      <QuestionBankMatrixCoverageTrack
        matrixCoverage={matrixCoverage}
        onOpenAiAutoFill={onOpenAiAutoFill}
        isCollapsed={isCollapsed}
        compact={compact}
      />
    </div>
  );
}
