import { useState, useCallback, useRef, useEffect } from "react";
import type {
  MascotGreenScreenAuditResponse,
  MascotGreenScreenAuditStatusResponse,
  MascotProfile,
} from "@studio/shared";
import type { Notice } from "../../../components/types";
import { mascotGreenScreenAuditApi } from "../services/mascotGreenScreenAuditApi";

export interface UseMascotGreenScreenAuditProps {
  mascotId?: string | null;
  onNotice?: (notice: Notice) => void;
  onMascotUpdated?: (mascot: MascotProfile) => void;
}

export interface UseMascotGreenScreenAuditResult {
  isOpen: boolean;
  openAuditModal: () => void;
  closeAuditModal: () => void;
  isScanning: boolean;
  isRepairing: boolean;
  activeResult: MascotGreenScreenAuditResponse | null;
  auditStatus: MascotGreenScreenAuditStatusResponse | null;
  error: string | null;
  runScan: (options?: { style_id?: string }) => Promise<void>;
  runRepair: (options?: { style_id?: string }) => Promise<void>;
  clearError: () => void;
}

const REPAIR_POLL_INTERVAL_MS = 2500;

/**
 * Hook managing Chroma-Key Green Screen audit scan, auto-repair queueing,
 * live repair polling, and modal state.
 */
export function useMascotGreenScreenAudit({
  mascotId,
  onNotice,
}: UseMascotGreenScreenAuditProps = {}): UseMascotGreenScreenAuditResult {
  const [isOpen, setIsOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);
  const [activeResult, setActiveResult] = useState<MascotGreenScreenAuditResponse | null>(null);
  const [auditStatus, setAuditStatus] = useState<MascotGreenScreenAuditStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onNoticeRef = useRef(onNotice);

  useEffect(() => {
    onNoticeRef.current = onNotice;
  }, [onNotice]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, []);

  const clearPollTimer = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Executes a diagnostic scan on the mascot.
   */
  const runScan = useCallback(
    async (options?: { style_id?: string }) => {
      if (!mascotId) return;

      setIsScanning(true);
      setError(null);

      try {
        const result = await mascotGreenScreenAuditApi.runMascotGreenScreenAudit(mascotId, {
          mode: "scan",
          style_id: options?.style_id,
        });

        if (!isMountedRef.current) return;
        setActiveResult(result);

        try {
          const status = await mascotGreenScreenAuditApi.getMascotGreenScreenAuditStatus(mascotId);
          if (isMountedRef.current && status) {
            setAuditStatus(status);
            setIsRepairing(status.isRepairing);
          }
        } catch {
          // Status fetch is non-blocking for scan
        }
      } catch (err) {
        if (!isMountedRef.current) return;
        const msg = err instanceof Error ? err.message : "Failed to run green screen audit";
        setError(msg);
        if (onNoticeRef.current) {
          onNoticeRef.current({
            tone: "bad",
            message: msg,
          });
        }
      } finally {
        if (isMountedRef.current) {
          setIsScanning(false);
        }
      }
    },
    [mascotId],
  );

  /**
   * Polls repair status until all style/slot batches are complete.
   */
  const pollRepairStatus = useCallback(
    async (currentMascotId: string, styleId?: string) => {
      clearPollTimer();

      try {
        const status = await mascotGreenScreenAuditApi.getMascotGreenScreenAuditStatus(currentMascotId);
        if (!isMountedRef.current) return;

        setAuditStatus(status);

        if (status.isRepairing) {
          // Continue polling
          pollTimerRef.current = setTimeout(() => {
            void pollRepairStatus(currentMascotId, styleId);
          }, REPAIR_POLL_INTERVAL_MS);
        } else {
          // Finished repairing!
          setIsRepairing(false);
          // Re-scan to update the violations list
          void runScan({ style_id: styleId });
          if (onNoticeRef.current) {
            onNoticeRef.current({
              tone: "good",
              message: "Green screen remediation complete. All assets refreshed.",
            });
          }
        }
      } catch {
        if (!isMountedRef.current) return;
        // Retry polling on error unless unmounted
        pollTimerRef.current = setTimeout(() => {
          void pollRepairStatus(currentMascotId, styleId);
        }, REPAIR_POLL_INTERVAL_MS);
      }
    },
    [clearPollTimer, runScan],
  );

  /**
   * Triggers automated remediation of non-compliant assets.
   */
  const runRepair = useCallback(
    async (options?: { style_id?: string }) => {
      if (!mascotId) return;

      setIsRepairing(true);
      setError(null);

      try {
        const result = await mascotGreenScreenAuditApi.runMascotGreenScreenAudit(mascotId, {
          mode: "repair",
          style_id: options?.style_id,
        });

        if (!isMountedRef.current) return;

        setActiveResult(result);

        const queuedCount = result.summary.queuedJobCount ?? result.violations.length;
        if (onNoticeRef.current) {
          onNoticeRef.current({
            tone: "neutral",
            message: `Queued ${queuedCount} repair job(s) for automatic regeneration.`,
          });
        }

        // Start polling status
        void pollRepairStatus(mascotId, options?.style_id);
      } catch (err) {
        if (!isMountedRef.current) return;
        const msg = err instanceof Error ? err.message : "Failed to trigger green screen auto-repair";
        setError(msg);
        setIsRepairing(false);
        if (onNoticeRef.current) {
          onNoticeRef.current({
            tone: "bad",
            message: msg,
          });
        }
      }
    },
    [mascotId, pollRepairStatus],
  );

  const openAuditModal = useCallback(() => {
    setIsOpen(true);
    if (!activeResult && !isScanning && mascotId) {
      void runScan();
    }
  }, [activeResult, isScanning, mascotId, runScan]);

  const closeAuditModal = useCallback(() => {
    setIsOpen(false);
  }, []);

  return {
    isOpen,
    openAuditModal,
    closeAuditModal,
    isScanning,
    isRepairing,
    activeResult,
    auditStatus,
    error,
    runScan,
    runRepair,
    clearError,
  };
}
