import { useCallback, useEffect, useState } from "react";
import { api } from "../../../api";
import type { HighlightBackfillJobState, HighlightCoverage } from "../types/questionBankHighlight.types";

const POLL_INTERVAL_MS = 3000;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Tracks Question Bank highlight phrase coverage and drives the background backfill job. */
export function useHighlightBackfill() {
  const [coverage, setCoverage] = useState<HighlightCoverage | null>(null);
  const [job, setJob] = useState<HighlightBackfillJobState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isRunning = job?.status === "running";

  const refreshCoverage = useCallback(async () => {
    try {
      setCoverage((await api.getHighlightCoverage()).coverage);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);

  useEffect(() => {
    void refreshCoverage();
    void api
      .getHighlightBackfillStatus()
      .then((res) => setJob(res.job))
      .catch(() => {});
  }, [refreshCoverage]);

  useEffect(() => {
    if (!isRunning) return;
    const timer = setInterval(() => {
      void api
        .getHighlightBackfillStatus()
        .then((res) => {
          setJob(res.job);
          if (res.job.status !== "running") void refreshCoverage();
        })
        .catch(() => {});
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [isRunning, refreshCoverage]);

  const start = useCallback(async () => {
    setError(null);
    try {
      setJob((await api.startHighlightBackfill()).job);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);

  const cancel = useCallback(async () => {
    try {
      setJob((await api.cancelHighlightBackfill()).job);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);

  return { coverage, job, isRunning, error, start, cancel };
}
