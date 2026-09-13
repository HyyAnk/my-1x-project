import type { MatrixCoverageStats } from "../types/questionBankUi.types";
import type { MilestoneProgressResult } from "../utils/questionBankMilestones";
import { QuestionBankCompactSplitProgress } from "./progress/QuestionBankCompactSplitProgress";

export interface QuestionBankTargetProgressBarProps {
  /** Total count of questions currently in the Question Bank */
  currentTotal: number;
  /** Progression stats calculated from currentTotal */
  milestoneProgress: MilestoneProgressResult;
  /** Coverage statistics across archetypes and taxonomy domains */
  matrixCoverage?: MatrixCoverageStats | null;
  /** Callback triggered when user clicks the shortcut to auto-fill unfilled combos */
  onOpenAiAutoFill?: () => void;
  /** Whether the progress section is collapsed */
  isCollapsed?: boolean;
  /** Compact visual presentation mode */
  compact?: boolean;
  /** Optional custom CSS class name */
  className?: string;
}

/**
 * Backward compatibility wrapper component for QuestionBankTargetProgressBar.
 * Delegates rendering directly to QuestionBankCompactSplitProgress (Option 2 Architecture).
 */
export function QuestionBankTargetProgressBar({
  currentTotal,
  milestoneProgress,
  matrixCoverage,
  onOpenAiAutoFill,
  isCollapsed,
  compact,
  className,
}: QuestionBankTargetProgressBarProps) {
  return (
    <QuestionBankCompactSplitProgress
      currentTotal={currentTotal}
      milestoneProgress={milestoneProgress}
      matrixCoverage={matrixCoverage}
      onOpenAiAutoFill={onOpenAiAutoFill}
      isCollapsed={isCollapsed}
      compact={compact}
      className={className}
    />
  );
}
