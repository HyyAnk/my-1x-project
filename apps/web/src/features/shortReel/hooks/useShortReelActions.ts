import { useCallback, useState } from "react";
import type {
  GenerateShortReelTarget,
  ReelGenerationMode,
  ReelPublishingPayload,
  ReelSegment,
  ShortReelRecord,
  Task,
  UpdateShortReelRequest,
} from "@studio/shared";
import type { Notice } from "../../../components/types";
import { api, ApiError } from "../../../api";

export interface UseShortReelActionsOptions {
  channelId: string;
  reelId: string;
  reel: ShortReelRecord | null;
  setReel: (reel: ShortReelRecord) => void;
  activeTask: Task | null;
  setActiveTask: (task: Task | null) => void;
  getBaseRevision: (fallbackRevision: number) => number;
  markScriptSaved: (updated: ShortReelRecord) => void;
  markPublishingSaved: (updated: ShortReelRecord) => void;
  onSyncRecord: () => Promise<void>;
  onNotice?: (notice: NonNullable<Notice>) => void;
}

function createRequestId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function useShortReelActions({
  channelId,
  reelId,
  reel,
  setReel,
  activeTask,
  setActiveTask,
  getBaseRevision,
  markScriptSaved,
  markPublishingSaved,
  onSyncRecord,
  onNotice,
}: UseShortReelActionsOptions) {
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const executeUpdate = useCallback(
    async (
      prefix: string,
      command: UpdateShortReelRequest["command"],
      successMsg: string,
      onSaved: (updated: ShortReelRecord) => void,
    ) => {
      if (!reel) return;
      setIsSaving(true);
      try {
        const response = await api.updateShortReel(channelId, reelId, {
          expected_revision: getBaseRevision(reel.revision),
          request_id: createRequestId(prefix),
          command,
        });

        const updated = response.short_reel;
        setReel(updated);
        onSaved(updated);
        onNotice?.({ tone: "good", message: successMsg });
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) {
          onNotice?.({
            tone: "bad",
            message: "Conflict: This Short-Reel was updated elsewhere. Your draft has been kept.",
          });
          void onSyncRecord();
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
    [channelId, reelId, reel, getBaseRevision, onNotice, onSyncRecord, setReel],
  );

  const saveSegment = useCallback(
    (segmentIndex: 1 | 2 | 3, segment: ReelSegment) =>
      executeUpdate(
        "save-seg",
        { kind: "update_segment", segment_index: segmentIndex, segment },
        `Segment ${segmentIndex} saved successfully.`,
        markScriptSaved,
      ),
    [executeUpdate, markScriptSaved],
  );

  const savePublishing = useCallback(
    (publishing: ReelPublishingPayload) =>
      executeUpdate(
        "save-pub",
        { kind: "update_publishing", publishing },
        "Publishing details saved successfully.",
        markPublishingSaved,
      ),
    [executeUpdate, markPublishingSaved],
  );

  const generate = useCallback(
    async (target: GenerateShortReelTarget = "package", mode?: ReelGenerationMode) => {
      if (!reel) return;
      setIsGenerating(true);
      try {
        const response = await api.generateShortReel(channelId, reelId, {
          expected_revision: reel.revision,
          request_id: createRequestId("gen"),
          target,
          mode,
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
    [channelId, reelId, reel, onNotice, setActiveTask],
  );

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
    [channelId, reelId, reel, activeTask, onNotice, setReel, setActiveTask],
  );

  return {
    isSaving,
    isGenerating,
    setIsGenerating,
    saveSegment,
    savePublishing,
    generate,
    cancel,
  };
}
