import { useEffect, useMemo, useState } from "react";
import type { Channel, Scene, Task } from "@studio/shared";
import { api } from "../../../api";
import { formatTaskType, isTaskActive, isTaskTerminal, latestTask } from "../../../lib/utils";
import type { useEpisode } from "../../../hooks/useEpisode";
import type { Notice } from "../../../components/types";
import { artifactConfig, isReady, taskLabel, type ArtifactName, type PreviewImageData } from "../types";
import { useEpisodeSceneFiltering } from "./useEpisodeSceneFiltering";
import { useEpisodeStyles } from "./useEpisodeStyles";
import { useEpisodeRemix } from "./useEpisodeRemix";

type EpisodeState = ReturnType<typeof useEpisode>;

type UseEpisodePipelineProps = {
  channel: Channel;
  episodeId: string;
  tasks: Task[];
  activeTab?: string | null;
  onTabChange?: (tab: string) => void;
  onTaskSubmitted: (task: Task) => void;
  onNotice: (notice: NonNullable<Notice>) => void;
  simplifyMode?: boolean;
  state: EpisodeState;
};

export function useEpisodePipeline({
  channel,
  episodeId,
  tasks,
  activeTab,
  onTabChange,
  onTaskSubmitted,
  onNotice,
  simplifyMode = true,
  state,
}: UseEpisodePipelineProps) {
  const {
    episode,
    setEpisode,
    research,
    setResearch,
    treatment,
    setTreatment,
    script,
    setScript,
    visualBible,
    setVisualBible,
    scenes,
    setScenes,
    bundleImages,
    quizV2,
    load,
  } = state;

  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [episodeClock, setEpisodeClock] = useState(() => Date.now());
  const [previewImage, setPreviewImage] = useState<PreviewImageData | null>(null);
  const [promptModalScene, setPromptModalScene] = useState<Scene | null>(null);
  const [globalPromptExpanded, setGlobalPromptExpanded] = useState<boolean | null>(false);
  const [cancelling, setCancelling] = useState(false);
  const [observedTerminalTasks, setObservedTerminalTasks] = useState(() => new Set<string>());

  const isQuiz = channel.engine === "quiz" || channel.group_id === "quiz";
  const initialWorkflowTab =
    activeTab === "script" || activeTab === "visual" || activeTab === "timeline" || activeTab === "remix"
      ? activeTab
      : simplifyMode && isQuiz
        ? "remix"
        : "timeline";
  const [workflowTab, setWorkflowTab] = useState<"script" | "visual" | "timeline" | "remix">(initialWorkflowTab);

  // Sub-hooks
  const sceneFiltering = useEpisodeSceneFiltering(scenes);
  const styles = useEpisodeStyles({ channel, episodeId, episode, setEpisode, load, onNotice, setBusy });
  const remix = useEpisodeRemix({ channel, episodeId, quizV2, scenes, load, onNotice });

  useEffect(() => {
    if (simplifyMode && workflowTab !== "remix") {
      setWorkflowTab("remix");
    }
  }, [simplifyMode]);

  useEffect(() => {
    if (
      activeTab &&
      (activeTab === "script" || activeTab === "visual" || activeTab === "timeline" || activeTab === "remix") &&
      activeTab !== workflowTab
    ) {
      setWorkflowTab(activeTab);
    }
  }, [activeTab]);

  const switchWorkflowTab = (tab: "script" | "visual" | "timeline" | "remix") => {
    setWorkflowTab(tab);
    onTabChange?.(tab);
  };

  const episodeTasks = tasks.filter((task) => task.episode_id === episodeId);
  const sequenceShotTasks = episodeTasks.filter((task) => task.task_type === "GENERATE_SEQUENCE_SCENES");
  const latestShotBatchStartedAt =
    sequenceShotTasks
      .map((task) => task.created_at)
      .sort()
      .at(-1) ?? null;
  const currentShotBatch = latestShotBatchStartedAt
    ? sequenceShotTasks.filter((task) => Math.abs(Date.parse(task.created_at) - Date.parse(latestShotBatchStartedAt)) < 5_000)
    : [];
  const completedShotSequences = currentShotBatch.filter((task) => task.status === "COMPLETED").length;
  const activeEpisodeTask = episodeTasks.find(isTaskActive) ?? null;
  const pipelineTask = latestTask(episodeTasks, ["GENERATE_PIPELINE"]);

  useEffect(() => {
    setObservedTerminalTasks(new Set(episodeTasks.filter(isTaskTerminal).map((task) => task.task_id)));
  }, [episodeId]);

  useEffect(() => {
    if (!episodeTasks.some(isTaskActive)) return;
    const timer = window.setInterval(() => setEpisodeClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [episodeTasks.some(isTaskActive)]);

  useEffect(() => {
    const newlyTerminal = episodeTasks.filter((task) => isTaskTerminal(task) && !observedTerminalTasks.has(task.task_id));
    if (newlyTerminal.length === 0) return;
    setObservedTerminalTasks((current) => new Set([...current, ...newlyTerminal.map((task) => task.task_id)]));
    void load().catch((err: Error) => onNotice({ tone: "bad", message: err.message }));
  }, [episodeTasks.map((task) => `${task.task_id}:${task.status}`).join("|"), load, observedTerminalTasks, onNotice]);

  const readiness = useMemo(
    () => ({
      research: isReady(research),
      treatment: isReady(treatment),
      script: isReady(script),
      visualBible: isReady(visualBible),
      scenes: scenes.length > 0,
      narration: Boolean(episode?.narration_asset_path),
      video: Boolean(episode?.video_asset_path),
    }),
    [research, treatment, script, visualBible, scenes.length, episode?.narration_asset_path, episode?.video_asset_path],
  );

  const totalImageCostVnd = useMemo(() => bundleImages.reduce((sum, img) => sum + (img.price_vnd ?? 50), 0), [bundleImages]);

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

  const artifactValues: Record<ArtifactName, { value: string; set: (value: string) => void }> = {
    "research.md": { value: research, set: setResearch },
    "treatment.md": { value: treatment, set: setTreatment },
    "script.md": { value: script, set: setScript },
    "visual_bible.md": { value: visualBible, set: setVisualBible },
  };

  const prerequisites: Record<ArtifactName, boolean> = {
    "research.md": true,
    "treatment.md": readiness.research,
    "script.md": readiness.treatment,
    "visual_bible.md": readiness.script,
  };

  return {
    busy,
    copied,
    episodeClock,
    previewImage,
    setPreviewImage,
    promptModalScene,
    setPromptModalScene,
    globalPromptExpanded,
    setGlobalPromptExpanded,
    workflowTab,
    switchWorkflowTab,
    episodeTasks,
    currentShotBatch,
    completedShotSequences,
    activeEpisodeTask,
    pipelineTask,
    readiness,
    totalImageCostVnd,
    cancelling,
    artifactValues,
    prerequisites,
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
    // From useEpisodeSceneFiltering
    selectedSequenceId: sceneFiltering.selectedSequenceId,
    setSelectedSequenceId: sceneFiltering.setSelectedSequenceId,
    selectedStatusFilter: sceneFiltering.selectedStatusFilter,
    setSelectedStatusFilter: sceneFiltering.setSelectedStatusFilter,
    searchQuery: sceneFiltering.searchQuery,
    setSearchQuery: sceneFiltering.setSearchQuery,
    sequences: sceneFiltering.sequences,
    filterCounts: sceneFiltering.filterCounts,
    filteredScenes: sceneFiltering.filteredScenes,
    filteredTotalSeconds: sceneFiltering.filteredTotalSeconds,
    // From useEpisodeStyles
    questionCountDraft: styles.questionCountDraft,
    setQuestionCountDraft: styles.setQuestionCountDraft,
    durationDraft: styles.durationDraft,
    setDurationDraft: styles.setDurationDraft,
    saveQuestionCount: styles.saveQuestionCount,
    saveVisualStyle: styles.saveVisualStyle,
    saveThinkingBarStyle: styles.saveThinkingBarStyle,
    saveQuestionBoxStyle: styles.saveQuestionBoxStyle,
    saveAnswerCardStyle: styles.saveAnswerCardStyle,
    saveCounterStyle: styles.saveCounterStyle,
    saveBackgroundStyle: styles.saveBackgroundStyle,
    savePaletteId: styles.savePaletteId,
    applyStylePreset: styles.applyStylePreset,
    saveDuration: styles.saveDuration,
    // From useEpisodeRemix
    historyCheck: remix.historyCheck,
    isRemixing: remix.isRemixing,
    remixingQuestionId: remix.remixingQuestionId,
    remixAction: remix.remixAction,
    handleRemix: remix.handleRemix,
  };
}
