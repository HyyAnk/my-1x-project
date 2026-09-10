import { Check, Warning, CircleNotch, Minus } from "@phosphor-icons/react";
import type { ReelStageProgress, ReelGenerationStage, ReelGenerationState } from "@studio/shared";

export interface ReelGenerationProgressProps {
  isVisible: boolean;
  activeStage?: ReelGenerationStage | null;
  progressPercent?: number;
  progressMessage?: string | null;
  stages?: ReelStageProgress[] | null;
}

const STAGE_ORDER: { key: ReelGenerationStage; label: string }[] = [
  { key: "script", label: "Script" },
  { key: "style", label: "Portrait Style" },
  { key: "cover", label: "Cover" },
  { key: "publishing", label: "Publishing" },
];

function getStageIcon(status?: ReelGenerationState | "ready" | "pending" | "running" | "completed" | "failed" | "cancelled" | "skipped") {
  switch (status) {
    case "completed":
    case "ready":
      return <Check size={14} weight="bold" className="short-reel-stage-icon-ready" />;
    case "running":
      return <CircleNotch size={14} weight="bold" className="short-reel-stage-icon-running short-reel-spin" />;
    case "failed":
      return <Warning size={14} weight="fill" className="short-reel-stage-icon-failed" />;
    case "cancelled":
    case "skipped":
      return <Minus size={14} className="short-reel-stage-icon-skipped" />;
    default:
      return <span className="short-reel-stage-dot" />;
  }
}

export function ReelGenerationProgress({ isVisible, activeStage, progressPercent, progressMessage, stages }: ReelGenerationProgressProps) {
  if (!isVisible) return null;

  return (
    <div className="short-reel-stage-progress-card" role="status" aria-label="Generation Pipeline Progress">
      <div className="short-reel-stage-progress-header">
        <div className="short-reel-stage-progress-info">
          <span className="short-reel-spinner" aria-hidden="true" />
          <strong className="short-reel-stage-progress-title">Generation In Progress</strong>
          {progressMessage && <p className="short-reel-stage-progress-msg">{progressMessage}</p>}
        </div>
        {typeof progressPercent === "number" && <span className="short-reel-stage-progress-pct">{Math.round(progressPercent)}%</span>}
      </div>

      {stages && (
        <div className="short-reel-stage-pipeline">
          {STAGE_ORDER.map(({ key, label }) => {
            const stage = Array.isArray(stages)
              ? stages.find((s) => s.stage === key || (key === "style" && (s.stage as string) === "references"))
              : undefined;
            const status = stage?.state ?? (activeStage === key ? "running" : "pending");
            const isCurrent = activeStage === key || status === "running";

            return (
              <div
                key={key}
                className={`short-reel-stage-step short-reel-stage-${status} ${isCurrent ? "short-reel-stage-current" : ""}`}
                title={stage?.message || `${label}: ${status}`}
              >
                <div className="short-reel-stage-indicator">{getStageIcon(status)}</div>
                <div className="short-reel-stage-label-group">
                  <span className="short-reel-stage-name">{label}</span>
                  <span className="short-reel-stage-status">{status}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
