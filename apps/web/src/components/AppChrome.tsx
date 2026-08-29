import { useEffect, useRef, useState } from "react";
import {
  ArrowClockwise,
  Broadcast,
  CaretDown,
  Check,
  CheckCircle,
  CircleNotch,
  FileText,
  Gear,
  House,
  Image,
  ListChecks,
  MoonStars,
  Palette,
  Plus,
  Queue,
  Smiley,
  SpeakerHigh,
  Sparkle,
  Sun,
  TerminalWindow,
  VideoCamera,
  Wallet,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import type { Channel, CodexSettingsResponse, Task } from "@studio/shared";
import type { GitInfo, Notice, Page, Theme } from "./types";
import { formatTaskType } from "../lib/utils";
import { useTranslation } from "../i18n";
import { buildHash, getNavProps, openInNewTab } from "../hooks/useRouter";

export function SidebarQueueWidget({
  tasks = [],
  channels = [],
  onCancelTask,
  onOpenTasks,
  onOpenEpisode,
}: {
  tasks?: Task[];
  channels?: Channel[];
  onCancelTask?: (taskId: string) => void | Promise<void>;
  onOpenTasks?: () => void;
  onOpenEpisode?: (channelId: string, episodeId: string) => void;
}) {
  const { t } = useTranslation();
  const episodeTasks = tasks.filter((task) => Boolean(task.episode_id));
  const queuedTasks = episodeTasks.filter((task) => task.status === "QUEUED").reverse();
  const runningTasks = episodeTasks.filter((task) => task.status === "RUNNING");
  const channelMap = new Map(channels.map((c) => [c.channel_id, c.display_name]));

  const formatEpisodeLabel = (channelId: string, episodeId: string | null) => {
    const chName = channelMap.get(channelId) || t("channels.quizChannels");
    if (!episodeId) return chName;
    return `${chName} · EP ${episodeId.slice(-4).toUpperCase()}`;
  };

  return (
    <div className="sidebar-queue-widget" title={t("tasks.taskQueue")}>
      <div className="sidebar-queue-header" {...getNavProps("#/tasks", onOpenTasks)} style={{ cursor: "pointer" }}>
        <div className="sidebar-queue-title">
          <Queue size={14} weight="duotone" />
          <span>{t("sidebar.queue")}</span>
        </div>
        <div className="sidebar-queue-badges">
          {runningTasks.length > 0 ? (
            <span className="queue-badge running" title={t("sidebar.runningCount", { count: runningTasks.length })}>
              <CircleNotch size={10} className="spin" />
              <span>{runningTasks.length}</span>
            </span>
          ) : null}
          {queuedTasks.length > 0 ? (
            <span className="queue-badge queued" title={t("sidebar.queuedCount", { count: queuedTasks.length })}>
              {t("sidebar.queuedCount", { count: queuedTasks.length })}
            </span>
          ) : runningTasks.length === 0 ? (
            <span className="queue-badge empty">{t("sidebar.idle")}</span>
          ) : null}
        </div>
      </div>

      {queuedTasks.length > 0 ? (
        <div className="sidebar-queue-list">
          {queuedTasks.map((task, index) => {
            const itemHash =
              task.channel_id && task.episode_id
                ? buildHash({ page: "channels", channelId: task.channel_id, episodeId: task.episode_id })
                : "#/tasks";

            return (
              <a
                key={task.task_id}
                className="sidebar-queue-item"
                title={`${formatTaskType(task.task_type)} - ${task.progress_message || t("tasks.filterQueued")}`}
                {...getNavProps(itemHash, () => {
                  if (task.channel_id && task.episode_id && onOpenEpisode) {
                    onOpenEpisode(task.channel_id, task.episode_id);
                  } else if (onOpenTasks) {
                    onOpenTasks();
                  }
                })}
              >
                <div className="sidebar-queue-item-left">
                  <span className="sidebar-queue-pos">#{index + 1}</span>
                  <div className="sidebar-queue-info">
                    <strong className="sidebar-queue-name">{formatEpisodeLabel(task.channel_id, task.episode_id)}</strong>
                    <span className="sidebar-queue-type">{formatTaskType(task.task_type)}</span>
                  </div>
                </div>
                {onCancelTask ? (
                  <button
                    type="button"
                    className="sidebar-queue-cancel-btn"
                    title={t("sidebar.cancelQueuedTask")}
                    aria-label={t("sidebar.cancelQueuedTask")}
                    onClick={(e) => {
                      e.stopPropagation();
                      void onCancelTask(task.task_id);
                    }}
                  >
                    <X size={12} />
                  </button>
                ) : null}
              </a>
            );
          })}
        </div>
      ) : runningTasks.length > 0 ? (
        <div className="sidebar-queue-running-hint" {...getNavProps("#/tasks", onOpenTasks)} style={{ cursor: "pointer" }}>
          <span className="status-pulse-dot" />
          <span>{t("sidebar.runningAndQueued", { running: runningTasks.length, queued: 0 })}</span>
        </div>
      ) : (
        <div className="sidebar-queue-empty" {...getNavProps("#/tasks", onOpenTasks)} style={{ cursor: "pointer" }}>
          <span>{t("sidebar.queueEmpty")}</span>
        </div>
      )}
    </div>
  );
}

export function Sidebar({
  page,
  setPage,
  activeTaskCount,
  tasks = [],
  channels = [],
  onCancelTask,
  onOpenEpisode,
  balanceInfo,
  loadingBalance = false,
  balanceError = null,
  onRefreshBalance,
  onOpenSettings,
  onCreateChannel,
}: {
  page: Page;
  setPage: (page: Page) => void;
  activeTaskCount: number;
  tasks?: Task[];
  channels?: Channel[];
  onCancelTask?: (taskId: string) => void | Promise<void>;
  onOpenEpisode?: (channelId: string, episodeId: string) => void;
  balanceInfo?: { balance_vnd: number; rpm?: number } | null;
  loadingBalance?: boolean;
  balanceError?: string | null;
  onRefreshBalance?: () => void;
  onOpenSettings?: () => void;
  onCreateChannel?: () => void;
}) {
  const { t } = useTranslation();
  const items: Array<{ page: Page; label: string; icon: typeof House }> = [
    { page: "dashboard", label: t("sidebar.dashboard"), icon: House },
    { page: "channels", label: t("sidebar.channels"), icon: Broadcast },
    { page: "mascots", label: t("sidebar.mascotStudio"), icon: Smiley },
    { page: "sandbox", label: t("sidebar.sandbox"), icon: Palette },
    { page: "tasks", label: t("sidebar.tasks"), icon: ListChecks },
  ];
  return (
    <aside className="sidebar">
      <div className="brand-lockup">
        <div className="brand-mark" title={t("sidebar.brandName")}>
          <Sparkle size={18} weight="fill" />
        </div>
        <div>
          <span className="brand-name">{t("sidebar.brandName")}</span>
          <span className="brand-subtitle">{t("sidebar.brandSubtitle")}</span>
        </div>
      </div>
      {onCreateChannel ? (
        <button type="button" className="sidebar-create-btn" onClick={onCreateChannel} title={t("sidebar.newChannel")}>
          <Plus size={16} weight="bold" />
          <span>{t("sidebar.newChannel")}</span>
        </button>
      ) : null}
      <div className="sidebar-rule" />
      <nav className="primary-nav" aria-label="Primary navigation">
        {items.map(({ page: itemPage, label, icon: Icon }) => (
          <a
            key={itemPage}
            className={`nav-item ${page === itemPage ? "is-active" : ""}`}
            {...getNavProps(buildHash({ page: itemPage }), () => setPage(itemPage))}
          >
            <Icon size={18} weight={page === itemPage ? "fill" : "regular"} />
            <span>{label}</span>
            {itemPage === "tasks" && activeTaskCount > 0 ? <span className="nav-count">{activeTaskCount}</span> : null}
          </a>
        ))}
        <a
          className={`nav-item mobile-settings-nav ${page === "settings" ? "is-active" : ""}`}
          aria-label={t("sidebar.settings")}
          {...getNavProps("#/settings", () => setPage("settings"))}
        >
          <Gear size={18} />
          <span>{t("sidebar.settings")}</span>
        </a>
      </nav>
      <div className="sidebar-bottom">
        <SidebarQueueWidget
          tasks={tasks}
          channels={channels}
          onCancelTask={onCancelTask}
          onOpenTasks={() => setPage("tasks")}
          onOpenEpisode={onOpenEpisode}
        />

        <div
          className="sidebar-balance-widget"
          title="Image API Balance (Auto-refreshed every 30s)"
          style={{ cursor: !balanceInfo && onOpenSettings ? "pointer" : "default" }}
          {...getNavProps("#/settings?tab=media", () => {
            if (!balanceInfo && onOpenSettings) onOpenSettings();
          })}
        >
          <div className="sidebar-balance-header">
            <div className="sidebar-balance-title">
              <Wallet size={14} weight="duotone" />
              <span>{t("sidebar.apiBalance")}</span>
            </div>
            <button
              type="button"
              className="sidebar-balance-refresh-btn"
              title={t("sidebar.refreshBalance")}
              aria-label={t("sidebar.refreshBalance")}
              disabled={loadingBalance}
              onClick={(e) => {
                e.stopPropagation();
                onRefreshBalance?.();
              }}
            >
              <ArrowClockwise size={12} className={loadingBalance ? "spin" : ""} />
            </button>
          </div>
          <div className="sidebar-balance-amount">
            {balanceInfo !== null && balanceInfo !== undefined ? (
              <>
                <strong>{balanceInfo.balance_vnd.toLocaleString("en-US")}</strong>
                <span className="sidebar-balance-unit">VND</span>
              </>
            ) : balanceError ? (
              <span className="sidebar-balance-error" title={balanceError}>
                {t("sidebar.noApiKey")}
              </span>
            ) : (
              <span className="sidebar-balance-loading">{t("common.loading")}</span>
            )}
          </div>
          {balanceInfo?.rpm ? (
            <div className="sidebar-balance-rpm">
              <span>RPM: {balanceInfo.rpm}</span>
            </div>
          ) : null}
        </div>

        <a className={`nav-item ${page === "settings" ? "is-active" : ""}`} {...getNavProps("#/settings", () => setPage("settings"))}>
          <Gear size={18} weight={page === "settings" ? "fill" : "regular"} />
          <span>{t("sidebar.settings")}</span>
        </a>
        <div className="local-badge">
          <span className="status-dot" />
          <span>{t("sidebar.localWorkspace")}</span>
        </div>
      </div>
    </aside>
  );
}

export function Topbar({
  channel,
  channels = [],
  onSelectChannel,
  activeEngine,
  engineStatus,
  git,
  currentModel,
  models,
  loadingModels = false,
  modelsError = null,
  currentImageModel = "gpt-image-2",
  hasImageApiKey = false,
  theme,
  onEngineToggle,
  onThemeToggle,
  onModelChange,
  onImageModelChange,
  onOpenImageSettings,
  onReconnect,
  onShutdown,
}: {
  channel: Channel | null;
  channels?: Channel[];
  onSelectChannel?: (channelId: string) => void;
  activeEngine: "codex" | "antigravity";
  engineStatus: string;
  git: GitInfo;
  currentModel: string;
  models: Array<{ id: string; label: string }>;
  loadingModels?: boolean;
  modelsError?: string | null;
  currentImageModel?: string;
  hasImageApiKey?: boolean;
  theme: Theme;
  onEngineToggle: (engine: "codex" | "antigravity") => Promise<void> | void;
  onThemeToggle: () => void;
  onModelChange: (model: string) => Promise<void>;
  onImageModelChange: (model: string) => Promise<void>;
  onOpenImageSettings?: () => void;
  onReconnect: () => void;
  onShutdown: () => void;
}) {
  const { t } = useTranslation();
  const reconnectable = engineStatus === "disconnected" || engineStatus === "unavailable";
  const label =
    engineStatus === "connected"
      ? t("common.ready")
      : engineStatus === "connecting"
        ? t("common.connecting")
        : engineStatus === "disconnected"
          ? t("common.disconnected")
          : t("common.unavailable");
  const engineDefaultLabel = activeEngine === "antigravity" ? t("topbar.antigravityDefault") : t("topbar.codexDefault");

  return (
    <header className="topbar">
      <div className="context-trail">
        <span className="context-kicker">{t("topbar.workspace")}</span>
        {channels && channels.length > 0 ? (
          <div className="topbar-channel-selector">
            <select
              aria-label="Quick Switch Channel"
              value={channel?.channel_id ?? ""}
              onChange={(e) => {
                if (e.target.value) onSelectChannel?.(e.target.value);
              }}
            >
              <option value="" disabled={Boolean(channel)}>
                {channel ? channel.display_name : t("topbar.selectChannel")}
              </option>
              {channels.map((ch) => (
                <option key={ch.channel_id} value={ch.channel_id}>
                  {ch.engine === "quiz" ? "🎯 " : "🎬 "}
                  {ch.display_name}
                </option>
              ))}
            </select>
            <CaretDown size={12} className="selector-caret" />
          </div>
        ) : (
          <span className="context-title">{channel?.display_name ?? t("common.overview")}</span>
        )}
      </div>
      <div className="topbar-meta">
        <div className="engine-toggle-group" role="group" aria-label={t("topbar.engineSelection")}>
          <button
            type="button"
            className={`engine-toggle-btn ${activeEngine === "codex" ? "is-active" : ""}`}
            onClick={() => void onEngineToggle("codex")}
            title="OpenAI Codex JSON-RPC Engine"
          >
            <TerminalWindow size={14} weight={activeEngine === "codex" ? "bold" : "regular"} />
            <span>{t("topbar.codexEngine")}</span>
          </button>
          <button
            type="button"
            className={`engine-toggle-btn ${activeEngine === "antigravity" ? "is-active" : ""}`}
            onClick={() => void onEngineToggle("antigravity")}
            title="Google Antigravity Engine"
          >
            <Sparkle size={14} weight={activeEngine === "antigravity" ? "bold" : "regular"} />
            <span>{t("topbar.antigravityEngine")}</span>
          </button>
        </div>

        {!hasImageApiKey ? (
          <button
            type="button"
            className="topbar-key-missing-btn"
            onClick={onOpenImageSettings}
            title="gpti2.store API Key is not configured. Click to open Settings."
          >
            <WarningCircle size={14} weight="fill" className="key-warning-icon" />
            <span>{t("topbar.missingImageKey")}</span>
          </button>
        ) : (
          <label className="model-select image-model-select" title="Image Generation Model (gpti2.store)">
            <Image size={13} style={{ marginRight: 2 }} />
            <span>{t("topbar.imageModel")}</span>
            <CaretDown size={13} />
            <select
              aria-label="Image generation model"
              value={currentImageModel || "gpt-image-2"}
              onChange={(event) => void onImageModelChange(event.target.value)}
            >
              <option value="gpt-image-2">gpt-image-2 (50 VND)</option>
              <option value="nano-banana-2">nano-banana-2 (100 VND - 2K)</option>
            </select>
          </label>
        )}

        <label className="model-select">
          <span>{t("topbar.model")}</span>
          <CaretDown size={13} />
          {loadingModels ? (
            <select aria-label={activeEngine === "antigravity" ? "Antigravity model" : "Codex model"} disabled>
              <option>{t("topbar.loadingModels")}</option>
            </select>
          ) : (
            <select
              aria-label={activeEngine === "antigravity" ? "Antigravity model" : "Codex model"}
              value={currentModel}
              onChange={(event) => void onModelChange(event.target.value)}
            >
              <option value="">{engineDefaultLabel}</option>
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.label}
                </option>
              ))}
            </select>
          )}
        </label>

        {modelsError ? (
          <span className="model-error-tooltip" title={modelsError}>
            <WarningCircle size={15} />
          </span>
        ) : null}

        <span className={`codex-pill ${engineStatus === "connected" ? "is-connected" : ""}`}>
          <span className="status-dot" />
          {label}
        </span>
        {reconnectable ? (
          <button className="link-button" onClick={onReconnect}>
            {t("topbar.reconnectBtn")}
          </button>
        ) : null}
        <button
          className="icon-button theme-toggle"
          title={theme === "dark" ? t("topbar.themeToggleLight") : t("topbar.themeToggleDark")}
          aria-label={theme === "dark" ? t("topbar.themeToggleLight") : t("topbar.themeToggleDark")}
          onClick={onThemeToggle}
        >
          {theme === "dark" ? <Sun size={16} /> : <MoonStars size={16} />}
        </button>
      </div>
    </header>
  );
}

