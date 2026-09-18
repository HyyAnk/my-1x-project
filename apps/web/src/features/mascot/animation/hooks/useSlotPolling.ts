import { useCallback, useEffect, useRef, useState } from "react";
import type { MascotSlotProjection, MascotVideoProcessingJob } from "@studio/shared";
import { mascotAnimationApi } from "../services/mascotAnimationApi";

export interface UseSlotPollingProps {
  mascotId?: string | null;
  styleId?: string | null;
}

export interface UseSlotPollingReturn {
  slots: {
    thinking: MascotSlotProjection[];
    celebrate: MascotSlotProjection[];
  };
  setSlots: React.Dispatch<
    React.SetStateAction<{
      thinking: MascotSlotProjection[];
      celebrate: MascotSlotProjection[];
    }>
  >;
  activeJobs: Record<string, MascotVideoProcessingJob>;
  setActiveJobs: React.Dispatch<React.SetStateAction<Record<string, MascotVideoProcessingJob>>>;
  isLoading: boolean;
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  refreshSlots: () => Promise<void>;
  hasInFlightProcessing: boolean;
}

export function useSlotPolling({ mascotId, styleId }: UseSlotPollingProps): UseSlotPollingReturn {
  const [slots, setSlots] = useState<{
    thinking: MascotSlotProjection[];
    celebrate: MascotSlotProjection[];
  }>({
    thinking: [],
    celebrate: [],
  });

  const [activeJobs, setActiveJobs] = useState<Record<string, MascotVideoProcessingJob>>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const isMountedRef = useRef<boolean>(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const refreshSlots = useCallback(async () => {
    if (!mascotId || !styleId) return;

    try {
      const res = await mascotAnimationApi.getStyleAnimationSlots(mascotId, styleId);
      if (!isMountedRef.current) return;
      setSlots(res.slots);

      const allSlots = [...res.slots.thinking, ...res.slots.celebrate];
      const inFlightJobs = allSlots
        .filter((s) => ["processing", "retrying", "replacing", "queued"].includes(s.status) && s.active_job_id)
        .map((s) => s.active_job_id as string);

      if (inFlightJobs.length > 0) {
        const jobResults = await Promise.all(
          inFlightJobs.map((jid) =>
            mascotAnimationApi
              .getProcessingJob(mascotId, jid)
              .then((r) => r.job)
              .catch(() => null),
          ),
        );

        if (isMountedRef.current) {
          const nextJobs: Record<string, MascotVideoProcessingJob> = {};
          for (const j of jobResults) {
            if (j) nextJobs[j.id] = j;
          }
          setActiveJobs(nextJobs);
        }
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : "Failed to load animation slots");
      }
    }
  }, [mascotId, styleId]);

  useEffect(() => {
    if (!mascotId || !styleId) return;
    setIsLoading(true);
    void refreshSlots().finally(() => {
      if (isMountedRef.current) setIsLoading(false);
    });
  }, [mascotId, styleId, refreshSlots]);

  const hasInFlightProcessing =
    slots.thinking.some((s) => ["uploading", "processing", "retrying", "replacing", "queued"].includes(s.status)) ||
    slots.celebrate.some((s) => ["uploading", "processing", "retrying", "replacing", "queued"].includes(s.status));

  useEffect(() => {
    if (!hasInFlightProcessing || !mascotId || !styleId) return;

    const timer = setInterval(() => {
      void refreshSlots();
    }, 1200);

    return () => clearInterval(timer);
  }, [hasInFlightProcessing, mascotId, styleId, refreshSlots]);

  return {
    slots,
    setSlots,
    activeJobs,
    setActiveJobs,
    isLoading,
    error,
    setError,
    refreshSlots,
    hasInFlightProcessing,
  };
}
