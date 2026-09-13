import type { MatrixCoverageStats } from "@studio/shared";
import type {
  MilestoneProgressResult,
  MilestoneTier,
  MilestoneTrackNode,
} from "../utils/questionBankMilestones";

/**
 * Props for QuestionBankMilestoneTrack component.
 * Displays current question volume, active milestone tier, and visual milestone checkpoint nodes.
 */
export interface QuestionBankMilestoneTrackProps {
  /** Total count of questions currently in the Question Bank */
  currentTotal: number;
  /** Progression stats calculated from currentTotal */
  milestoneProgress: MilestoneProgressResult;
  /** Whether the parent container is collapsed */
  isCollapsed?: boolean;
  /** Compact visual presentation mode */
  compact?: boolean;
  /** Optional custom CSS class name */
  className?: string;
}

/**
 * Props for QuestionBankMatrixCoverageTrack component.
 * Displays 2D Archetype x Domain combination coverage and quick trigger to fill deficits.
 */
export interface QuestionBankMatrixCoverageTrackProps {
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
 * Props for QuestionBankCompactSplitProgress container.
 * Combines the milestone volume track and the matrix coverage track side-by-side.
 */
export interface QuestionBankCompactSplitProgressProps {
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

export type {
  MatrixCoverageStats,
  MilestoneProgressResult,
  MilestoneTier,
  MilestoneTrackNode,
};
