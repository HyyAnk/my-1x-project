import { useState, useEffect, useCallback, useRef } from "react";
import {
  CANONICAL_TRANSITIONS,
  type TransitionCatalogEntry,
  type TransitionCatalogResponse,
} from "@studio/shared";
import { fetchTransitionCatalog } from "../services/transitionPreviewApi";

export type UseTransitionCatalogResult = {
  catalog: TransitionCatalogResponse | null;
  entries: readonly TransitionCatalogEntry[];
  revision: string | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export function useTransitionCatalog(sampleRevision?: string): UseTransitionCatalogResult {
  const [catalog, setCatalog] = useState<TransitionCatalogResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const loadCatalog = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const ac = new AbortController();
    abortControllerRef.current = ac;

    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchTransitionCatalog(sampleRevision, ac.signal);
      setCatalog(data);
    } catch (err: any) {
      if (ac.signal.aborted) return;
      setError(err?.message || "Failed to load transition catalog");
    } finally {
      if (!ac.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [sampleRevision]);

  useEffect(() => {
    void loadCatalog();

    const handleFocus = () => {
      void loadCatalog();
    };
    const handleOnline = () => {
      void loadCatalog();
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("online", handleOnline);

    // Periodic refresh every 15s while visible
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        void loadCatalog();
      }
    }, 15_000);

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("online", handleOnline);
      clearInterval(interval);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [loadCatalog]);

  return {
    catalog,
    entries: catalog?.entries ?? CANONICAL_TRANSITIONS,
    revision: catalog?.revision ?? null,
    isLoading,
    error,
    refresh: loadCatalog,
  };
}
