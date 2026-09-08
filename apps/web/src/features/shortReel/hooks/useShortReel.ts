import { useCallback, useEffect, useRef, useState } from "react";
import type { GenerateShortReelTarget, ReelPublishingPayload, ReelSegment, ShortReelRecord, Task } from "@studio/shared";
import type { Notice } from "../../../components/types";
import { api, ApiError } from "../../../api";
import { useShortReelTaskSync } from "./useShortReelTaskSync";
import { useShortReelExport } from "./useShortReelExport";

export interface UseShortReelOptions {
  channelId: string;
  reelId: string;
  onNotice?: (notice: NonNullable<Notice>) => void;
}

export type ShortReelStudioStatus = "loading" | "ready" | "not_found" | "error";

const TERMINAL_GENERATION_STATUSES = ["QUEUED", "RUNNING", "WAITING_APPROVAL"];

function createRequestId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function cloneDraftScript(reel: ShortReelRecord): ReelSegment[] | null {
  return reel.script?.segments ? [...reel.script.segments] : null;
}

function cloneDraftPublishing(reel: ShortReelRecord): ReelPublishingPayload | null {
  return reel.units.publishing.last_accepted_payload ? { ...reel.units.publishing.last_accepted_payload } : null;
}

export function useShortReel({ channelId, reelId, onNotice }: UseShortReelOptions) {
  const [status, setStatus] = useState<ShortReelStudioStatus>("loading");
  const [reel, setReel] = useState<ShortReelRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  // Local draft state for edits
  const [draftScript, setDraftScript] = useState<ReelSegment[] | null>(null);
  const [draftPublishing, setDraftPublishing] = useState<ReelPublishingPayload | null>(null);
  const [draftModelNote, setDraftModelNote] = useState<string | null>(null);
  const [isDraftDirty, setIsDraftDirty] = useState(false);
  const [conflictRemoteRecord, setConflictRemoteRecord] = useState<ShortReelRecord | null>(null);

  // Copy fallback modal state (for clipboard permission denial)
  const [clipboardFallbackText, setClipboardFallbackText] = useState<string | null>(null);

  // Ref tracking current dirty state to prevent race conditions
  const isDraftDirtyRef = useRef(isDraftDirty);
  isDraftDirtyRef.current = isDraftDirty;

  // Ref tracking current target reel ID to discard stale responses
  const activeReelIdRef = useRef(reelId);
  activeReelIdRef.current = reelId;
  const reelRef = useRef(reel);
  reelRef.current = reel;
  const onNoticeRef = useRef(onNotice);
  onNoticeRef.current = onNotice;

  const loadReel = useCallback(
    async (silent = false) => {
      const targetReelId = reelId;
      if (!silent) setStatus("loading");
      try {
        const response = await api.getShortReel(channelId, targetReelId);
        if (activeReelIdRef.current !== targetReelId) return;
        const remoteReel = response.short_reel;
        setActiveTask(response.task ?? null);
        setIsGenerating(Boolean(response.task && TERMINAL_GENERATION_STATUSES.includes(response.task.status)));

        const currentReel = reelRef.current;
        if (isDraftDirtyRef.current && currentReel && remoteReel.revision > currentReel.revision) {
          // Conflict: user is currently editing while remote record advanced
          setConflictRemoteRecord(remoteReel);
        } else {
          setReel(remoteReel);
          if (!isDraftDirtyRef.current) {
            setDraftScript(cloneDraftScript(remoteReel));
            setDraftPublishing(cloneDraftPublishing(remoteReel));
            setDraftModelNote(remoteReel.model_note ?? "");
          }
          setConflictRemoteRecord(null);
        }

        setStatus("ready");
        setError(null);
      } catch (err) {
        if (activeReelIdRef.current !== targetReelId) return;
        const msg = err instanceof Error ? err.message : "Failed to load Short-Reel.";
        onNoticeRef.current?.({ tone: "bad", message: msg });
        if (err instanceof ApiError && err.status === 404) {
          setStatus("not_found");
          setError(msg);
        } else {
          setStatus("error");
          setError(msg);
        }
      }
    },
    [channelId, reelId],
  );

  useEffect(() => {
    void loadReel();
  }, [channelId, reelId]);

  // Real-time task progress listening (SSE), delegated to the task sync hook
  const handleTaskUpdate = useCallback((task: Task) => {
    setActiveTask(task);
  }, []);

  const handleTaskSettled = useCallback(() => {
    setIsGenerating(false);
    void loadReel(true);
  }, [loadReel]);

  useShortReelTaskSync({ reelId, onTaskUpdate: handleTaskUpdate, onTaskSettled: handleTaskSettled });

  // Visibility-aware bounded fallback polling and connectivity recovery
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void loadReel(true);
      }
    };
    const onOnline = () => {
      void loadReel();
    };
    window.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("online", onOnline);
    };
  }, [loadReel]);

  // Save specific segment edit
  const saveSegment = useCallback(
    async (segmentIndex: 1 | 2 | 3, segment: ReelSegment) => {
      if (!reel) return;
      setIsSaving(true);
      try {
        const response = await api.updateShortReel(channelId, reelId, {
          expected_revision: reel.revision,
          request_id: createRequestId("save-seg"),
          command: {
            kind: "update_segment",
            segment_index: segmentIndex,
            segment,
          },
        });

        const updated = response.short_reel;
        setReel(updated);
        setDraftScript(cloneDraftScript(updated));
        setIsDraftDirty(false);
        setConflictRemoteRecord(null);
        onNotice?.({ tone: "good", message: `Segment ${segmentIndex} saved successfully.` });
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) {
          onNotice?.({
            tone: "bad",
            message: "Conflict: This Short-Reel was updated elsewhere. Your draft has been kept.",
          });
          void loadReel(true);
        } else {
          onNotice?.({
            tone: "bad",
            message: err instanceof Error ? err.message : "Failed to save segment.",
          });
        }
      } finally {
        setIsSaving(false);
      }
    },
    [channelId, reelId, reel, onNotice, loadReel],
  );

  // Save publishing details
  const savePublishing = useCallback(
    async (publishing: ReelPublishingPayload) => {
      if (!reel) return;
      setIsSaving(true);
      try {
        const response = await api.updateShortReel(channelId, reelId, {
          expected_revision: reel.revision,
          request_id: createRequestId("save-pub"),
          command: {
            kind: "update_publishing",
            publishing,
          },
        });

        const updated = response.short_reel;
        setReel(updated);
        setDraftPublishing(cloneDraftPublishing(updated));
        setIsDraftDirty(false);
        setConflictRemoteRecord(null);
        onNotice?.({ tone: "good", message: "Publishing details saved successfully." });
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) {
          onNotice?.({
            tone: "bad",
            message: "Conflict: This Short-Reel was updated elsewhere. Your draft has been kept.",
          });
          void loadReel(true);
        } else {
          onNotice?.({
            tone: "bad",
            message: err instanceof Error ? err.message : "Failed to save publishing details.",
          });
        }
      } finally {
        setIsSaving(false);
      }
    },
    [channelId, reelId, reel, onNotice, loadReel],
  );

  // Generate package or unit
  const generate = useCallback(
    async (target: GenerateShortReelTarget = "package") => {
      if (!reel) return;
      setIsGenerating(true);
      try {
        const response = await api.generateShortReel(channelId, reelId, {
          expected_revision: reel.revision,
          request_id: createRequestId("gen"),
          target,
        });

        setActiveTask(response.task);
        onNotice?.({ tone: "neutral", message: `Generation started for ${target}.` });
      } catch (err) {
        setIsGenerating(false);
        onNotice?.({
          tone: "bad",
          message: err instanceof Error ? err.message : "Failed to start generation.",
        });
      }
    },
    [channelId, reelId, reel, onNotice],
  );

  // Cancel generation
  const cancel = useCallback(
    async (operationId?: string) => {
      if (!reel) return;
      const pendingOperation = (["script", "references", "cover", "publishing"] as const)
        .map((unitKey) => reel.units[unitKey].current_attempt?.operation_id)
        .find((candidate): candidate is string => Boolean(candidate));
      const opId = operationId ?? activeTask?.task_id ?? pendingOperation;
      if (!opId) return;
      try {
        const response = await api.cancelShortReel(channelId, reelId, {
          operation_id: opId,
          request_id: `cancel-${Date.now()}`,
        });

        setIsGenerating(false);
        setReel(response.short_reel);
        if (response.task) setActiveTask(response.task);
        onNotice?.({ tone: "neutral", message: "Generation cancelled." });
      } catch (err) {
        onNotice?.({
          tone: "bad",
          message: err instanceof Error ? err.message : "Failed to cancel generation.",
        });
      }
    },
    [channelId, reelId, reel, activeTask, onNotice],
  );

  // Export PKZIP package (DOM Blob download), delegated to the export hook
  const { exportPackage } = useShortReelExport({ channelId, reelId, reel, onNotice });

  // Copy to clipboard with selectable text fallback on permission rejection
  const copyText = useCallback(
    async (text: string, label: string = "Text"): Promise<boolean> => {
      try {
        if (!navigator.clipboard?.writeText) {
          throw new Error("Clipboard API not supported");
        }
        await navigator.clipboard.writeText(text);
        onNotice?.({ tone: "good", message: `${label} copied to clipboard.` });
        return true;
      } catch {
        // Fallback: show modal dialog with selectable text
        setClipboardFallbackText(text);
        onNotice?.({
          tone: "neutral",
          message: `Clipboard access was denied. Please copy the ${label.toLowerCase()} manually from the dialog.`,
        });
        return false;
      }
    },
    [onNotice],
  );

  // Conflict resolution helpers
  const keepLocalDraft = useCallback(() => {
    setConflictRemoteRecord(null);
    onNotice?.({ tone: "neutral", message: "Local draft kept. Reload the latest revision before saving." });
  }, [onNotice]);

  const discardDraftAndReload = useCallback(() => {
    if (conflictRemoteRecord) {
      setReel(conflictRemoteRecord);
      setDraftScript(cloneDraftScript(conflictRemoteRecord));
      setDraftPublishing(cloneDraftPublishing(conflictRemoteRecord));
      setDraftModelNote(conflictRemoteRecord.model_note ?? "");
      setIsDraftDirty(false);
      setConflictRemoteRecord(null);
      onNotice?.({ tone: "neutral", message: "Reloaded latest remote version." });
    }
  }, [conflictRemoteRecord, onNotice]);

  return {
    status,
    reel,
    error,
    isSaving,
    isGenerating,
    activeTask,
    draftScript,
    draftPublishing,
    draftModelNote,
    isDraftDirty,
    conflictRemoteRecord,
    clipboardFallbackText,
    setDraftScript: (segments: ReelSegment[]) => {
      setDraftScript(segments);
      setIsDraftDirty(true);
    },
    setDraftPublishing: (publishing: ReelPublishingPayload) => {
      setDraftPublishing(publishing);
      setIsDraftDirty(true);
    },
    setDraftModelNote: (note: string) => {
      setDraftModelNote(note);
      setIsDraftDirty(true);
    },
    clearClipboardFallback: () => setClipboardFallbackText(null),
    saveSegment,
    savePublishing,
    generate,
    cancel,
    exportPackage,
    copyText,
    keepLocalDraft,
    discardDraftAndReload,
    retry: () => loadReel(false),
  };
}