export function PageTitle({ eyebrow, title, copy, action }: { eyebrow: string; title: string; copy?: string; action?: React.ReactNode }) {
  return (
    <div className="page-title">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {copy ? <p className="page-copy">{copy}</p> : null}
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  );
}
export function StatusLine({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="status-line">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
export function StatusBadge({ status }: { status: string }) {
  return <span className={`status-badge ${status.toLowerCase()}`}>{status.toLowerCase()}</span>;
}

export type ProductionStageCategory = "research" | "script" | "visual" | "timeline" | "assembly" | "final";

export type StageMetadata = {
  label: string;
  category: ProductionStageCategory;
  isReady: boolean;
};

export function getStageMetadata(stage: string): StageMetadata {
  switch (stage.toUpperCase()) {
    case "IDEA":
    case "SELECTED":
      return { label: "Idea Selected", category: "research", isReady: false };
    case "RESEARCH":
      return { label: "Researching", category: "research", isReady: false };
    case "RESEARCH_READY":
      return { label: "Research Ready", category: "research", isReady: true };
    case "TREATMENT":
      return { label: "Drafting Story", category: "research", isReady: false };
    case "TREATMENT_READY":
      return { label: "Treatment Ready", category: "research", isReady: true };
    case "SCRIPT":
      return { label: "Writing Script", category: "script", isReady: false };
    case "SCRIPT_READY":
      return { label: "Script Ready", category: "script", isReady: true };
    case "VISUAL_BIBLE":
      return { label: "Styling Visuals", category: "visual", isReady: false };
    case "VISUAL_BIBLE_READY":
      return { label: "Visual Ready", category: "visual", isReady: true };
    case "SCENE_BREAKDOWN":
      return { label: "Breaking Shots", category: "timeline", isReady: false };
    case "SCENE_READY":
      return { label: "Shots Ready", category: "timeline", isReady: true };
    case "NARRATION_READY":
      return { label: "Audio Ready", category: "assembly", isReady: true };
    case "READY_FOR_GENERATION":
      return { label: "Ready to Render", category: "assembly", isReady: true };
    case "VIDEO_RENDERING":
      return { label: "Rendering Video", category: "assembly", isReady: false };
    case "VIDEO_READY":
      return { label: "Video Ready", category: "final", isReady: true };
    default:
      return { label: stage.replaceAll("_", " ").toLowerCase(), category: "research", isReady: false };
  }
}

export function StageBadge({ stage, size = "md" }: { stage: string; size?: "sm" | "md" }) {
  const meta = getStageMetadata(stage);
  return (
    <span className={`stage-badge stage-cat-${meta.category} stage-size-${size} ${meta.isReady ? "is-ready" : "is-progress"}`}>
      <span className="stage-dot" />
      <span>{meta.label}</span>
    </span>
  );
}

export function EpisodeAssetPills({
  episode,
  tasks = [],
  compact = false,
}: {
  episode: {
    script_path?: string | null;
    visual_bible_path?: string | null;
    narration_asset_path?: string | null;
    narration_duration_seconds?: number | null;
    video_asset_path?: string | null;
    stage?: string;
  };
  tasks?: Array<{ task_type: string; status: string }>;
  compact?: boolean;
}) {
  const isTaskActiveLocal = (t: { status: string }) => t.status === "QUEUED" || t.status === "RUNNING";

  // Script status
  const scriptActive = tasks.some((t) => t.task_type === "GENERATE_SCRIPT" && isTaskActiveLocal(t));
  const scriptReady = Boolean(episode.script_path);

  // Visual status
  const visualActive = tasks.some((t) => t.task_type === "GENERATE_VISUAL_BIBLE" && isTaskActiveLocal(t));
  const visualReady = Boolean(episode.visual_bible_path);

  // Narration status
  const audioActive = tasks.some((t) => (t.task_type === "GENERATE_NARRATION" || t.task_type === "GENERATE_AUDIO") && isTaskActiveLocal(t));
  const audioReady = Boolean(episode.narration_asset_path);
  const audioSec = episode.narration_duration_seconds ? `${Math.round(episode.narration_duration_seconds)}s` : null;

  // Video status
  const videoActive = tasks.some((t) => t.task_type === "GENERATE_VIDEO" && isTaskActiveLocal(t));
  const videoReady = Boolean(episode.video_asset_path || episode.stage === "VIDEO_READY");

  return (
    <div className={`episode-asset-pills ${compact ? "is-compact" : ""}`} aria-label="Media asset status">
      {/* Script */}
      <span
        className={`asset-pill ${scriptReady ? "is-ready" : scriptActive ? "is-running" : "is-empty"}`}
        title={scriptReady ? "Narration Script: Ready" : scriptActive ? "Narration Script: Generating…" : "Narration Script: Not created"}
      >
        {scriptActive ? <CircleNotch size={11} className="spin" /> : <FileText size={11} />}
        <span>Script</span>
        {scriptReady ? <Check size={10} weight="bold" /> : null}
      </span>

      {/* Visual */}
      <span
        className={`asset-pill ${visualReady ? "is-ready" : visualActive ? "is-running" : "is-empty"}`}
        title={visualReady ? "Visual Identity: Ready" : visualActive ? "Visual Identity: Generating…" : "Visual Identity: Not created"}
      >
        {visualActive ? <CircleNotch size={11} className="spin" /> : <Image size={11} />}
        <span>Visual</span>
        {visualReady ? <Check size={10} weight="bold" /> : null}
      </span>

      {/* Audio */}
      <span
        className={`asset-pill ${audioReady ? "is-ready" : audioActive ? "is-running" : "is-empty"}`}
        title={
          audioReady
            ? `Narration Audio: Ready (${audioSec ?? "Complete"})`
            : audioActive
              ? "Narration Audio: Synthesizing…"
              : "Narration Audio: Not generated"
        }
      >
        {audioActive ? <CircleNotch size={11} className="spin" /> : <SpeakerHigh size={11} />}
        <span>Audio</span>
        {audioReady ? <Check size={10} weight="bold" /> : null}
      </span>

      {/* Video */}
      <span
        className={`asset-pill ${videoReady ? "is-final-ready" : videoActive ? "is-running" : "is-empty"}`}
        title={videoReady ? "Master Video: Rendered & Ready" : videoActive ? "Master Video: Rendering…" : "Master Video: Not rendered"}
      >
        {videoActive ? <CircleNotch size={11} className="spin" /> : <VideoCamera size={11} />}
        <span>Video</span>
        {videoReady ? <Check size={10} weight="bold" /> : null}
      </span>
    </div>
  );
}
export function NoticeBanner({ notice, onClose }: { notice: NonNullable<Notice>; onClose: () => void }) {
  const duration = notice.duration ?? 4200;
  const [isPaused, setIsPaused] = useState(false);
  const remainingRef = useRef(duration);
  const startTimeRef = useRef(Date.now());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    setIsPaused(false);
    remainingRef.current = duration;
    startTimeRef.current = Date.now();

    timerRef.current = setTimeout(() => {
      onCloseRef.current();
    }, duration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [notice.message, notice.tone, notice.title, duration]);

  const handleMouseEnter = () => {
    setIsPaused(true);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      const elapsed = Date.now() - startTimeRef.current;
      remainingRef.current = Math.max(0, remainingRef.current - elapsed);
    }
  };

  const handleMouseLeave = () => {
    setIsPaused(false);
    startTimeRef.current = Date.now();
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onCloseRef.current();
    }, remainingRef.current);
  };

  const handleAnimationEnd = () => {
    if (!isPaused) {
      onCloseRef.current();
    }
  };

  const title = notice.title ?? (notice.tone === "bad" ? "Error" : undefined);

  return (
    <div
      className={`notice-banner ${notice.tone} ${isPaused ? "is-paused" : ""}`}
      role={notice.tone === "bad" ? "alert" : "status"}
      aria-live={notice.tone === "bad" ? "assertive" : "polite"}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="notice-icon-badge">
        {notice.tone === "good" ? (
          <CheckCircle size={18} weight="fill" />
        ) : notice.tone === "bad" ? (
          <WarningCircle size={18} weight="fill" />
        ) : (
          <Sparkle size={18} weight="fill" />
        )}
      </div>
      <div className="notice-content">
        {title ? <span className="notice-title">{title}</span> : null}
        <span className="notice-message">{notice.message}</span>
      </div>
      <button className="notice-close-btn" aria-label="Close notification" onClick={onClose}>
        <X size={14} weight="bold" />
      </button>
      <div className="notice-progress">
        <div
          key={`${notice.tone}-${notice.message}`}
          className="notice-progress-fill"
          style={{
            animationDuration: `${duration}ms`,
            animationPlayState: isPaused ? "paused" : "running",
          }}
          onAnimationEnd={handleAnimationEnd}
        />
      </div>
    </div>
  );
}
