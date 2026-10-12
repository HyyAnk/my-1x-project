import type { LLMClient } from "../../../utils/promptSanitizer.js";
import { runHighlightBackfill } from "./highlightBackfillService.js";
import type { HighlightBackfillProgress, HighlightBackfillReport, HighlightBackfillRepository } from "./highlightBackfill.types.js";

export type HighlightBackfillJobStatus = "idle" | "running" | "completed" | "failed" | "cancelled";

export interface HighlightBackfillJobState {
  jobId: string | null;
  status: HighlightBackfillJobStatus;
  startedAt?: string;
  completedAt?: string;
  progress: HighlightBackfillProgress;
  report?: HighlightBackfillReport;
  error?: string;
}

const EMPTY_PROGRESS: HighlightBackfillProgress = {
  total: 0,
  processed: 0,
  annotated: 0,
  unresolved: 0,
  skippedStale: 0,
  saveFailures: 0,
};

/** Runs at most one Question Bank highlight backfill at a time, in the background of the server process. */
export class HighlightBackfillJobManager {
  private state: HighlightBackfillJobState = { jobId: null, status: "idle", progress: { ...EMPTY_PROGRESS } };
  private abortController: AbortController | null = null;

  getStatus(): HighlightBackfillJobState {
    return { ...this.state, progress: { ...this.state.progress } };
  }

  isRunning(): boolean {
    return this.state.status === "running";
  }

  start(repository: HighlightBackfillRepository, llmClient: LLMClient): HighlightBackfillJobState {
    if (this.isRunning()) return this.getStatus();
    const jobId = `hlb_${Date.now().toString(36)}`;
    const abortController = new AbortController();
    this.abortController = abortController;
    this.state = { jobId, status: "running", startedAt: new Date().toISOString(), progress: { ...EMPTY_PROGRESS } };
    void this.execute(jobId, repository, llmClient, abortController.signal);
    return this.getStatus();
  }

  cancel(): boolean {
    if (!this.isRunning() || !this.abortController) return false;
    this.abortController.abort();
    return true;
  }

  private async execute(jobId: string, repository: HighlightBackfillRepository, llmClient: LLMClient, signal: AbortSignal): Promise<void> {
    try {
      const report = await runHighlightBackfill(repository, {
        llmClient,
        signal,
        onProgress: (progress) => this.updateProgress(jobId, progress),
      });
      this.finish(jobId, { status: "completed", report, progress: report });
    } catch (error) {
      const status = signal.aborted ? "cancelled" : "failed";
      this.finish(jobId, { status, error: signal.aborted ? undefined : error instanceof Error ? error.message : String(error) });
    }
  }

  private updateProgress(jobId: string, progress: HighlightBackfillProgress): void {
    if (this.state.jobId === jobId) this.state.progress = { ...progress };
  }

  private finish(jobId: string, patch: Partial<HighlightBackfillJobState>): void {
    if (this.state.jobId !== jobId) return;
    this.state = { ...this.state, ...patch, completedAt: new Date().toISOString() };
    this.abortController = null;
  }
}

export const highlightBackfillJobManager = new HighlightBackfillJobManager();
