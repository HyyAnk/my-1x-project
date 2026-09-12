import { useLayoutEffect, useRef, useState } from "react";
import { estimateSpokenSeconds, type Scene, type Task } from "@studio/shared";
import { InlineTaskState } from "./InlineTaskState";
import { isTaskActive } from "../lib/utils";
import { ScenePromptEditor } from "./scene/ScenePromptEditor";
import { SceneOverlayEditor } from "./scene/SceneOverlayEditor";
import { SceneCardHeader } from "./scene/SceneCardHeader";
import { SceneNarrationBlock } from "./scene/SceneNarrationBlock";
import { SceneNotesEditor } from "./scene/SceneNotesEditor";

export function SceneCard({
  scene,
  nextScene,
  task,
  audioTask,
  channelId,
  episodeId,
  now,
  maxDuration,
  narrationWordsPerSecond,
  copied,
  busy,
  globalPromptExpanded = null,
  onCopy,
  onChange,
  onRegenerate,
  onGenerateAudio,
  onMergeNext,
  onOpenPromptModal,
}: {
  scene: Scene;
  nextScene: Scene | null;
  task: Task | null;
  audioTask: Task | null;
  channelId: string;
  episodeId: string;
  now: number;
  maxDuration: number;
  narrationWordsPerSecond: number;
  copied: string | null;
  busy: string | null;
  globalPromptExpanded?: boolean | null;
  onCopy: (key: string, value: string) => Promise<void>;
  onChange: (scene: Scene) => void;
  onRegenerate: (type: Task["task_type"]) => void;
  onGenerateAudio: () => void;
  onMergeNext: () => void;
  onOpenPromptModal?: (scene: Scene) => void;
}) {
  const dialogueRef = useRef<HTMLTextAreaElement | null>(null);
  const promptRef = useRef<HTMLTextAreaElement | null>(null);
  const [localPromptExpanded, setLocalPromptExpanded] = useState(false);
  const isPromptExpanded = globalPromptExpanded !== null && globalPromptExpanded !== undefined ? globalPromptExpanded : localPromptExpanded;

  const regenerating = Boolean(task && isTaskActive(task));
  const audioGenerating = Boolean(audioTask && isTaskActive(audioTask));
  const processing = regenerating || audioGenerating;
  const audioFailed = audioTask?.status === "FAILED" || audioTask?.status === "CANCELLED";
  const submitting = busy === `REGENERATE_BOTH${scene.scene_number}`;
  const mergePending = busy === `MERGE_NEXT${scene.scene_number}`;
  const audioFilename = scene.audio_asset_path?.split("/").pop();
  const audioSrc = audioFilename
    ? `/api/channels/${channelId}/episodes/${episodeId}/assets/${audioFilename}?v=${encodeURIComponent(scene.audio_generated_at ?? "")}`
    : null;
  const audioMismatch =
    scene.audio_duration_seconds !== null &&
    scene.audio_duration_seconds !== undefined &&
    Math.abs(scene.audio_duration_seconds - scene.duration_seconds) > Math.max(1, scene.duration_seconds * 0.15);
  const audioDelta =
    scene.audio_duration_seconds === null || scene.audio_duration_seconds === undefined
      ? 0
      : Math.abs(scene.audio_duration_seconds - scene.duration_seconds);
  const audioDirection = (scene.audio_duration_seconds ?? 0) > scene.duration_seconds ? "longer" : "shorter";
  const shotCount = scene.visual_prompt.trim() ? scene.visual_prompt.split(/^\s*(?:CUT|HARD CUT)\s*$/m).length : 0;
  const estimatedNarrationSeconds = estimateSpokenSeconds(scene.dialogue, narrationWordsPerSecond);
  const narrationReadout = Number.isInteger(estimatedNarrationSeconds)
    ? String(estimatedNarrationSeconds)
    : estimatedNarrationSeconds.toFixed(1);
  const overlay: Scene["editorial_overlay"] = scene.editorial_overlay ?? {
    kind: "none",
    text: "",
    motion: "none",
    placement: "lower_third",
    duration_seconds: null,
    data: [],
    source_ids: [],
  };
  const matchDuration = () => {
    if (scene.audio_duration_seconds !== null && scene.audio_duration_seconds !== undefined)
      onChange({ ...scene, duration_seconds: Math.min(maxDuration, Math.max(1, Math.round(scene.audio_duration_seconds))) });
  };
  const autoGrow = (element: HTMLTextAreaElement) => {
    element.style.height = "auto";
    element.style.height = `${element.scrollHeight}px`;
  };
  const list = (value: string) =>
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

  useLayoutEffect(() => {
    if (dialogueRef.current) autoGrow(dialogueRef.current);
    if (promptRef.current && isPromptExpanded) autoGrow(promptRef.current);
    else if (promptRef.current && !isPromptExpanded) {
      promptRef.current.style.height = "64px";
    }
  }, [scene.dialogue, scene.visual_prompt, isPromptExpanded]);

  return (
    <article className={`scene-card ${processing || mergePending ? "is-processing" : ""}`}>
      <SceneCardHeader
        scene={scene}
        nextScene={nextScene}
        maxDuration={maxDuration}
        processing={processing}
        mergePending={mergePending}
        submitting={submitting}
        regenerating={regenerating}
        narrationReadout={narrationReadout}
        shotCount={shotCount}
        audioMismatch={audioMismatch}
        audioDelta={audioDelta}
        audioDirection={audioDirection}
        overlayKind={overlay.kind}
        onChange={onChange}
        onRegenerate={onRegenerate}
        onMergeNext={onMergeNext}
        onMatchDuration={matchDuration}
      />
      {task ? <InlineTaskState task={task} now={now} /> : null}
      <div className="scene-columns">
        <SceneNarrationBlock
          scene={scene}
          audioTask={audioTask}
          audioSrc={audioSrc}
          processing={processing}
          mergePending={mergePending}
          audioFailed={audioFailed}
          audioMismatch={audioMismatch}
          audioDelta={audioDelta}
          audioDirection={audioDirection}
          now={now}
          copied={copied}
          dialogueRef={dialogueRef}
          onCopy={onCopy}
          onGenerateAudio={onGenerateAudio}
          onMatchDuration={matchDuration}
          onChange={onChange}
          autoGrow={autoGrow}
        />
        <ScenePromptEditor
          scene={scene}
          channelId={channelId}
          episodeId={episodeId}
          isPromptExpanded={isPromptExpanded}
          setLocalPromptExpanded={setLocalPromptExpanded}
          promptRef={promptRef}
          processing={processing}
          mergePending={mergePending}
          copied={copied}
          onCopy={onCopy}
          onChange={onChange}
          onOpenPromptModal={onOpenPromptModal}
          autoGrow={autoGrow}
        />
      </div>
      <SceneNotesEditor
        scene={scene}
        processing={processing}
        mergePending={mergePending}
        onChange={onChange}
      />
      <SceneOverlayEditor
        scene={scene}
        overlay={overlay}
        processing={processing}
        mergePending={mergePending}
        onChange={onChange}
        list={list}
      />
    </article>
  );
}
