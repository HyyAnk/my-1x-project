import { useState, useEffect, useRef } from "react";
import type React from "react";
import { api } from "../../../api";
import type { QuestionBankJobState } from "../types/questionBankUi.types";
import { calculateProgressPercent } from "../components/activityBar/activityBar.utils";

export interface UseQuestionBankActivityBarOptions {
  job?: QuestionBankJobState | null;
  onOpenQuestionBank?: () => void;
  onCancelJob?: () => Promise<void>;
  onDismiss?: () => void;
}

export interface UseQuestionBankActivityBarReturn {
  currentJob: QuestionBankJobState | null;
  isVisible: boolean;
  isRunning: boolean;
  cancelling: boolean;
  elapsed: string;
  completed: number;
  target: number;
  progressPercent: number;
  handleBarClick: (e: React.MouseEvent) => void;
  handleCancel: (e: React.MouseEvent) => Promise<void>;
  handleDismiss: (e: React.MouseEvent) => void;
}

/**
 * Hook encapsulating state management, polling, elapsed timer,
 * auto-dismissal, and interaction handlers for the QuestionBankActivityBar.
 */
export function useQuestionBankActivityBar({
  job: controlledJob,
  onOpenQuestionBank,
  onCancelJob,
  onDismiss,
}: UseQuestionBankActivityBarOptions): UseQuestionBankActivityBarReturn {
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

  // Autonomous polling when operating in uncontrolled mode
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

  // If dismissed or stale finished job, mark as not visible
  const isStale = Boolean(
    currentJob &&
    currentJob.status !== "running" &&
    currentJob.completedAt &&
    Date.now() - new Date(currentJob.completedAt).getTime() > 15_000,
  );

  const isLocallyDismissed = isDismissed || Boolean(currentJob?.jobId && dismissedJobIdsRef.current.has(currentJob.jobId));
  const isVisible = Boolean(currentJob && currentJob.status !== "idle" && !isLocallyDismissed && !isStale);

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
    if (currentJob?.jobId) {
      dismissedJobIdsRef.current.add(currentJob.jobId);
    }
    setIsDismissed(true);
    void api.dismissBatchGeneration().catch(() => {});
    if (!isControlled) {
      setInternalJob(null);
    }
    onDismiss?.();
  };

  const completed = currentJob?.progress?.completedCount || 0;
  const target = Math.max(1, currentJob?.targetCount || currentJob?.progress?.totalRequested || 20);
  const progressPercent = calculateProgressPercent(completed, target);
  const isRunning = currentJob?.status === "running";

  return {
    currentJob,
    isVisible,
    isRunning,
    cancelling,
    elapsed,
    completed,
    target,
    progressPercent,
    handleBarClick,
    handleCancel,
    handleDismiss,
  };
}
