import { useCallback, useEffect, useMemo, useState } from "react";
import {
  QUIZ_MAX_QUESTION_COUNT,
  QUIZ_MIN_QUESTION_COUNT,
  type Channel,
  type QuestionHistoryCheckResult,
  type QuizImageStyle,
  type Scene,
  type Task,
} from "@studio/shared";
import { api } from "../../../api";
import { formatTaskType, isTaskActive, isTaskTerminal, latestTask } from "../../../lib/utils";
import type { useEpisode } from "../../../hooks/useEpisode";
import type { Notice } from "../../../components/types";
import {
  artifactConfig,
  isReady,
  taskLabel,
  type ArtifactName,
  type PreviewImageData,
} from "../types";

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
  const [questionCountDraft, setQuestionCountDraft] = useState(8);
  const [durationDraft, setDurationDraft] = useState(8);
  const [previewImage, setPreviewImage] = useState<PreviewImageData | null>(null);
  const [promptModalScene, setPromptModalScene] = useState<Scene | null>(null);
  const [selectedSequenceId, setSelectedSequenceId] = useState<string>("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [globalPromptExpanded, setGlobalPromptExpanded] = useState<boolean | null>(false);
  const [historyCheck, setHistoryCheck] = useState<QuestionHistoryCheckResult | null>(null);
  const [isRemixing, setIsRemixing] = useState(false);
  const [remixingQuestionId, setRemixingQuestionId] = useState<string | null>(null);
  const [remixAction, setRemixAction] = useState<{ questionId: string; mode: "rephrase" | "replace" } | null>(null);

  const isQuiz = channel.engine === "quiz" || channel.group_id === "quiz";
  const initialWorkflowTab =
    activeTab === "script" || activeTab === "visual" || activeTab === "timeline" || activeTab === "remix"
      ? activeTab
      : simplifyMode && isQuiz
      ? "remix"
      : "timeline";
  const [workflowTab, setWorkflowTab] = useState<"script" | "visual" | "timeline" | "remix">(initialWorkflowTab);

  const loadHistoryCheck = useCallback(async () => {
    try {
      const res = await api.quizHistoryCheck(channel.channel_id, episodeId);
      setHistoryCheck(res.history_check);
    } catch {
      // Ignore non-fatal check error
    }
  }, [channel.channel_id, episodeId]);

  useEffect(() => {
    void loadHistoryCheck();
  }, [loadHistoryCheck, quizV2?.quiz, scenes.length]);

  useEffect(() => {
    if (simplifyMode && workflowTab !== "remix") {
      setWorkflowTab("remix");
    }
  }, [simplifyMode]);

  const handleRemix = async (questionIds?: string[], mode: "rephrase" | "replace" = "rephrase") => {
    try {
      setIsRemixing(true);
      if (questionIds && questionIds.length === 1) {
        setRemixingQuestionId(questionIds[0]);
        setRemixAction({ questionId: questionIds[0], mode });
      } else {
        setRemixingQuestionId(null);
        setRemixAction(null);
      }
      const res = await api.remixQuizQuestions(channel.channel_id, episodeId, questionIds, mode);
      setHistoryCheck(res.history_check);
      await load();
      const modeText = mode === "replace" ? "replaced with new questions" : "rephrased";
      onNotice({ tone: "good", message: `Successfully ${modeText} ${res.remixed_count} questions and re-checked history!` });
    } catch (error) {
      onNotice({ tone: "bad", message: error instanceof Error ? error.message : "Question remix failed" });
    } finally {
      setIsRemixing(false);
      setRemixingQuestionId(null);
      setRemixAction(null);
    }
  };

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
  const latestShotBatchStartedAt = sequenceShotTasks.map((task) => task.created_at).sort().at(-1) ?? null;
  const currentShotBatch = latestShotBatchStartedAt
    ? sequenceShotTasks.filter((task) => Math.abs(Date.parse(task.created_at) - Date.parse(latestShotBatchStartedAt)) < 5_000)
    : [];
  const completedShotSequences = currentShotBatch.filter((task) => task.status === "COMPLETED").length;
  const activeEpisodeTask = episodeTasks.find(isTaskActive) ?? null;
  const pipelineTask = latestTask(episodeTasks, ["GENERATE_PIPELINE"]);
  const [observedTerminalTasks, setObservedTerminalTasks] = useState(() => new Set<string>());

  const sequences = useMemo(() => {
    const map = new Map<string, { id: string; title: string; count: number }>();
    for (const s of scenes) {
      const existing = map.get(s.sequence_id);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(s.sequence_id, { id: s.sequence_id, title: s.sequence_title || s.sequence_id, count: 1 });
      }
    }
    return Array.from(map.values());
  }, [scenes]);

  const filterCounts = useMemo(() => {
    let missingAudio = 0;
    let audioMismatch = 0;
    let hasOverlay = 0;
    let multiCut = 0;
    for (const s of scenes) {
      if (!s.audio_asset_path) missingAudio += 1;
      if (
        s.audio_duration_seconds !== null &&
        s.audio_duration_seconds !== undefined &&
        Math.abs(s.audio_duration_seconds - s.duration_seconds) > Math.max(1, s.duration_seconds * 0.15)
      ) {
        audioMismatch += 1;
      }
      if (s.editorial_overlay && s.editorial_overlay.kind !== "none") hasOverlay += 1;
      if (s.visual_prompt.trim() && s.visual_prompt.split(/^\s*(?:CUT|HARD CUT)\s*$/m).length > 1) multiCut += 1;
    }
    return { missingAudio, audioMismatch, hasOverlay, multiCut };
  }, [scenes]);

  const filteredScenes = useMemo(() => {
    return scenes.filter((scene) => {
      if (selectedSequenceId !== "all" && scene.sequence_id !== selectedSequenceId) return false;
      if (selectedStatusFilter === "missing_audio" && scene.audio_asset_path) return false;
      if (selectedStatusFilter === "audio_mismatch") {
        const isMismatch =
          scene.audio_duration_seconds !== null &&
          scene.audio_duration_seconds !== undefined &&
          Math.abs(scene.audio_duration_seconds - scene.duration_seconds) > Math.max(1, scene.duration_seconds * 0.15);
        if (!isMismatch) return false;
      }
      if (selectedStatusFilter === "has_overlay" && (!scene.editorial_overlay || scene.editorial_overlay.kind === "none")) return false;
      if (selectedStatusFilter === "multi_cut") {
        const cuts = scene.visual_prompt.trim() ? scene.visual_prompt.split(/^\s*(?:CUT|HARD CUT)\s*$/m).length : 0;
        if (cuts <= 1) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNumber = String(scene.scene_number).includes(q);
        const matchDialogue = scene.dialogue.toLowerCase().includes(q);
        const matchPrompt = scene.visual_prompt.toLowerCase().includes(q);
        const matchSeq = scene.sequence_title.toLowerCase().includes(q);
        const matchOverlay = scene.editorial_overlay?.text?.toLowerCase().includes(q);
        if (!matchNumber && !matchDialogue && !matchPrompt && !matchSeq && !matchOverlay) return false;
      }
      return true;
    });
  }, [scenes, selectedSequenceId, selectedStatusFilter, searchQuery]);

  const filteredTotalSeconds = useMemo(() => {
    return filteredScenes.reduce((sum, s) => sum + s.duration_seconds, 0);
  }, [filteredScenes]);

  useEffect(() => {
    if (episode) {
      setQuestionCountDraft(episode.quiz_config?.question_count ?? 8);
      setDurationDraft(episode.target_duration_minutes);
    }
  }, [episode?.episode_id, episode?.quiz_config?.question_count, episode?.target_duration_minutes]);

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
    [research, treatment, script, visualBible, scenes.length, episode?.narration_asset_path, episode?.video_asset_path]
  );

  const totalImageCostVnd = useMemo(
    () => bundleImages.reduce((sum, img) => sum + (img.price_vnd ?? 50), 0),
    [bundleImages]
  );

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

  const [cancelling, setCancelling] = useState(false);

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

  const saveQuestionCount = async () => {
    if (!episode || questionCountDraft === (episode.quiz_config?.question_count ?? 8)) return;
    if (
      !Number.isInteger(questionCountDraft) ||
      questionCountDraft < QUIZ_MIN_QUESTION_COUNT ||
      questionCountDraft > QUIZ_MAX_QUESTION_COUNT
    ) {
      onNotice({
        tone: "bad",
        message: `Questions must be between ${QUIZ_MIN_QUESTION_COUNT} and ${QUIZ_MAX_QUESTION_COUNT}`,
      });
      setQuestionCountDraft(episode.quiz_config?.question_count ?? 8);
      return;
    }
    setBusy("question-count");
    try {
      await api.updateEpisode(channel.channel_id, episodeId, { question_count: questionCountDraft });
      await load();
      onNotice({ tone: "good", message: "Question count updated" });
    } catch (error) {
      onNotice({ tone: "bad", message: error instanceof Error ? error.message : "Could not update question count" });
    } finally {
      setBusy(null);
    }
  };

  const saveVisualStyle = async (newStyle: QuizImageStyle | "mixed") => {
    if (!episode || newStyle === (episode.quiz_config?.visual_style ?? "mixed")) return;
    setBusy("visual-style");
    try {
      await api.updateEpisode(channel.channel_id, episodeId, { visual_style: newStyle });
      await load();
      onNotice({ tone: "good", message: `Visual style set to ${newStyle === "mixed" ? "Mixed" : newStyle}` });
    } catch (error) {
      onNotice({ tone: "bad", message: error instanceof Error ? error.message : "Could not update visual style" });
    } finally {
      setBusy(null);
    }
  };

  const saveDuration = async () => {
    if (!episode || durationDraft === episode.target_duration_minutes) return;
    setBusy("duration");
    try {
      await api.updateEpisode(channel.channel_id, episodeId, { target_duration_minutes: durationDraft });
      await load();
      onNotice({ tone: "good", message: "Duration target updated" });
    } catch (error) {
      onNotice({ tone: "bad", message: error instanceof Error ? error.message : "Could not update duration" });
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
    questionCountDraft,
    setQuestionCountDraft,
    durationDraft,
    setDurationDraft,
    previewImage,
    setPreviewImage,
    promptModalScene,
    setPromptModalScene,
    selectedSequenceId,
    setSelectedSequenceId,
    selectedStatusFilter,
    setSelectedStatusFilter,
    searchQuery,
    setSearchQuery,
    globalPromptExpanded,
    setGlobalPromptExpanded,
    historyCheck,
    isRemixing,
    remixingQuestionId,
    remixAction,
    handleRemix,
    workflowTab,
    switchWorkflowTab,
    episodeTasks,
    currentShotBatch,
    completedShotSequences,
    activeEpisodeTask,
    pipelineTask,
    sequences,
    filterCounts,
    filteredScenes,
    filteredTotalSeconds,
    readiness,
    totalImageCostVnd,
    cancelling,
    artifactValues,
    prerequisites,
    createTask,
    handleCancelActiveTask,
    saveArtifact,
    saveQuestionCount,
    saveVisualStyle,
    saveDuration,
    saveScenes,
    mergeNext,
    openVideoFolder,
    copy,
    copyAllVisualPrompts,
    generateBundleImage,
    generateAllBundleImages,
  };
}
