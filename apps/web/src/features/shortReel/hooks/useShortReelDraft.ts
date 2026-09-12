import { useCallback, useRef, useState } from "react";
import type { ReelPublishingPayload, ReelSegment, ShortReelRecord } from "@studio/shared";
import type { Notice } from "../../../components/types";

export interface UseShortReelDraftOptions {
  currentReel: ShortReelRecord | null;
  onNotice?: (notice: NonNullable<Notice>) => void;
  onApplyRemoteReel: (remoteReel: ShortReelRecord) => void;
}

export function cloneDraftScript(reel: ShortReelRecord): ReelSegment[] | null {
  return reel.script?.segments ? [...reel.script.segments] : null;
}

export function cloneDraftPublishing(reel: ShortReelRecord): ReelPublishingPayload | null {
  return reel.units.publishing.last_accepted_payload ? { ...reel.units.publishing.last_accepted_payload } : null;
}

export function useShortReelDraft({ currentReel, onNotice, onApplyRemoteReel }: UseShortReelDraftOptions) {
  const [draftScript, setDraftScriptState] = useState<ReelSegment[] | null>(null);
  const [draftPublishing, setDraftPublishingState] = useState<ReelPublishingPayload | null>(null);
  const [draftModelNote, setDraftModelNoteState] = useState<string | null>(null);
  const [isDraftDirty, setIsDraftDirty] = useState(false);
  const [dirtyFields, setDirtyFields] = useState<{ script: boolean; publishing: boolean }>({
    script: false,
    publishing: false,
  });
  const [conflictRemoteRecord, setConflictRemoteRecord] = useState<ShortReelRecord | null>(null);

  const isDraftDirtyRef = useRef(isDraftDirty);
  isDraftDirtyRef.current = isDraftDirty;
  const draftBaseRevisionRef = useRef<number | null>(null);
  const currentReelRef = useRef(currentReel);
  currentReelRef.current = currentReel;
  const onNoticeRef = useRef(onNotice);
  onNoticeRef.current = onNotice;
  const onApplyRemoteReelRef = useRef(onApplyRemoteReel);
  onApplyRemoteReelRef.current = onApplyRemoteReel;

  const setDraftScript = useCallback((segments: ReelSegment[]) => {
    if (!isDraftDirtyRef.current) {
      draftBaseRevisionRef.current = currentReelRef.current?.revision ?? 1;
    }
    setDraftScriptState(segments);
    setIsDraftDirty(true);
    setDirtyFields((prev) => ({ ...prev, script: true }));
  }, []);

  const setDraftPublishing = useCallback((publishing: ReelPublishingPayload) => {
    if (!isDraftDirtyRef.current) {
      draftBaseRevisionRef.current = currentReelRef.current?.revision ?? 1;
    }
    setDraftPublishingState(publishing);
    setIsDraftDirty(true);
    setDirtyFields((prev) => ({ ...prev, publishing: true }));
  }, []);

  const setDraftModelNote = useCallback((note: string) => {
    setDraftModelNoteState(note);
    setIsDraftDirty(true);
  }, []);

  const handleRemoteSync = useCallback((remoteReel: ShortReelRecord, priorReel: ShortReelRecord | null) => {
    if (isDraftDirtyRef.current && priorReel && remoteReel.revision > priorReel.revision) {
      // Conflict: remote record advanced while local draft has uncommitted edits
      setConflictRemoteRecord(remoteReel);
    } else {
      if (!isDraftDirtyRef.current) {
        setDraftScriptState(cloneDraftScript(remoteReel));
        setDraftPublishingState(cloneDraftPublishing(remoteReel));
        setDraftModelNoteState(remoteReel.model_note ?? "");
      }
      setConflictRemoteRecord(null);
    }
  }, []);

  const markScriptSaved = useCallback((updated: ShortReelRecord) => {
    setDraftScriptState(cloneDraftScript(updated));
    setDirtyFields((prev) => ({ ...prev, script: false }));
    setIsDraftDirty(false);
    draftBaseRevisionRef.current = null;
    setConflictRemoteRecord(null);
  }, []);

  const markPublishingSaved = useCallback((updated: ShortReelRecord) => {
    setDraftPublishingState(cloneDraftPublishing(updated));
    setDirtyFields((prev) => ({ ...prev, publishing: false }));
    setIsDraftDirty(false);
    draftBaseRevisionRef.current = null;
    setConflictRemoteRecord(null);
  }, []);

  const keepLocalDraft = useCallback(() => {
    setConflictRemoteRecord(null);
    onNoticeRef.current?.({ tone: "neutral", message: "Local draft kept. Reload the latest revision before saving." });
  }, []);

  const discardDraftAndReload = useCallback(() => {
    if (conflictRemoteRecord) {
      onApplyRemoteReelRef.current(conflictRemoteRecord);
      setDraftScriptState(cloneDraftScript(conflictRemoteRecord));
      setDraftPublishingState(cloneDraftPublishing(conflictRemoteRecord));
      setDraftModelNoteState(conflictRemoteRecord.model_note ?? "");
      setIsDraftDirty(false);
      draftBaseRevisionRef.current = null;
      setDirtyFields({ script: false, publishing: false });
      setConflictRemoteRecord(null);
      onNoticeRef.current?.({ tone: "neutral", message: "Reloaded latest remote version." });
    }
  }, [conflictRemoteRecord]);

  const getBaseRevision = useCallback(
    (fallbackRevision: number) => draftBaseRevisionRef.current ?? fallbackRevision,
    [],
  );

  return {
    draftScript,
    draftPublishing,
    draftModelNote,
    isDraftDirty,
    dirtyFields,
    conflictRemoteRecord,
    setDraftScript,
    setDraftPublishing,
    setDraftModelNote,
    handleRemoteSync,
    markScriptSaved,
    markPublishingSaved,
    keepLocalDraft,
    discardDraftAndReload,
    getBaseRevision,
  };
}
