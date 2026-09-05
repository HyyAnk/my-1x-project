import { lazy, Suspense } from "react";
import type {
  AppConfig,
  Channel,
  CodexSettingsResponse,
  AntigravitySettingsResponse,
  StorageInfo,
  Task,
  UsageLedger,
} from "@studio/shared";
import { LoadingState } from "./EmptyState";
import type { GitInfo, Notice, Page } from "./types";
import type { ImageBalanceInfo, VoiceMetricsInfo } from "../hooks/useGlobalMetrics";

const DashboardView = lazy(() => import("./dashboard/DashboardView").then((module) => ({ default: module.DashboardView })));
const ChannelsView = lazy(() => import("./ChannelView").then((module) => ({ default: module.ChannelsView })));
const MascotStudioView = lazy(() => import("./MascotStudio").then((module) => ({ default: module.MascotStudioView })));
const VisualSandboxTab = lazy(() =>
  import("../features/sandbox/VisualSandboxTab").then((module) => ({ default: module.VisualSandboxTab })),
);
const TasksView = lazy(() => import("../features/tasks/TasksView").then((module) => ({ default: module.TasksView })));
const SettingsView = lazy(() => import("./SettingsPanel").then((module) => ({ default: module.SettingsView })));
const QuestionBankView = lazy(() =>
  import("../features/questionBank/QuestionBankView").then((module) => ({ default: module.QuestionBankView })),
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
  usageLedger?: UsageLedger | null;
  storage: StorageInfo | null;
  git: GitInfo;
  currentEngineStatus: string;
  tab: string | null;
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
  requestCreateChannel: () => void;
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

export function AppViewRouter(props: AppViewRouterProps) {
  if (props.loading) {
    return <LoadingState />;
  }

  const renderActiveView = () => {
    switch (props.page) {
      case "dashboard":
        return (
          <DashboardView
            channels={props.channels}
            tasks={props.tasks}
            activeTasks={props.activeTasks}
            now={props.taskClock}
            appConfig={props.appConfig}
            activeEngine={props.activeEngine}
            currentModel={props.currentModel}
            currentImageModel={props.currentImageModel}
            imageBalance={props.imageBalance}
            voiceMetrics={props.voiceMetrics}
            usageLedger={props.usageLedger}
            storage={props.storage}
            git={props.git}
            engineStatus={props.currentEngineStatus}
            openTaskList={() => props.openPage("tasks")}
            onNavigate={(nextPage, params) => {
              props.openPage(nextPage);
              if (params) {
                Object.entries(params).forEach(([k, v]) => props.setQueryParam(k, v));
              }
            }}
          />
        );
      case "channels":
        return (
          <ChannelsView
            selectedChannel={props.selectedChannel}
            selectedEpisodeId={props.selectedEpisodeId}
            channels={props.channels}
            tasks={props.tasks}
            activeTab={props.tab}
            onTabChange={(nextTab) => props.setQueryParam("tab", nextTab)}
            onNavigateHome={() => props.openPage("dashboard")}
            onTaskSubmitted={props.upsertTask}
            openChannel={props.openChannel}
            onCreate={props.requestCreateChannel}
            onRefresh={props.refresh}
            onNotice={props.setNotice}
            onDelete={props.requestDeleteChannel}
            openEpisode={props.openEpisode}
            maxDuration={props.appConfig?.video_generation.max_scene_duration_seconds ?? 8}
            narrationWordsPerSecond={props.appConfig?.video_generation.narration_words_per_second ?? 2.3}
            imageGenerationEnabled={props.appConfig?.image_generation?.enabled ?? true}
            imagesPerBundle={props.appConfig?.image_generation?.images_per_bundle ?? 1}
            simplifyMode={props.simplifyMode}
          />
        );
      case "mascots":
        return (
          <MascotStudioView
            channels={props.channels}
            onNotice={props.setNotice}
            onRefreshChannels={async () => {
              await props.refreshChannels();
            }}
          />
        );
      case "question_bank":
        return (
          <QuestionBankView
            channels={props.channels}
            selectedChannel={props.selectedChannel}
            onQuickBuildVideo={(channelId, episodeId) => {
              props.openEpisode(channelId, episodeId);
            }}
          />
        );
      case "sandbox":
        return (
          <VisualSandboxTab
            channels={props.channels}
            onNotice={props.setNotice}
            onRefreshChannels={async () => {
              await props.refreshChannels();
            }}
          />
        );
      case "tasks":
        return (
          <TasksView
            tasks={props.tasks}
            channels={props.channels}
            now={props.taskClock}
            onRefresh={props.refresh}
            onNotice={props.setNotice}
            onOpenEpisode={props.openEpisode}
          />
        );
      case "settings":
        return (
          <SettingsView
            channels={props.channels}
            appConfig={props.appConfig}
            codex={props.codex}
            codexStatus={props.codexStatus}
            antigravity={props.antigravity}
            antigravityStatus={props.antigravityStatus}
            git={props.git}
            storage={props.storage}
            activeTab={props.tab}
            onTabChange={(nextTab) => props.setQueryParam("tab", nextTab)}
            onStorageSaved={props.applyStorage}
            onCodexSaved={props.setCodex}
            onAntigravitySaved={props.setAntigravity}
            onAudioSaved={(audio) => props.setAppConfig((current) => (current ? { ...current, audio_generation: audio } : current))}
            onVideoSaved={(video) => props.setAppConfig((current) => (current ? { ...current, video_generation: video } : current))}
            onImageSaved={(image) => {
              props.setAppConfig((current) => (current ? { ...current, image_generation: image } : current));
              void props.fetchBalance();
            }}
            onChannelUpdated={(channel) =>
              props.setChannels((current) => current.map((item) => (item.channel_id === channel.channel_id ? channel : item)))
            }
            onNotice={props.setNotice}
            simplifyMode={props.simplifyMode}
            onSimplifyChange={props.handleSimplifyToggle}
          />
        );
      default:
        return null;
    }
  };

  return <Suspense fallback={<LoadingState />}>{renderActiveView()}</Suspense>;
}
