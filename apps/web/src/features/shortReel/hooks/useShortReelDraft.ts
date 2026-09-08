import { useCallback, useEffect, useState } from "react";
import type { ShortReelRecord } from "@studio/shared";
import { api } from "../../../api";
import type { Notice } from "../../../components/types";
import { ApiError } from "../../../api/client";

export type ShortReelDraftStatus = "loading" | "ready" | "not_found" | "error";

export interface UseShortReelDraftOptions {
  channelId: string;
  reelId: string;
  onNotice?: (notice: NonNullable<Notice>) => void;
}

export interface UseShortReelDraftResult {
  status: ShortReelDraftStatus;
  reel: ShortReelRecord | null;
  error: string | null;
  retry: () => void;
}

export function useShortReelDraft({ channelId, reelId, onNotice }: UseShortReelDraftOptions): UseShortReelDraftResult {
  const [reel, setReel] = useState<ShortReelRecord | null>(null);
  const [status, setStatus] = useState<ShortReelDraftStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [reloadCount, setReloadCount] = useState(0);

  const retry = useCallback(() => {
    setReloadCount((c) => c + 1);
  }, []);

  useEffect(() => {
    window.addEventListener("online", retry);
    return () => window.removeEventListener("online", retry);
  }, [retry]);

  useEffect(() => {
    let cancelled = false;

    async function fetchReel() {
      setStatus("loading");
      setError(null);

      try {
        const response = await api.getShortReel(channelId, reelId);
        if (cancelled) return;

        if (response.short_reel) {
          setReel(response.short_reel);
          setStatus("ready");
        } else {
          setReel(null);
          setStatus("not_found");
          setError("The requested Short-Reel was not found.");
        }
      } catch (err) {
        if (cancelled) return;

        const message = err instanceof Error ? err.message : "Failed to load Short-Reel";
        const isNotFound = err instanceof ApiError && err.status === 404;

        setReel(null);
        setError(message);
        setStatus(isNotFound ? "not_found" : "error");

        onNotice?.({ tone: "bad", message });
      }
    }

    void fetchReel();

    return () => {
      cancelled = true;
    };
  }, [channelId, reelId, reloadCount, onNotice]);

  return {
    status,
    reel,
    error,
    retry,
  };
}
