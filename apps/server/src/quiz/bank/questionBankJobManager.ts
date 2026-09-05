import type { BankGameplayArchetypeId } from "@studio/shared";
import type { RepositoryService } from "../../repository/service.js";
import {
  generateQuestionBankBatch,
  type BatchGenerationResult,
  type GenerateBatchInput,
  type QuestionBankChunkProgress,
} from "./questionBankBatchService.js";

export interface QuestionBankJobProgress {
  totalRequested: number;
  completedCount: number;
  currentChunk: number;
  totalChunks: number;
  chunkSize: number;
  approvedInChunk: number;
  rejectedInChunk: number;
  approvedTotal: number;
  rejectedTotal: number;
}

export interface QuestionBankJobState {
  jobId: string;
  status: "idle" | "running" | "completed" | "failed" | "cancelled";
  mode: "auto" | "manual";
  archetypeId?: BankGameplayArchetypeId;
  domainId?: string;
  subtopicId?: string;
  targetCount: number;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
  progress: QuestionBankJobProgress;
  error?: string;
  result?: BatchGenerationResult;
}

class QuestionBankJobManager {
  private currentJob: QuestionBankJobState = {
    jobId: "none",
    status: "idle",
    mode: "auto",
    targetCount: 0,
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    progress: {
      totalRequested: 0,
      completedCount: 0,
      currentChunk: 0,
      totalChunks: 0,
      chunkSize: 0,
      approvedInChunk: 0,
      rejectedInChunk: 0,
      approvedTotal: 0,
      rejectedTotal: 0,
    },
  };

  private abortController: AbortController | null = null;

  getStatus(): QuestionBankJobState {
    // If a finished job was completed more than 45 seconds ago, auto-expire it to idle
    if (
      (this.currentJob.status === "completed" ||
        this.currentJob.status === "cancelled" ||
        this.currentJob.status === "failed") &&
      this.currentJob.completedAt
    ) {
      const elapsed = Date.now() - new Date(this.currentJob.completedAt).getTime();
      if (elapsed > 45_000) {
        this.currentJob = {
          ...this.currentJob,
          status: "idle",
        };
      }
    }
    return { ...this.currentJob, progress: { ...this.currentJob.progress } };
  }

  isJobRunning(): boolean {
    return this.currentJob.status === "running";
  }

  dismissJob(): boolean {
    if (this.currentJob.status !== "running") {
      this.currentJob = {
        ...this.currentJob,
        status: "idle",
      };
      return true;
    }
    return false;
  }

  cancelJob(): boolean {
    if (this.currentJob.status !== "running" || !this.abortController) {
      return false;
    }
    this.abortController.abort();
    this.currentJob.status = "cancelled";
    this.currentJob.updatedAt = new Date().toISOString();
    this.currentJob.completedAt = new Date().toISOString();
    return true;
  }

  startJob(
    repository: RepositoryService,
    input: GenerateBatchInput,
  ): { started: boolean; job: QuestionBankJobState; error?: string } {
    if (this.isJobRunning()) {
      return {
        started: false,
        job: this.getStatus(),
        error: "A batch generation job is already running in background.",
      };
    }

    const targetCount = Math.max(1, input.count || 20);
    const totalChunks = Math.ceil(targetCount / 20);
    const jobId = `qbj_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();

    this.abortController = new AbortController();

    this.currentJob = {
      jobId,
      status: "running",
      mode: input.mode || (input.domainId || input.archetypeId ? "manual" : "auto"),
      archetypeId: input.archetypeId,
      domainId: input.domainId,
      subtopicId: input.subtopicId,
      targetCount,
      startedAt: now,
      updatedAt: now,
      progress: {
        totalRequested: targetCount,
        completedCount: 0,
        currentChunk: 0,
        totalChunks,
        chunkSize: Math.min(20, targetCount),
        approvedInChunk: 0,
        rejectedInChunk: 0,
        approvedTotal: 0,
        rejectedTotal: 0,
      },
    };

    const signal = this.abortController.signal;

    // Run execution in background asynchronously
    void (async () => {
      try {
        const result = await generateQuestionBankBatch(repository, {
          ...input,
          signal,
          onChunkProgress: (chunkProgress: QuestionBankChunkProgress) => {
            if (this.currentJob.jobId !== jobId) return;
            this.currentJob.progress = {
              totalRequested: chunkProgress.totalRequested,
              completedCount: chunkProgress.completedCount,
              currentChunk: chunkProgress.currentChunk,
              totalChunks: chunkProgress.totalChunks,
              chunkSize: chunkProgress.chunkSize,
              approvedInChunk: chunkProgress.approvedInChunk,
              rejectedInChunk: chunkProgress.rejectedInChunk,
              approvedTotal: (this.currentJob.progress.approvedTotal || 0) + chunkProgress.approvedInChunk,
              rejectedTotal: (this.currentJob.progress.rejectedTotal || 0) + chunkProgress.rejectedInChunk,
            };
            this.currentJob.updatedAt = new Date().toISOString();
          },
        });

        if (this.currentJob.jobId === jobId) {
          if (signal.aborted || this.currentJob.status === "cancelled") {
            this.currentJob.status = "cancelled";
          } else {
            this.currentJob.status = "completed";
            this.currentJob.result = result;
          }
          this.currentJob.completedAt = new Date().toISOString();
          this.currentJob.updatedAt = new Date().toISOString();
        }
      } catch (err: any) {
        if (this.currentJob.jobId === jobId) {
          const wasAborted = signal.aborted || err?.name === "AbortError";
          this.currentJob.status = wasAborted ? "cancelled" : "failed";
          this.currentJob.error = err instanceof Error ? err.message : String(err);
          this.currentJob.completedAt = new Date().toISOString();
          this.currentJob.updatedAt = new Date().toISOString();
        }
      } finally {
        if (this.currentJob.jobId === jobId) {
          this.abortController = null;
        }
      }
    })();

    return { started: true, job: this.getStatus() };
  }
}

export const questionBankJobManager = new QuestionBankJobManager();
