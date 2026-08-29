import { useCallback, useEffect, useState } from "react";
import type { AppConfig, Channel, CodexSettingsResponse, AntigravitySettingsResponse, StorageInfo, Task } from "@studio/shared";
import { api } from "../api";
import { useChannels } from "./useChannels";
import { useTasks } from "./useTasks";
import { useRouter } from "./useRouter";
import { useGlobalMetrics } from "./useGlobalMetrics";
import type { ChannelGroupId } from "../components/ChannelList";
import type { GitInfo, Notice, Theme } from "../components/types";
import { formatTaskType } from "../lib/utils";

export function useAppOrchestration() {
  const router = useRouter();
  const {
    page,
    channelId: selectedChannelId,
    episodeId: selectedEpisodeId,
    tab,
    group,
    openPage,
    openChannel,
    openEpisode,
    setQueryParam,
  } = router;

  const [git, setGit] = useState<GitInfo>({ branch: null, dirty: false, changed_files: 0 });
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const [activeEngine, setActiveEngine] = useState<"codex" | "antigravity">("codex");
  const [currentModel, setCurrentModel] = useState<string>("");
  const [currentImageModel, setCurrentImageModel] = useState<string>("gpt-image-2");
  const [models, setModels] = useState<Array<{ id: string; label: string }>>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [codex, setCodex] = useState<CodexSettingsResponse | null>(null);
  const [antigravity, setAntigravity] = useState<AntigravitySettingsResponse | null>(null);
  const [antigravityStatus, setAntigravityStatus] = useState("ready");
  const [storage, setStorage] = useState<StorageInfo | null>(null);
  const [showCreate, setShowCreate] = useState<ChannelGroupId | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Channel | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [loading, setLoading] = useState(true);
  const [stopped, setStopped] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => (window.localStorage.getItem("studio-theme") === "light" ? "light" : "dark"));
  const [simplifyMode, setSimplifyMode] = useState<boolean>(() => {
    const saved = window.localStorage.getItem("studio-simplify-mode");
    if (saved === null) return true;
    return saved !== "false";
  });

  const { imageBalance, voiceMetrics, loadingBalance, balanceError, fetchBalance, setVoiceMetrics } = useGlobalMetrics();
  const { channels, setChannels, refresh: refreshChannels } = useChannels();

  const handleSimplifyToggle = (enabled: boolean) => {
    setSimplifyMode(enabled);
    window.localStorage.setItem("studio-simplify-mode", String(enabled));
  };

  const handleTerminalTask = useCallback((task: Task) => {
    if (task.status === "COMPLETED") setNotice({ tone: "good", message: `${formatTaskType(task.task_type)} completed` });
    else if (task.status === "FAILED") setNotice({ tone: "bad", message: task.error || `${formatTaskType(task.task_type)} failed` });
  }, []);

  const handlePrunedTasks = useCallback(
    (episodeIds: string[]) => {
      void refreshChannels();
      if (selectedEpisodeId && episodeIds.includes(selectedEpisodeId)) {
        setNotice({ tone: "good", message: "Expired failed build and assets removed" });
        openPage("dashboard");
      }
    },
    [openPage, refreshChannels, selectedEpisodeId],
  );

  const taskStore = useTasks(handleTerminalTask, handlePrunedTasks);
  const { tasks, activeTasks, now: taskClock, codexStatus, realtimeStatus, upsertTask, setCodexStatus, refresh: refreshTasks } = taskStore;

  const loadModelsForEngine = useCallback(async (engine: "codex" | "antigravity") => {
    setLoadingModels(true);
    setModelsError(null);
    try {
      if (engine === "antigravity") {
        const res = await api.antigravityModels();
        setModels(res.models);
      } else {
        const res = await api.codexModels();
        setModels(res.models);
      }
    } catch (error) {
      setModelsError(error instanceof Error ? error.message : "Failed to load models");
    } finally {
      setLoadingModels(false);
    }
  }, []);

  const refreshPeripheralState = useCallback(async () => {
    const [gitResult, codexResult, agyResult, engineResult, voiceMetricsResult] = await Promise.allSettled([
      api.git(),
      api.codexSettings(),
      api.antigravitySettings(),
      api.engine(),
      api.voiceRenderedMetrics(),
    ]);
    if (gitResult.status === "fulfilled") setGit(gitResult.value);
    if (codexResult.status === "fulfilled") setCodex(codexResult.value);
    if (agyResult.status === "fulfilled") setAntigravity(agyResult.value);
    if (voiceMetricsResult.status === "fulfilled") setVoiceMetrics(voiceMetricsResult.value);
    if (engineResult.status === "fulfilled") {
      const eng = engineResult.value;
      setActiveEngine(eng.active_engine);
      setCurrentModel(eng.model ?? "");
      setAntigravityStatus(eng.antigravity?.status ?? "ready");
      if (eng.active_engine === "antigravity") {
        setModels(eng.antigravity?.models ?? []);
      } else {
        setModels(eng.codex?.models ?? []);
      }
    }
  }, [setVoiceMetrics]);

  const refresh = useCallback(async () => {
    void refreshPeripheralState();
    const [configResponse, storageResponse] = await Promise.all([api.config(), api.storage()]);
    await Promise.all([refreshChannels(), refreshTasks()]);
    setAppConfig(configResponse);
    if (configResponse.image_generation?.model) {
      setCurrentImageModel(configResponse.image_generation.model);
    }
    setStorage(storageResponse);
    setLoading(false);
  }, [refreshChannels, refreshPeripheralState, refreshTasks]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("studio-theme", theme);
  }, [theme]);

  useEffect(() => {
    void refresh().catch((error: Error) => {
      setNotice({ tone: "bad", message: error.message });
      setLoading(false);
    });
  }, [refresh]);

  const selectedChannel = channels.find((channel) => channel.channel_id === selectedChannelId) ?? null;
  const handleCloseNotice = useCallback(() => setNotice(null), []);
  const showError = (error: unknown) =>
    setNotice({ tone: "bad", message: error instanceof Error ? error.message : "Something went wrong" });
  const showGood = (message: string) => setNotice({ tone: "good", message });
  const requestDeleteChannel = (channel: Channel) => setDeleteTarget(channel);
  const requestCreateChannel = (groupId: ChannelGroupId = "quiz") => setShowCreate(groupId);

  const handleChannelDeleted = async (channel: Channel) => {
    setDeleteTarget(null);
    setChannels((current) => current.filter((item) => item.channel_id !== channel.channel_id));
    if (selectedChannelId === channel.channel_id) {
      openPage("channels");
    }
    await refresh();
    showGood(`Channel deleted: ${channel.display_name}`);
  };

  const applyStorage = async (nextStorage: StorageInfo) => {
    setStorage(nextStorage);
    await refresh();
  };

  const saveCodex = async (input: Parameters<typeof api.saveCodexSettings>[0]) => {
    const next = await api.saveCodexSettings(input);
    setCodex(next);
    if (input.transport && input.transport !== codex?.settings.transport) setCodexStatus("disconnected");
    return next;
  };

  const handleEngineToggle = async (targetEngine: "codex" | "antigravity") => {
    if (targetEngine === activeEngine) return;
    try {
      const res = await api.setEngine(targetEngine);
      setActiveEngine(res.active_engine);
      setCurrentModel(res.model);
      showGood(`Switched engine to ${targetEngine === "antigravity" ? "Google Antigravity" : "OpenAI Codex"}`);
      await loadModelsForEngine(targetEngine);
    } catch (error) {
      showError(error);
    }
  };

  const handleModelChange = async (model: string) => {
    try {
      if (activeEngine === "antigravity") {
        const next = await api.saveAntigravitySettings({ model });
        setAntigravity(next);
        setCurrentModel(model);
      } else {
        const next = await saveCodex({ model });
        setCodex(next);
        setCurrentModel(model);
      }
      showGood(model ? `Model: ${model}` : `Using ${activeEngine === "antigravity" ? "Antigravity" : "Codex"} default model`);
    } catch (error) {
      showError(error);
    }
  };

  const handleImageModelChange = async (model: string) => {
    try {
      const next = await api.saveImageSettings({ model });
      setCurrentImageModel(model);
      setAppConfig((current) => (current ? { ...current, image_generation: next.image_generation } : current));
      showGood(`Image Model: ${model}`);
    } catch (error) {
      showError(error);
    }
  };

  const stopDashboard = async () => {
    if (!window.confirm("Stop the dashboard and its local services? Your channel files will remain untouched.")) return;
    try {
      await api.shutdown();
      setStopped(true);
    } catch (error) {
      showError(error);
    }
  };

  const currentEngineStatus = activeEngine === "antigravity" ? antigravityStatus : codexStatus;
  const activeEpisodeTasks = activeTasks.filter((t) => Boolean(t.episode_id));

  return {
    router,
    page,
    selectedChannelId,
    selectedEpisodeId,
    tab,
    group,
    openPage,
    openChannel,
    openEpisode,
    setQueryParam,
    git,
    appConfig,
    activeEngine,
    currentModel,
    currentImageModel,
    models,
    loadingModels,
    modelsError,
    codex,
    antigravity,
    antigravityStatus,
    currentEngineStatus,
    storage,
    showCreate,
    setShowCreate,
    deleteTarget,
    setDeleteTarget,
    notice,
    setNotice,
    loading,
    stopped,
    theme,
    setTheme,
    simplifyMode,
    handleSimplifyToggle,
    imageBalance,
    voiceMetrics,
    loadingBalance,
    balanceError,
    fetchBalance,
    channels,
    setChannels,
    refreshChannels,
    tasks,
    activeTasks,
    activeEpisodeTasks,
    taskClock,
    codexStatus,
    realtimeStatus,
    upsertTask,
    setCodexStatus,
    refreshTasks,
    loadModelsForEngine,
    refresh,
    selectedChannel,
    handleCloseNotice,
    showError,
    showGood,
    requestDeleteChannel,
    requestCreateChannel,
    handleChannelDeleted,
    applyStorage,
    setCodex,
    setAntigravity,
    setAppConfig,
    handleEngineToggle,
    handleModelChange,
    handleImageModelChange,
    stopDashboard,
  };
}
