import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TopicAvailability, TopicAvailabilityBatch } from "@studio/shared";
import { channelApi } from "../../../api/channelApi";

export type UseTopicAvailabilityProps = {
  channelId: string;
  enabled?: boolean;
  pollIntervalMs?: number;
};

export type UseTopicAvailabilityReturn = {
  availability: TopicAvailabilityBatch | null;
  availabilityMap: Map<string, TopicAvailability>;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<TopicAvailabilityBatch | null>;
};

const DEFAULT_POLL_INTERVAL_MS = 30_000;
const MIN_POLL_INTERVAL_MS = 5_000;
const MAX_POLL_INTERVAL_MS = 120_000;

export function useTopicAvailability({
  channelId,
  enabled = true,
  pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
}: UseTopicAvailabilityProps): UseTopicAvailabilityReturn {
  const [availability, setAvailability] = useState<TopicAvailabilityBatch | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(channelId && enabled));
  const [error, setError] = useState<Error | null>(null);

  const sequenceRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef<boolean>(true);

  const boundedInterval = Math.max(MIN_POLL_INTERVAL_MS, Math.min(MAX_POLL_INTERVAL_MS, pollIntervalMs));

  const refresh = useCallback(async (): Promise<TopicAvailabilityBatch | null> => {
    if (!channelId || !enabled) return null;

    // Abort previous in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const requestSeq = ++sequenceRef.current;
    setLoading(true);

    try {
      const result = await channelApi.topicAvailability(channelId, { signal: controller.signal });

      // Out-of-order rejection: drop if a newer request was dispatched
      if (requestSeq !== sequenceRef.current || !isMountedRef.current || controller.signal.aborted) {
        return null;
      }

      setAvailability(result);
      setError(null);
      return result;
    } catch (err: unknown) {
      // Ignore AbortError from cancellation
      if (err instanceof DOMException && err.name === "AbortError") {
        return null;
      }
      if (err instanceof Error && err.name === "AbortError") {
        return null;
      }

      if (requestSeq === sequenceRef.current && isMountedRef.current) {
        const errorObj = err instanceof Error ? err : new Error(String(err));
        setError(errorObj);
      }
      return null;
    } finally {
      if (requestSeq === sequenceRef.current && isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [channelId, enabled]);

  // Initial and reactive fetch on channel change
  useEffect(() => {
    isMountedRef.current = true;
    setAvailability(null);
    setError(null);
    if (channelId && enabled) {
      void refresh();
    } else {
      setAvailability(null);
      setLoading(false);
      setError(null);
    }

    return () => {
      isMountedRef.current = false;
      sequenceRef.current += 1;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [channelId, enabled, refresh]);

  // Event transport: window focus, online reconnect, visibility changes, and bounded polling
  useEffect(() => {
    if (!channelId || !enabled) return;

    let lastTriggerTime = 0;
    const triggerThrottled = () => {
      const now = Date.now();
      if (now - lastTriggerTime < 1000) return;
      lastTriggerTime = now;
      void refresh();
    };

    const onFocus = () => {
      triggerThrottled();
    };

    const onOnline = () => {
      triggerThrottled();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        triggerThrottled();
      }
    };

    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisibilityChange);

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    }, boundedInterval);

    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.clearInterval(intervalId);
    };
  }, [channelId, enabled, boundedInterval, refresh]);

  const availabilityMap = useMemo(() => {
    const map = new Map<string, TopicAvailability>();
    if (availability && Array.isArray(availability.topics)) {
      for (const topic of availability.topics) {
        map.set(topic.topic_id, topic);
      }
    }
    return map;
  }, [availability]);

  return {
    availability,
    availabilityMap,
    loading,
    error,
    refresh,
  };
}
