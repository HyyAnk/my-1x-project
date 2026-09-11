import { useState, useEffect, useRef, useCallback } from "react";
import type {
  TransitionPreviewRequest,
  TransitionPreviewSource,
  TransitionSelection,
} from "@studio/shared";
import {
  cancelTransitionJob,
  fetchTransitionJob,
  fetchTransitionManifest,
  getTransitionVideoUrl,
  requestTransitionPreview,
} from "../services/transitionPreviewApi";
import type {
  LoadedArtifact,
  TransitionPreviewState,
} from "../types/transitionPlayer.types";

export type UseTransitionPreviewOptions = {
  selection: TransitionSelection;
  source: TransitionPreviewSource;
  catalogRevision?: string | null;
  debounceMs?: number;
};

export type UseTransitionPreviewResult = {
  state: TransitionPreviewState;
  artifact: LoadedArtifact | null;
  isStale: boolean;
  isUpdating: boolean;
  error: { code: string; message: string; retryable: boolean } | null;
  retry: () => void;
  cancel: () => void;
};

export function useTransitionPreview(options: UseTransitionPreviewOptions): UseTransitionPreviewResult {
  const { selection, source, catalogRevision, debounceMs = 250 } = options;

  const [state, setState] = useState<TransitionPreviewState>({ kind: "idle" });
  const currentArtifactRef = useRef<LoadedArtifact | null>(null);
  const activeJobIdRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestIdCounterRef = useRef<number>(0);

  const performRequest = useCallback(async () => {
    if (!catalogRevision || !selection.id) {
      setState({ kind: "ready-to-request" });
      return;
    }

    // Cancel any previous active job
    if (activeJobIdRef.current) {
      const oldJobId = activeJobIdRef.current;
      activeJobIdRef.current = null;
      void cancelTransitionJob(oldJobId).catch(() => {});
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const ac = new AbortController();
    abortControllerRef.current = ac;

    requestIdCounterRef.current += 1;
    const clientRequestId = `req_${requestIdCounterRef.current}_${Date.now()}`;

    const requestPayload: TransitionPreviewRequest = {
      clientRequestId,
      catalogRevision,
      selection,
      source,
    };

    const staleArtifact = currentArtifactRef.current ?? undefined;

    try {
      setState({
        kind: "queued",
        jobId: "pending",
        requestId: clientRequestId,
        revision: 1,
        staleArtifact,
      });

      const initialStatus = await requestTransitionPreview(requestPayload, ac.signal);
      if (ac.signal.aborted) return;

      if (initialStatus.status === "ready") {
        const manifest = await fetchTransitionManifest(initialStatus.artifactId, ac.signal);
        if (ac.signal.aborted) return;

        const loaded: LoadedArtifact = {
          artifactId: initialStatus.artifactId,
          videoUrl: getTransitionVideoUrl(initialStatus.artifactId),
          manifestUrl: initialStatus.manifestUrl,
          manifest,
          fingerprint: initialStatus.fingerprint,
        };
        currentArtifactRef.current = loaded;
        setState({
          kind: "ready",
          jobId: initialStatus.jobId,
          requestId: initialStatus.requestId,
          artifact: loaded,
        });
        return;
      }

      if (initialStatus.status === "failed") {
        setState({
          kind: "failed",
          jobId: initialStatus.jobId,
          requestId: initialStatus.requestId,
          error: initialStatus.error,
          staleArtifact,
        });
        return;
      }

      // Queued or running: enter polling loop
      activeJobIdRef.current = initialStatus.jobId;
      setState({
        kind: initialStatus.status === "running" ? "rendering" : "queued",
        jobId: initialStatus.jobId,
        requestId: initialStatus.requestId,
        revision: initialStatus.revision,
        phase: (initialStatus as any).phase ?? "prepare",
        completedFrames: (initialStatus as any).completedFrames ?? null,
        totalFrames: (initialStatus as any).totalFrames ?? null,
        staleArtifact,
      });

      const pollStartTime = Date.now();

      const pollJob = async (): Promise<void> => {
        if (ac.signal.aborted) return;

        try {
          const currentJob = await fetchTransitionJob(initialStatus.jobId, ac.signal);
          if (ac.signal.aborted) return;

          if (currentJob.status === "ready") {
            activeJobIdRef.current = null;
            const manifest = await fetchTransitionManifest(currentJob.artifactId, ac.signal);
            if (ac.signal.aborted) return;

            const loaded: LoadedArtifact = {
              artifactId: currentJob.artifactId,
              videoUrl: getTransitionVideoUrl(currentJob.artifactId),
              manifestUrl: currentJob.manifestUrl,
              manifest,
              fingerprint: currentJob.fingerprint,
            };
            currentArtifactRef.current = loaded;
            setState({
              kind: "ready",
              jobId: currentJob.jobId,
              requestId: currentJob.requestId,
              artifact: loaded,
            });
            return;
          }

          if (currentJob.status === "failed") {
            activeJobIdRef.current = null;
            setState({
              kind: "failed",
              jobId: currentJob.jobId,
              requestId: currentJob.requestId,
              error: currentJob.error,
              staleArtifact,
            });
            return;
          }

          if (currentJob.status === "cancelled") {
            activeJobIdRef.current = null;
            setState({
              kind: "cancelled",
              jobId: currentJob.jobId,
              requestId: currentJob.requestId,
              staleArtifact,
            });
            return;
          }

          // Still queued / running
          setState({
            kind: currentJob.status === "running" ? "rendering" : "queued",
            jobId: currentJob.jobId,
            requestId: currentJob.requestId,
            revision: currentJob.revision,
            phase: (currentJob as any).phase ?? "prepare",
            completedFrames: (currentJob as any).completedFrames ?? null,
            totalFrames: (currentJob as any).totalFrames ?? null,
            staleArtifact,
          });

          // Compute backoff delay
          const elapsedMs = Date.now() - pollStartTime;
          const nextInterval = elapsedMs < 5_000 ? 500 : elapsedMs < 20_000 ? 1_000 : 2_000;

          setTimeout(() => {
            void pollJob();
          }, nextInterval);
        } catch (err: any) {
          if (ac.signal.aborted) return;
          // Retry poll after 2s on network failure
          setTimeout(() => {
            void pollJob();
          }, 2000);
        }
      };

      // Start polling
      setTimeout(() => {
        void pollJob();
      }, 500);
    } catch (err: any) {
      if (ac.signal.aborted) return;
      setState({
        kind: "failed",
        requestId: clientRequestId,
        error: {
          code: err?.code || "RENDER_FAILED",
          message: err?.message || "Failed to request preview",
          retryable: true,
        },
        staleArtifact,
      });
    }
  }, [selection, source, catalogRevision]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void performRequest();
    }, debounceMs);

    return () => {
      clearTimeout(timer);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (activeJobIdRef.current) {
        const id = activeJobIdRef.current;
        activeJobIdRef.current = null;
        void cancelTransitionJob(id).catch(() => {});
      }
    };
  }, [performRequest, debounceMs]);

  const retry = useCallback(() => {
    void performRequest();
  }, [performRequest]);

  const cancel = useCallback(() => {
    if (activeJobIdRef.current) {
      const id = activeJobIdRef.current;
      activeJobIdRef.current = null;
      void cancelTransitionJob(id).catch(() => {});
      setState({
        kind: "cancelled",
        jobId: id,
        requestId: "",
        staleArtifact: currentArtifactRef.current ?? undefined,
      });
    }
  }, []);

  const isUpdating = state.kind === "queued" || state.kind === "rendering";
  const artifact = state.kind === "ready" ? state.artifact : currentArtifactRef.current;
  const isStale = isUpdating && Boolean(currentArtifactRef.current);
  const error = state.kind === "failed" ? state.error : null;

  return {
    state,
    artifact,
    isStale,
    isUpdating,
    error,
    retry,
    cancel,
  };
}
