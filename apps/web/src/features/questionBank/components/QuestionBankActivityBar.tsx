import { useState, useEffect, useRef } from "react";
import { CheckCircle, WarningCircle, X } from "@phosphor-icons/react";
import { api } from "../../../api";
import type { QuestionBankJobState } from "../types/questionBankUi.types";

export interface QuestionBankActivityBarProps {
  job?: QuestionBankJobState | null;
  onOpenQuestionBank?: () => void;
  onCancelJob?: () => Promise<void>;
  onDismiss?: () => void;
}

export function QuestionBankActivityBar({
  job: controlledJob,
  onOpenQuestionBank,
  onCancelJob,
  onDismiss,
}: QuestionBankActivityBarProps) {
  const [internalJob, setInternalJob] = useState<QuestionBankJobState | null>(null);
  const [elapsed, setElapsed] = useState("0s");
  const [cancelling, setCancelling] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const dismissedJobIdsRef = useRef<Set<string>>(new Set());

  const isControlled = controlledJob !== undefined;
  const currentJob = isControlled ? controlledJob : internalJob;

  // Reset dismissed state when a job is actively running
  useEffect(() => {
    if (currentJob?.status === "running" && currentJob.jobId) {
      dismissedJobIdsRef.current.delete(currentJob.jobId);
      setIsDismissed(false);
    }
  }, [currentJob?.status, currentJob?.jobId]);

  // Auto-dismiss after 6 seconds when completed or cancelled
  useEffect(() => {
    if (!currentJob) return;
    if (currentJob.status === "completed" || currentJob.status === "cancelled") {
      const timer = setTimeout(() => {
        if (currentJob.jobId) {
          dismissedJobIdsRef.current.add(currentJob.jobId);
        }
        setIsDismissed(true);
        void api.dismissBatchGeneration().catch(() => {});
        if (!isControlled) {
          setInternalJob(null);
        }
        onDismiss?.();
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [currentJob?.status, currentJob?.jobId, isControlled, onDismiss]);

  // Autonomous polling if not in controlled mode
  useEffect(() => {
    if (isControlled) return;

    let timer: NodeJS.Timeout | null = null;
    let isMounted = true;

    const pollStatus = async () => {
      try {
        const res = await api.getBatchGenerationStatus();
        if (!isMounted) return;
        if (res?.job) {
          if (res.job.status === "running") {
            dismissedJobIdsRef.current.delete(res.job.jobId);
            setIsDismissed(false);
            setInternalJob(res.job);
          } else if (res.job.status !== "idle" && !dismissedJobIdsRef.current.has(res.job.jobId)) {
            const isRecent = !res.job.completedAt || Date.now() - new Date(res.job.completedAt).getTime() <= 15_000;
            if (isRecent) {
              setInternalJob(res.job);
            }
          } else if (res.job.status === "idle") {
            setInternalJob(null);
          }
        }
      } catch {
        // Ignore polling error
      } finally {
        if (isMounted) {
          const delay = currentJob?.status === "running" ? 2000 : 5000;
          timer = setTimeout(pollStatus, delay);
        }
      }
    };

    void pollStatus();

    return () => {
      isMounted = false;
      if (timer) clearTimeout(timer);
    };
  }, [isControlled, currentJob?.status]);

  // Elapsed timer for running state
  useEffect(() => {
    if (!currentJob || currentJob.status !== "running") return;
    const startTime = new Date(currentJob.startedAt).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const diffSec = Math.max(0, Math.floor((now - startTime) / 1000));
      const mins = Math.floor(diffSec / 60);
      const secs = diffSec % 60;
      setElapsed(mins > 0 ? `${mins}m ${secs}s` : `${secs}s`);
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [currentJob]);

  // If dismissed or stale finished job, do not render
  const isStale =
    currentJob &&
    currentJob.status !== "running" &&
    currentJob.completedAt &&
    Date.now() - new Date(currentJob.completedAt).getTime() > 15_000;

  const isLocallyDismissed =
    isDismissed || (Boolean(currentJob?.jobId) && dismissedJobIdsRef.current.has(currentJob!.jobId));

  if (!currentJob || currentJob.status === "idle" || isLocallyDismissed || isStale) return null;

  const handleBarClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    onOpenQuestionBank?.();
  };

  const handleCancel = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (cancelling) return;
    setCancelling(true);
    try {
      if (onCancelJob) {
        await onCancelJob();
      } else {
        const res = await api.cancelBatchGeneration();
        if (res?.job) {
          setInternalJob(res.job);
        }
      }
    } finally {
      setCancelling(false);
    }
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentJob.jobId) {
      dismissedJobIdsRef.current.add(currentJob.jobId);
    }
    setIsDismissed(true);
    void api.dismissBatchGeneration().catch(() => {});
    if (!isControlled) {
      setInternalJob(null);
    }
    onDismiss?.();
  };

  const completed = currentJob.progress.completedCount || 0;
  const target = Math.max(1, currentJob.targetCount || currentJob.progress.totalRequested || 20);
  const progressPercent = Math.min(100, Math.max(2, Math.round((completed / target) * 100)));

  return (
    <div
      className="task-activity-bar"
      style={{
        borderBottomColor:
          currentJob.status === "failed"
            ? "var(--red, #ef4444)"
            : currentJob.status === "completed"
              ? "var(--green, #22c55e)"
              : "color-mix(in srgb, #06b6d4 40%, var(--line))",
      }}
      role="button"
      tabIndex={0}
      onClick={handleBarClick}
      title="Click to view Question Bank"
    >
      {/* 1. Signal / Status Badge */}
      <div className="task-activity-signal" style={{ color: "#06b6d4" }}>
        {currentJob.status === "running" ? (
          <>
            <span className="live-pulse" style={{ background: "#06b6d4" }} />
            <span>AI BATCH</span>
          </>
        ) : currentJob.status === "completed" ? (
          <>
            <CheckCircle size={14} weight="fill" style={{ color: "var(--green, #22c55e)" }} />
            <span style={{ color: "var(--green, #22c55e)" }}>DONE</span>
          </>
        ) : currentJob.status === "failed" ? (
          <>
            <WarningCircle size={14} weight="fill" style={{ color: "var(--red, #ef4444)" }} />
            <span style={{ color: "var(--red, #ef4444)" }}>ERROR</span>
          </>
        ) : (
          <>
            <X size={14} weight="bold" />
            <span>CANCELLED</span>
          </>
        )}
      </div>

      {/* 2. Copy */}
      <div className="task-activity-copy">
        {currentJob.status === "running" ? (
          <>
            <strong>
              Question Bank AI Generator ({completed}/{target} questions)
            </strong>
            <span>
              Chunk {currentJob.progress.currentChunk}/{currentJob.progress.totalChunks} • Approved:{" "}
              {currentJob.progress.approvedTotal || 0} • Rejected: {currentJob.progress.rejectedTotal || 0}
            </span>
          </>
        ) : currentJob.status === "completed" ? (
          <>
            <strong>Batch Complete: {completed} questions added to Question Bank</strong>
            <span>Click to explore newly generated questions</span>
          </>
        ) : currentJob.status === "failed" ? (
          <>
            <strong>Question generation failed</strong>
            <span>{currentJob.error || "An unexpected error occurred during generation"}</span>
          </>
        ) : (
          <>
            <strong>Batch generation cancelled</strong>
            <span>Progress stopped at {completed} questions</span>
          </>
        )}
      </div>

      {/* 3. Elapsed Time */}
      <span className="task-activity-time">{currentJob.status === "running" ? elapsed : ""}</span>

      {/* 4. Progress Track */}
      {currentJob.status === "running" ? (
        <div
          className="task-activity-track"
          role="progressbar"
          aria-label="Question generation progress"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <span
            style={{
              width: `${progressPercent}%`,
              background: "linear-gradient(90deg, #06b6d4 0%, #8b5cf6 100%)",
            }}
          />
        </div>
      ) : null}

      {/* 5. Percent or Actions */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        {currentJob.status === "running" ? (
          <>
            <span className="task-activity-percent">{progressPercent}%</span>
            <button
              type="button"
              className="qb-btn qb-btn-secondary qb-btn-sm"
              onClick={handleCancel}
              disabled={cancelling}
              style={{ padding: "3px 8px", fontSize: "11px", height: "24px" }}
              title="Cancel generation"
            >
              {cancelling ? "..." : <X size={12} weight="bold" />}
            </button>
          </>
        ) : (
          <button
            type="button"
            className="qb-btn qb-btn-secondary qb-btn-sm"
            onClick={handleDismiss}
            style={{ padding: "3px 8px", fontSize: "11px", height: "24px" }}
            title="Dismiss notification"
          >
            <X size={12} weight="bold" />
          </button>
        )}
      </div>
    </div>
  );
}
