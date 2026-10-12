/** Mirrors the server's Question Bank highlight phrase coverage (active questions only). */
export interface HighlightCoverage {
  total: number;
  withPhrase: number;
  missing: number;
}

export interface HighlightBackfillProgress {
  total: number;
  processed: number;
  annotated: number;
  unresolved: number;
  skippedStale: number;
  saveFailures: number;
}

export type HighlightBackfillJobStatus = "idle" | "running" | "completed" | "failed" | "cancelled";

export interface HighlightBackfillJobState {
  jobId: string | null;
  status: HighlightBackfillJobStatus;
  startedAt?: string;
  completedAt?: string;
  progress: HighlightBackfillProgress;
  error?: string;
}
