import { useState } from "react";
import type { Channel, Scene, Task } from "@studio/shared";
import { api } from "../../../api";
import { formatTaskType } from "../../../lib/utils";
import type { Notice } from "../../../components/types";
import { artifactConfig, taskLabel, type ArtifactName } from "../types";

type UseEpisodeActionsProps = {
  channel: Channel;
  episodeId: string;
  scenes: Scene[];
  setScenes: (scenes: Scene[]) => void;
  activeEpisodeTask: Task | null;
  onTaskSubmitted: (task: Task) => void;
  onNotice: (notice: NonNullable<Notice>) => void;
  load: () => Promise<void>;
};

export function useEpisodeActions({
  channel,
  episodeId,
  scenes,
  setScenes,
  activeEpisodeTask,
  onTaskSubmitted,
  onNotice,
  load,
}: UseEpisodeActionsProps) {
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const createTask = async (taskType: Task["task_type"], sceneNumber?: number) => {
    if (
      taskType === "GENERATE_SCENES" &&
      scenes.length > 0 &&
      !window.confirm(`Replace all ${scenes.length} shots and clear their preview audio?`)
    )
      return;
    const taskKey = taskType + (sceneNumber ?? "");
    setBusy(taskKey);
    try {
      if (taskType === "GENERATE_SCENES") {
        const batch = await api.generateShots(channel.channel_id, episodeId);
        batch.tasks.forEach(onTaskSubmitted);
        onNotice({ tone: "good", message: `${batch.sequence_count} shot sequences queued` });
        return;
      }
      const result =
        taskType === "GENERATE_AUDIO"
          ? await api.generateAudio(channel.channel_id, episodeId, sceneNumber ?? 0)
          : await api.createTask({
              task_type: taskType,
              channel_id: channel.channel_id,
              episode_id: episodeId,
              scene_number: sceneNumber,
            });
      onTaskSubmitted(result.task);
      onNotice({ tone: "good", message: `${taskLabel(taskType)} queued` });
    } catch (error) {
      onNotice({ tone: "bad", message: error instanceof Error ? error.message : "Could not start task" });
    } finally {
      setBusy(null);
    }
  };

  const handleCancelActiveTask = async (taskToCancel?: Task | null) => {
    const target = taskToCancel || activeEpisodeTask;
    if (!target) return;
    try {
      setCancelling(true);
      const cancelled = await api.cancelTask(target.task_id);
      if (cancelled) onTaskSubmitted(cancelled);
      onNotice({ tone: "good", message: `Task ${formatTaskType(target.task_type)} stopped` });
      await load();
    } catch (error) {
      onNotice({ tone: "bad", message: error instanceof Error ? error.message : "Failed to stop task" });
    } finally {
      setCancelling(false);
    }
  };

  const saveArtifact = async (filename: ArtifactName, content: string) => {
    setBusy(filename);
    try {
      await api.saveFile(channel.channel_id, episodeId, filename, content);
      onNotice({
        tone: "good",
        message: `${artifactConfig.find((item) => item.filename === filename)?.title ?? "Artifact"} saved`,
      });
      await load();
    } catch (error) {
      onNotice({ tone: "bad", message: error instanceof Error ? error.message : "Could not save artifact" });
    } finally {
      setBusy(null);
    }
  };

  const saveScenes = async () => {
    setBusy("scenes");
    try {
      await api.saveScenes(channel.channel_id, episodeId, scenes);
      await load();
      onNotice({ tone: "good", message: "Shot edits saved" });
    } catch (error) {
      onNotice({ tone: "bad", message: error instanceof Error ? error.message : "Could not save shots" });
    } finally {
      setBusy(null);
    }
  };

  const mergeNext = async (sceneNumber: number) => {
    const key = `MERGE_NEXT${sceneNumber}`;
    setBusy(key);
    try {
      const result = await api.mergeNextScene(channel.channel_id, episodeId, sceneNumber);
      setScenes(result.scenes);
      onNotice({ tone: "good", message: `Shot ${sceneNumber} combined` });
    } catch (error) {
      onNotice({ tone: "bad", message: error instanceof Error ? error.message : "Could not combine shots" });
    } finally {
      setBusy(null);
    }
  };

  const openVideoFolder = async () => {
    setBusy("video-folder");
    try {
      await api.openVideoFolder(channel.channel_id, episodeId);
      onNotice({ tone: "good", message: "Video folder opened" });
    } catch (error) {
      onNotice({ tone: "bad", message: error instanceof Error ? error.message : "Could not open video folder" });
    } finally {
      setBusy(null);
    }
  };

  const copy = async (key: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(key);
    window.setTimeout(() => setCopied(null), 1300);
  };

  const copyAllVisualPrompts = async () => {
    const text = scenes
      .map((s) => `// Shot ${String(s.scene_number).padStart(2, "0")} (${s.sequence_title})\n${s.visual_prompt}`)
      .join("\n\n---\n\n");
    await navigator.clipboard.writeText(text);
    onNotice({ tone: "good", message: `Copied prompts for all ${scenes.length} shots to clipboard` });
  };

  const generateBundleImage = async (bundleNumber: number) => {
    const key = `bundle-image-${bundleNumber}`;
    setBusy(key);
    try {
      const result = await api.generateBundleImage(channel.channel_id, episodeId, bundleNumber);
      onTaskSubmitted(result.task);
      onNotice({ tone: "good", message: `Anchor image ${String(bundleNumber).padStart(2, "0")} queued` });
    } catch (error) {
      onNotice({ tone: "bad", message: error instanceof Error ? error.message : "Could not start anchor image" });
    } finally {
      setBusy(null);
    }
  };

  const generateAllBundleImages = async () => {
    setBusy("bundle-images-all");
    try {
      const result = await api.generateAllBundleImages(channel.channel_id, episodeId);
      result.tasks.forEach(onTaskSubmitted);
      onNotice({
        tone: "good",
        message: `${result.tasks.length} anchor image${result.tasks.length === 1 ? "" : "s"} queued`,
      });
    } catch (error) {
      onNotice({ tone: "bad", message: error instanceof Error ? error.message : "Could not start anchor images" });
    } finally {
      setBusy(null);
    }
  };

  return {
    busy,
    setBusy,
    copied,
    cancelling,
    createTask,
    handleCancelActiveTask,
    saveArtifact,
    saveScenes,
    mergeNext,
    openVideoFolder,
    copy,
    copyAllVisualPrompts,
    generateBundleImage,
    generateAllBundleImages,
  };
}
