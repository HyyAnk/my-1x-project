import { useCallback, useEffect, useState } from "react";
import type { AppConfig, Channel, StorageInfo, Task } from "@studio/shared";
import { api } from "../api";
import { useChannels } from "./useChannels";
import { useTasks } from "./useTasks";
import { useRouter } from "./useRouter";
import { useGlobalMetrics } from "./useGlobalMetrics";
import { useEngineState } from "./useEngineState";
import { useSystemUiState } from "./useSystemUiState";
import { formatTaskType } from "../lib/utils";

export function useAppOrchestration() {
  const router = useRouter();
  const { channelId: selectedChannelId, episodeId: selectedEpisodeId, openPage } = router;
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);

  const systemUi = useSystemUiState();
  const { showGood, showError, setNotice, setGit, setStorage, setLoading, setDeleteTarget } = systemUi;

  const { imageBalance, voiceMetrics, usageLedger, loadingBalance, balanceError, fetchBalance, setVoiceMetrics } = useGlobalMetrics();
  const { channels, setChannels, refresh: refreshChannels } = useChannels();

  const handleTerminalTask = useCallback(
    (task: Task) => {
      if (task.status === "COMPLETED") setNotice({ tone: "good", message: `${formatTaskType(task.task_type)} completed` });
      else if (task.status === "FAILED") setNotice({ tone: "bad", message: task.error || `${formatTaskType(task.task_type)} failed` });
    },
    [setNotice],
  );

  const handlePrunedTasks = useCallback(
    (episodeIds: string[]) => {
      void refreshChannels();
      if (selectedEpisodeId && episodeIds.includes(selectedEpisodeId)) {
        setNotice({ tone: "good", message: "Expired failed build and assets removed" });
        openPage("dashboard");
      }
    },
    [openPage, refreshChannels, selectedEpisodeId, setNotice],
  );

  const taskStore = useTasks(handleTerminalTask, handlePrunedTasks);
  const { tasks, activeTasks, now: taskClock, codexStatus, realtimeStatus, upsertTask, setCodexStatus, refresh: refreshTasks } = taskStore;

  const engineState = useEngineState(showGood, showError, setCodexStatus, setAppConfig);
  const {
    activeEngine,
    setActiveEngine,
    setCurrentModel,
    setCurrentImageModel,
    setModels,
    setCodex,
    setAntigravity,
    setAntigravityStatus,
    antigravityStatus,
  } = engineState;

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
      setModels(eng.active_engine === "antigravity" ? (eng.antigravity?.models ?? []) : (eng.codex?.models ?? []));
    }
  }, [setActiveEngine, setAntigravity, setAntigravityStatus, setCodex, setGit, setCurrentModel, setModels, setVoiceMetrics]);

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
  }, [refreshChannels, refreshPeripheralState, refreshTasks, setCurrentImageModel, setLoading, setStorage]);

  useEffect(() => {
    void refresh().catch((error: Error) => {
      setNotice({ tone: "bad", message: error.message });
      setLoading(false);
    });
  }, [refresh, setLoading, setNotice]);

  const selectedChannel = channels.find((channel) => channel.channel_id === selectedChannelId) ?? null;

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

  const currentEngineStatus = activeEngine === "antigravity" ? antigravityStatus : codexStatus;
  const activeEpisodeTasks = activeTasks.filter((t) => Boolean(t.episode_id));

  return {
    router,
    ...router,
    selectedChannelId,
    selectedEpisodeId,
    appConfig,
    setAppConfig,
    ...engineState,
    currentEngineStatus,
    ...systemUi,
    imageBalance,
    voiceMetrics,
    usageLedger,
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
    refresh,
    selectedChannel,
    handleChannelDeleted,
    applyStorage,
  };
}
