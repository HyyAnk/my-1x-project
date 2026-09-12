import { useCallback, useRef, useState } from "react";
import type { ShortReelRecord, Task } from "@studio/shared";
import type { Notice } from "../../../components/types";
import { useShortReelRecordSync } from "./useShortReelRecordSync";
import { useShortReelExport } from "./useShortReelExport";
import { useShortReelDraft } from "./useShortReelDraft";
import { useShortReelActions } from "./useShortReelActions";

export interface UseShortReelOptions {
  channelId: string;
  reelId: string;
  onNotice?: (notice: NonNullable<Notice>) => void;
}

export type ShortReelStudioStatus = "loading" | "ready" | "not_found" | "error";

const ACTIVE_TASK_STATUSES = ["QUEUED", "RUNNING", "WAITING_APPROVAL"];

export function useShortReel({ channelId, reelId, onNotice }: UseShortReelOptions) {
  const [status, setStatus] = useState<ShortReelStudioStatus>("loading");
  const [reel, setReel] = useState<ShortReelRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [clipboardFallbackText, setClipboardFallbackText] = useState<string | null>(null);

  const reelRef = useRef(reel);
  reelRef.current = reel;
  const onNoticeRef = useRef(onNotice);
  onNoticeRef.current = onNotice;
  const syncRecordRef = useRef<() => Promise<void>>(() => Promise.resolve());

  const draft = useShortReelDraft({
    currentReel: reel,
    onNotice,
    onApplyRemoteReel: setReel,
  });

  const { isSaving, isGenerating, setIsGenerating, saveSegment, savePublishing, generate, cancel } =
    useShortReelActions({
      channelId,
      reelId,
      reel,
      setReel,
      activeTask,
      setActiveTask,
      getBaseRevision: draft.getBaseRevision,
      markScriptSaved: draft.markScriptSaved,
      markPublishingSaved: draft.markPublishingSaved,
      onSyncRecord: () => syncRecordRef.current(),
      onNotice,
    });

  const handleRecordUpdated = useCallback(
    (remoteReel: ShortReelRecord, remoteTask: Task | null) => {
      setActiveTask(remoteTask);
      setIsGenerating(Boolean(remoteTask && ACTIVE_TASK_STATUSES.includes(remoteTask.status)));
      setReel(remoteReel);
      draft.handleRemoteSync(remoteReel, reelRef.current);
      setStatus("ready");
      setError(null);
    },
    [draft, setIsGenerating],
  );

  const handleTaskUpdated = useCallback(
    (task: Task) => {
      setActiveTask(task);
      setIsGenerating(ACTIVE_TASK_STATUSES.includes(task.status));
    },
    [setIsGenerating],
  );

  const handleSyncError = useCallback((err: Error, isNotFound: boolean) => {
    const msg = err.message;
    onNoticeRef.current?.({ tone: "bad", message: msg });
    setStatus(isNotFound ? "not_found" : "error");
    setError(msg);
  }, []);

  const { syncRecord } = useShortReelRecordSync({
    channelId,
    reelId,
    onRecordUpdated: handleRecordUpdated,
    onTaskUpdated: handleTaskUpdated,
    onError: handleSyncError,
  });
  syncRecordRef.current = syncRecord;

  const { exportPackage } = useShortReelExport({ channelId, reelId, reel, onNotice });

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

  return {
    status,
    reel,
    error,
    isSaving,
    isGenerating,
    activeTask,
    draftScript: draft.draftScript,
    draftPublishing: draft.draftPublishing,
    draftModelNote: draft.draftModelNote,
    isDraftDirty: draft.isDraftDirty,
    dirtyFields: draft.dirtyFields,
    conflictRemoteRecord: draft.conflictRemoteRecord,
    clipboardFallbackText,
    setDraftScript: draft.setDraftScript,
    setDraftPublishing: draft.setDraftPublishing,
    setDraftModelNote: draft.setDraftModelNote,
    clearClipboardFallback: () => setClipboardFallbackText(null),
    saveSegment,
    savePublishing,
    generate,
    cancel,
    exportPackage,
    copyText,
    keepLocalDraft: draft.keepLocalDraft,
    discardDraftAndReload: draft.discardDraftAndReload,
    retry: () => syncRecord(),
  };
}
