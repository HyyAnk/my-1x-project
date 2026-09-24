import { useCallback, useEffect, useRef, useState } from "react";
import type { VariantExportJob, VariantExportMode, VariantExportSummary } from "@studio/shared";
import { ApiError } from "../../../api/client";
import { variantExportApi } from "../services/variantExportApi";

export const isExportActive = (job: VariantExportJob | null) => job?.status === "running" || job?.status === "cancelling";
const errorText = (error: unknown) => (error instanceof Error ? error.message : "Request failed. Try again.");

export function useVariantExport(mascotId: string) {
  const [mode, setMode] = useState<VariantExportMode>("original");
  const [isOpen, setOpen] = useState(false);
  const [destination, setDestination] = useState("");
  const [summary, setSummary] = useState<VariantExportSummary | null>(null);
  const [job, setJob] = useState<VariantExportJob | null>(null);
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const generation = useRef(0);
  const lock = useRef(false);
  const requestKey = useRef<{ key: string; id: string } | null>(null);

  useEffect(
    () => () => {
      generation.current++;
    },
    [],
  );

  const refresh = useCallback(async () => {
    const version = ++generation.current;
    setLoading(true);
    setError(null);
    try {
      const result = await variantExportApi.preview(mascotId);
      if (version !== generation.current) return;
      setSummary(result.summary);
      setJob(result.job);
      if (result.job) setDestination((current) => current || result.job!.destination);
      if (isExportActive(result.job) && result.job) {
        setMode(result.job.mode);
        setDestination(result.job.destination);
      }
    } catch (cause) {
      if (version === generation.current) setError(errorText(cause));
    } finally {
      if (version === generation.current) setLoading(false);
    }
  }, [mascotId]);

  const open = (nextMode: VariantExportMode) => {
    setMode(isExportActive(job) && job ? job.mode : nextMode);
    setOpen(true);
    if (!pending && !isExportActive(job)) void refresh();
  };

  useEffect(() => {
    if (!job || !isExportActive(job)) return;
    const id = job.id;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const next = await variantExportApi.status(mascotId, id);
        if (stopped) return;
        setConnectionError(null);
        setJob((current) => {
          if (current?.id !== id || current.processed > next.processed || !isExportActive(current)) return current;
          return current.status === "cancelling" && next.status === "running" ? { ...next, status: "cancelling" } : next;
        });
        if (isExportActive(next)) timer = setTimeout(poll, 750);
      } catch (cause) {
        if (stopped) return;
        if (cause instanceof ApiError && cause.status === 404) {
          setConnectionError(null);
          setJob(null);
          setError(errorText(cause));
          return;
        }
        setConnectionError("Connection lost. Reconnecting; the export may still be running on the server.");
        timer = setTimeout(poll, 2500);
      }
    };
    void poll();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [mascotId, job?.id, job?.status]);

  const start = async (retry = false) => {
    if (lock.current || !destination || isExportActive(job)) return;
    lock.current = true;
    setPending(true);
    setError(null);
    const version = generation.current;
    const key = `${destination}:${mode}:${retry ? job?.id : "new"}`;
    if (requestKey.current?.key !== key) requestKey.current = { key, id: crypto.randomUUID() };
    try {
      const result = await variantExportApi.start(mascotId, {
        request_id: requestKey.current.id,
        destination,
        mode,
        ...(retry && job ? { retry_job_id: job.id } : {}),
      });
      if (version !== generation.current) return;
      setJob(result);
      setMode(result.mode);
      setDestination(result.destination);
      requestKey.current = null;
    } catch (cause) {
      if (version === generation.current) setError(errorText(cause));
    } finally {
      lock.current = false;
      if (version === generation.current) setPending(false);
    }
  };

  const cancel = async () => {
    if (!job || lock.current) return;
    lock.current = true;
    setPending(true);
    setError(null);
    const version = generation.current;
    try {
      const result = await variantExportApi.cancel(mascotId, job.id);
      if (version === generation.current) setJob(result);
    } catch (cause) {
      if (version === generation.current) setError(errorText(cause));
    } finally {
      lock.current = false;
      if (version === generation.current) setPending(false);
    }
  };

  return {
    mode,
    isOpen,
    open,
    close: () => setOpen(false),
    destination,
    setDestination,
    summary,
    job,
    pending,
    loading,
    error,
    connectionError,
    refresh,
    start,
    cancel,
    active: isExportActive(job),
  };
}
