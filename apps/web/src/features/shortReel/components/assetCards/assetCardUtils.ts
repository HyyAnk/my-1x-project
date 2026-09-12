import type { ReelUnitStatus, ShortReelRecord, Task } from "@studio/shared";

export function getUnitTone(
  state: ReelUnitStatus,
  isPending: boolean,
): "ready" | "pending" | "failed" | "stale" | "missing" | "neutral" {
  if (isPending) return "pending";
  if (state === "cancelled") return "neutral";
  return state;
}

export function resolveStageStatuses(
  units: ShortReelRecord["units"],
  activeTask?: Task | null,
  isGenerating = false,
) {
  const stages = activeTask?.short_reel_progress?.stages;
  const styleStage = Array.isArray(stages)
    ? stages.find((s) => s.stage === "style" || (s.stage as string) === "references")
    : undefined;
  const coverStage = Array.isArray(stages) ? stages.find((s) => s.stage === "cover") : undefined;

  const isStylePending =
    units.references.state === "pending" ||
    (isGenerating && (styleStage?.state === "running" || styleStage?.state === "pending"));
  const isCoverPending =
    units.cover.state === "pending" ||
    (isGenerating && (coverStage?.state === "running" || coverStage?.state === "pending"));

  const styleError =
    units.references.state === "failed"
      ? units.references.current_attempt?.error_message ||
        (styleStage?.state === "failed" ? styleStage.message : null) ||
        "Style generation failed."
      : null;
  const coverError =
    units.cover.state === "failed"
      ? units.cover.current_attempt?.error_message ||
        (coverStage?.state === "failed" ? coverStage.message : null) ||
        "Cover generation failed."
      : null;

  return {
    styleStage,
    coverStage,
    isStylePending,
    isCoverPending,
    styleError,
    coverError,
  };
}
