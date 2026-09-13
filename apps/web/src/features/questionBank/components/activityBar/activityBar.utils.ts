import type { QuestionBankJobState } from "../../types/questionBankUi.types";

/**
 * Returns the bottom border color corresponding to the current batch job status.
 */
export function getBorderBottomColor(status: QuestionBankJobState["status"]): string {
  if (status === "failed") return "var(--red, #ef4444)";
  if (status === "completed") return "var(--green, #22c55e)";
  return "color-mix(in srgb, #06b6d4 40%, var(--line))";
}

/**
 * Calculates a bounded progress percentage (between 2% and 100%) for active progress indicators.
 */
export function calculateProgressPercent(completed: number, target: number): number {
  const safeTarget = Math.max(1, target);
  return Math.min(100, Math.max(2, Math.round((completed / safeTarget) * 100)));
}
