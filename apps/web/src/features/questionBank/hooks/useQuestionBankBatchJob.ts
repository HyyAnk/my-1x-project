import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../../api";
import type {
  MatrixCoverageStats,
  QuestionBankBatchGenPayload,
  QuestionBankBatchGenResponse,
  QuestionBankJobState,
} from "../types/questionBankUi.types";

export interface UseQuestionBankBatchJobOptions {
  onRefreshData?: () => Promise<void> | void;
  onMatrixCoverageUpdate?: (coverage: MatrixCoverageStats) => void;
  onError?: (message: string) => void;
}

export function useQuestionBankBatchJob(options: UseQuestionBankBatchJobOptions = {}) {
  const { onRefreshData, onMatrixCoverageUpdate, onError } = options;

  const [generating, setGenerating] = useState(false);
  const [batchGenResult, setBatchGenResult] = useState<QuestionBankBatchGenResponse | null>(null);
  const [batchJob, setBatchJob] = useState<QuestionBankJobState | null>(null);

  const dismissedJobIdsRef = useRef<Set<string>>(new Set());
  const lastRefreshedJobIdRef = useRef<string | null>(null);
  const lastRefreshedCountRef = useRef<number>(0);

  const generateBatch = useCallback(
    async (payload: QuestionBankBatchGenPayload) => {
      setGenerating(true);
      try {
        const res = await api.generateQuestionBankBatch(payload);
        setBatchGenResult(res);
        if (res.job) {
          setBatchJob(res.job);
          lastRefreshedCountRef.current = 0;
          lastRefreshedJobIdRef.current = null;
        } else {
          if (res.matrixCoverage && onMatrixCoverageUpdate) {
            onMatrixCoverageUpdate(res.matrixCoverage);
          }
          if (onRefreshData) {
            await onRefreshData();
          }
        }
        return res;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Batch generation failed";
        if (onError) {
          onError(msg);
        }
        throw err;
      } finally {
        setGenerating(false);
      }
    },
    [onMatrixCoverageUpdate, onRefreshData, onError],
  );

  const cancelBatchJob = useCallback(async () => {
    try {
      const res = await api.cancelBatchGeneration();
      if (res?.job) {
        setBatchJob(res.job);
      }
      if (onRefreshData) {
        await onRefreshData();
      }
    } catch (err) {
      console.error("Failed to cancel batch generation", err);
    }
  }, [onRefreshData]);

  const dismissJobBar = useCallback(() => {
    if (batchJob?.jobId) {
      dismissedJobIdsRef.current.add(batchJob.jobId);
    }
    setBatchJob(null);
    void api.dismissBatchGeneration().catch(() => {});
  }, [batchJob?.jobId]);

  // Auto-dismiss batchJob after 6 seconds when completed or cancelled
  useEffect(() => {
    if (!batchJob) return;
    if (batchJob.status === "completed" || batchJob.status === "cancelled") {
      const timer = setTimeout(() => {
        if (batchJob.jobId) {
          dismissedJobIdsRef.current.add(batchJob.jobId);
        }
        setBatchJob(null);
        void api.dismissBatchGeneration().catch(() => {});
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [batchJob?.status, batchJob?.jobId]);

  // Poll active background batch generation job and auto-refresh question bank in real time
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    let cancelled = false;

    const checkJobStatus = async () => {
      try {
        const res = await api.getBatchGenerationStatus();
        if (cancelled) return;

        if (res?.job) {
          const job = res.job;
          if (job.status === "running") {
            dismissedJobIdsRef.current.delete(job.jobId);
            setBatchJob(job);
          } else if (job.status !== "idle" && !dismissedJobIdsRef.current.has(job.jobId)) {
            const isRecent =
              !job.completedAt || Date.now() - new Date(job.completedAt).getTime() <= 15_000;
            if (isRecent) {
              setBatchJob(job);
            }
          } else if (job.status === "idle") {
            setBatchJob(null);
          }

          const isNewCompleted =
            job.status === "completed" &&
            lastRefreshedJobIdRef.current !== `${job.jobId}:completed`;
          const isCountIncreased =
            job.progress.completedCount > lastRefreshedCountRef.current &&
            job.progress.completedCount > 0;

          if (isNewCompleted || isCountIncreased) {
            if (isNewCompleted) {
              lastRefreshedJobIdRef.current = `${job.jobId}:completed`;
            }
            lastRefreshedCountRef.current = job.progress.completedCount;
            if (onRefreshData) {
              void onRefreshData();
            }
          }

          if (job.status === "running") {
            timer = setTimeout(checkJobStatus, 1500);
            return;
          }
        }
      } catch {
        // Ignore polling errors
      }

      // If idle, completed, or on error, continue checking periodically every 4s
      if (!cancelled) {
        timer = setTimeout(checkJobStatus, 4000);
      }
    };

    void checkJobStatus();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [onRefreshData]);

  return {
    generating,
    batchGenResult,
    setBatchGenResult,
    batchJob,
    setBatchJob,
    generateBatch,
    handleGenerateBatch: generateBatch,
    cancelBatchJob,
    dismissJobBar,
  };
}
