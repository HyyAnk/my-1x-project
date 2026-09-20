import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MascotStudioActivityWarning } from "@studio/shared";
import { mascotStudioActivityApi } from "../../services/mascotStudioActivityApi";
import type { MascotStudioActivityItem } from "../../types/mascotStudioActivity.types";
import { mapMascotStudioActivities } from "../../utils/mascotStudioActivityMapper";

const ACTIVE_POLL_INTERVAL_MS = 1_500;
const IDLE_POLL_INTERVAL_MS = 15_000;

export interface UseMascotStudioActivityReturn {
  activities: MascotStudioActivityItem[];
  warnings: MascotStudioActivityWarning[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  dismiss: (activityId: string) => void;
}

export function useMascotStudioActivity(mascotId?: string | null): UseMascotStudioActivityReturn {
  const [activities, setActivities] = useState<MascotStudioActivityItem[]>([]);
  const [warnings, setWarnings] = useState<MascotStudioActivityWarning[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => new Set());
  const [isLoading, setIsLoading] = useState(Boolean(mascotId));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(false);
  const requestSequenceRef = useRef(0);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      requestSequenceRef.current += 1;
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!mascotId) return;
    const requestSequence = ++requestSequenceRef.current;
    setIsRefreshing(true);
    if (!hasLoadedRef.current) setIsLoading(true);

    try {
      const response = await mascotStudioActivityApi.getStatus(mascotId);
      if (!mountedRef.current || requestSequence !== requestSequenceRef.current) return;
      setActivities(mapMascotStudioActivities(response));
      setWarnings(response.warnings);
      setError(null);
      hasLoadedRef.current = true;
    } catch (refreshError) {
      if (!mountedRef.current || requestSequence !== requestSequenceRef.current) return;
      setError(refreshError instanceof Error ? refreshError.message : "Failed to refresh background activity");
    } finally {
      if (mountedRef.current && requestSequence === requestSequenceRef.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [mascotId]);

  useEffect(() => {
    hasLoadedRef.current = false;
    setActivities([]);
    setWarnings([]);
    setDismissedIds(new Set());
    setError(null);
    setIsLoading(Boolean(mascotId));
    if (mascotId) void refresh();
  }, [mascotId, refresh]);

  const hasActiveActivity = activities.some((activity) => activity.isActive);
  useEffect(() => {
    if (!mascotId) return;
    const intervalMs = hasActiveActivity ? ACTIVE_POLL_INTERVAL_MS : IDLE_POLL_INTERVAL_MS;
    const timer = window.setInterval(() => void refresh(), intervalMs);
    return () => window.clearInterval(timer);
  }, [hasActiveActivity, mascotId, refresh]);

  useEffect(() => {
    if (!mascotId) return;
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const refreshWhenOnline = () => void refresh();
    document.addEventListener("visibilitychange", refreshWhenVisible);
    window.addEventListener("online", refreshWhenOnline);
    return () => {
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.removeEventListener("online", refreshWhenOnline);
    };
  }, [mascotId, refresh]);

  const dismiss = useCallback((activityId: string) => {
    setDismissedIds((current) => new Set(current).add(activityId));
  }, []);

  const visibleActivities = useMemo(
    () => activities.filter((activity) => activity.isActive || !dismissedIds.has(activity.id)),
    [activities, dismissedIds],
  );

  return {
    activities: visibleActivities,
    warnings,
    isLoading,
    isRefreshing,
    error,
    refresh,
    dismiss,
  };
}
