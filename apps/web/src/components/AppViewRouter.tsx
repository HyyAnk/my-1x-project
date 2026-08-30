import { lazy, Suspense } from "react";
import type { AppConfig, Channel, CodexSettingsResponse, AntigravitySettingsResponse, StorageInfo, Task } from "@studio/shared";
import { DashboardView, type ChannelGroupId } from "./ChannelList";
import { ChannelsView } from "./ChannelView";
import { SettingsView } from "./SettingsPanel";
import { MascotStudioView } from "./MascotStudio";
import { TasksView } from "./TaskPanel";
import { LoadingState } from "./EmptyState";
import type { GitInfo, Notice, Page } from "./types";
import type { ImageBalanceInfo, VoiceMetricsInfo } from "../hooks/useGlobalMetrics";

const VisualSandboxTab = lazy(() =>
  import("../features/sandbox/VisualSandboxTab").then((module) => ({ default: module.VisualSandboxTab })),
);

export interface AppViewRouterProps {
  loading: boolean;
  page: Page;
  channels: Channel[];
  selectedChannel: Channel | null;
  selectedEpisodeId: string | null;
  tasks: Task[];
  activeTasks: Task[];
  taskClock: number;
  appConfig: AppConfig | null;
  activeEngine: "codex" | "antigravity";
  currentModel: string;
  currentImageModel: string;
  imageBalance: ImageBalanceInfo | null;
  voiceMetrics: VoiceMetricsInfo | null;
  storage: StorageInfo | null;
  git: GitInfo;
  currentEngineStatus: string;
  tab: string | null;
  group: string | null;
  simplifyMode: boolean;
  codex: CodexSettingsResponse | null;
  codexStatus: string;
  antigravity: AntigravitySettingsResponse | null;
  antigravityStatus: string;
  openPage: (page: Page) => void;
  openChannel: (channelId: string) => void;
  openEpisode: (channelId: string, episodeId: string, tab?: string) => void;
  setQueryParam: (key: string, value: string | null) => void;
  upsertTask: (task: Task) => void;
  requestCreateChannel: (groupId?: ChannelGroupId) => void;
  requestDeleteChannel: (channel: Channel) => void;
  refresh: () => Promise<void>;
  refreshChannels: () => Promise<unknown>;
  setNotice: (notice: Notice) => void;
  applyStorage: (storage: StorageInfo) => Promise<void>;
  setCodex: (codex: CodexSettingsResponse) => void;
  setAntigravity: (antigravity: AntigravitySettingsResponse) => void;
  setAppConfig: React.Dispatch<React.SetStateAction<AppConfig | null>>;
  setChannels: React.Dispatch<React.SetStateAction<Channel[]>>;
  fetchBalance: () => Promise<void>;
  handleSimplifyToggle: (enabled: boolean) => void;
}

export function AppViewRouter({
  loading,
  page,
  channels,
  selectedChannel,
  selectedEpisodeId,
  tasks,
  activeTasks,
  taskClock,
  appConfig,
  activeEngine,
  currentModel,
  currentImageModel,
  imageBalance,
  voiceMetrics,
  storage,
  git,
  currentEngineStatus,
  tab,
  group,
  simplifyMode,
  codex,
  codexStatus,
  antigravity,
  antigravityStatus,
  openPage,
  openChannel,
  openEpisode,
  setQueryParam,
  upsertTask,
  requestCreateChannel,
  requestDeleteChannel,
  refresh,
  refreshChannels,
  setNotice,
  applyStorage,
  setCodex,
  setAntigravity,
  setAppConfig,
  setChannels,
  fetchBalance,
  handleSimplifyToggle,
}: AppViewRouterProps) {
  if (loading) {
    return <LoadingState />;
  }

  if (page === "dashboard") {
    return (
      <DashboardView
        channels={channels}
        tasks={tasks}
        activeTasks={activeTasks}
        now={taskClock}
        appConfig={appConfig}
        activeEngine={activeEngine}
        currentModel={currentModel}
        currentImageModel={currentImageModel}
        imageBalance={imageBalance}
        voiceMetrics={voiceMetrics}
        storage={storage}
        git={git}
        engineStatus={currentEngineStatus}
        openTaskList={() => openPage("tasks")}
        onNavigate={(nextPage, params) => {
          openPage(nextPage);
          if (params) {
            Object.entries(params).forEach(([k, v]) => setQueryParam(k, v));
          }
        }}
      />
    );
  }

  if (page === "channels") {
    return (
      <ChannelsView
        selectedChannel={selectedChannel}
        selectedEpisodeId={selectedEpisodeId}
        channels={channels}
        tasks={tasks}
        activeTab={tab}
        activeGroupQuery={group}
        onTabChange={(nextTab) => setQueryParam("tab", nextTab)}
        onGroupChange={(nextGroup) => setQueryParam("group", nextGroup)}
        onNavigateHome={() => openPage("dashboard")}
        onTaskSubmitted={upsertTask}
        openChannel={openChannel}
        onCreate={requestCreateChannel}
        onRefresh={refresh}
        onNotice={setNotice}
        onDelete={requestDeleteChannel}
        openEpisode={openEpisode}
        maxDuration={appConfig?.video_generation.max_scene_duration_seconds ?? 8}
        narrationWordsPerSecond={appConfig?.video_generation.narration_words_per_second ?? 2.3}
        imageGenerationEnabled={appConfig?.image_generation?.enabled ?? true}
        imagesPerBundle={appConfig?.image_generation?.images_per_bundle ?? 1}
        simplifyMode={simplifyMode}
      />
    );
  }

  if (page === "mascots") {
    return (
      <MascotStudioView
        channels={channels}
        onNotice={setNotice}
        onRefreshChannels={async () => {
          await refreshChannels();
        }}
      />
    );
  }

  if (page === "sandbox") {
    return (
      <Suspense fallback={<LoadingState />}>
        <VisualSandboxTab
          channels={channels}
          onNotice={setNotice}
          onRefreshChannels={async () => {
            await refreshChannels();
          }}
        />
      </Suspense>
    );
  }

  if (page === "tasks") {
    return (
      <TasksView tasks={tasks} channels={channels} now={taskClock} onRefresh={refresh} onNotice={setNotice} onOpenEpisode={openEpisode} />
    );
  }

  if (page === "settings") {
    return (
      <SettingsView
        channels={channels}
        appConfig={appConfig}
        codex={codex}
        codexStatus={codexStatus}
        antigravity={antigravity}
        antigravityStatus={antigravityStatus}
        git={git}
        storage={storage}
        activeTab={tab}
        onTabChange={(nextTab) => setQueryParam("tab", nextTab)}
        onStorageSaved={applyStorage}
        onCodexSaved={setCodex}
        onAntigravitySaved={setAntigravity}
        onAudioSaved={(audio) => setAppConfig((current) => (current ? { ...current, audio_generation: audio } : current))}
        onVideoSaved={(video) => setAppConfig((current) => (current ? { ...current, video_generation: video } : current))}
        onImageSaved={(image) => {
          setAppConfig((current) => (current ? { ...current, image_generation: image } : current));
          void fetchBalance();
        }}
        onChannelUpdated={(channel) =>
          setChannels((current) => current.map((item) => (item.channel_id === channel.channel_id ? channel : item)))
        }
        onNotice={setNotice}
        simplifyMode={simplifyMode}
        onSimplifyChange={handleSimplifyToggle}
      />
    );
  }

  return null;
}
