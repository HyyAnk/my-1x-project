import type { AppConfig, Channel, StorageInfo, Task, UsageLedger } from "@studio/shared";
import type { GitInfo, Page } from "../types";
import { useTranslation } from "../../i18n";
import { Metric } from "./Metric";
import { CostSavingsSection } from "./CostSavingsSection";
import { OperationalDomainTable } from "./OperationalDomainTable";

export type DashboardViewProps = {
  channels: Channel[];
  tasks: Task[];
  activeTasks: Task[];
  now?: number;
  appConfig?: AppConfig | null;
  activeEngine?: "codex" | "antigravity";
  currentModel?: string;
  currentImageModel?: string;
  imageBalance?: { balance_vnd: number; rpm?: number } | null;
  voiceMetrics?: {
    rendered_characters: number;
    rendered_duration_seconds: number;
    rendered_segments_count: number;
    rendered_episodes_count: number;
  } | null;
  usageLedger?: UsageLedger | null;
  storage?: StorageInfo | null;
  git?: GitInfo;
  engineStatus?: string;
  openTaskList?: () => void;
  onNavigate?: (page: Page, params?: Record<string, string>) => void;
};

export function DashboardView({
  channels,
  tasks,
  activeTasks,
  now: _now,
  appConfig: _appConfig,
  activeEngine: _activeEngine = "codex",
  currentModel: _currentModel = "",
  currentImageModel: _currentImageModel = "gpt-image-2",
  imageBalance = null,
  voiceMetrics = null,
  usageLedger = null,
  storage: _storage = null,
  git: _git = { branch: null, dirty: false, changed_files: 0 },
  engineStatus: _engineStatus = "ready",
  openTaskList: _openTaskList,
  onNavigate,
}: DashboardViewProps) {
  const { t, language } = useTranslation();
  const numberLocale = language === "vi" ? "vi-VN" : "en-US";

  // Channel & Episode metrics
  const activeChannelsCount = channels.filter((c) => c.status === "ACTIVE").length;
  const draftChannelsCount = channels.filter((c) => c.status === "DRAFT").length;
  const totalEpisodes = channels.reduce((total, channel) => total + (channel.episode_count || 0), 0);

  // Pipeline & Task execution telemetry
  const runningCount = tasks.filter((task) => task.status === "RUNNING").length;
  const queuedCount = tasks.filter((task) => task.status === "QUEUED").length;
  const completedCount = tasks.filter((task) => task.status === "COMPLETED").length;
  const failedCount = tasks.filter((task) => task.status === "FAILED").length;
  const terminalCount = completedCount + failedCount;
  const successRate = terminalCount > 0 ? ((completedCount / terminalCount) * 100).toFixed(1) : "100";

  // Balance formatting
  const formattedBalance = imageBalance ? `${imageBalance.balance_vnd.toLocaleString(numberLocale)} ₫` : "N/A";
  const balanceRateNote = imageBalance?.rpm ? t("dashboard.kpiNoteRateLimit", { rpm: imageBalance.rpm }) : t("dashboard.kpiNoteImageQuota");

  return (
    <section className="page-wrap">
      <div className="hero-row">
        <div>
          <p className="eyebrow">{t("dashboard.eyebrow")}</p>
          <h1>
            {t("dashboard.title")} <em>{t("dashboard.titleEmphasis")}</em>
          </h1>
          <p className="hero-copy">{t("dashboard.subtitle")}</p>
        </div>
      </div>

      {/* Top Level Metric KPIs */}
      <div className="metric-grid">
        <Metric
          label={t("dashboard.kpiChannels")}
          value={channels.length}
          note={t("dashboard.kpiNoteChannels", { active: activeChannelsCount, draft: draftChannelsCount })}
          href="#/channels"
          onClick={() => onNavigate?.("channels")}
        />
        <Metric
          label={t("dashboard.kpiEpisodes")}
          value={totalEpisodes}
          note={t("dashboard.kpiNoteEpisodes", { count: channels.length })}
          href="#/channels"
          onClick={() => onNavigate?.("channels")}
        />
        <Metric
          label={t("dashboard.kpiSuccessRate")}
          value={`${successRate}%`}
          note={t("dashboard.kpiNoteSuccessRate", { completed: completedCount, failed: failedCount })}
          href="#/tasks"
          onClick={() => onNavigate?.("tasks")}
        />
        <Metric
          label={t("dashboard.kpiActiveTasks")}
          value={activeTasks.length}
          note={t("dashboard.kpiNoteActiveTasks", { running: runningCount, queued: queuedCount })}
          isRunning={runningCount > 0}
          badge={runningCount > 0 ? t("dashboard.running").toUpperCase() : undefined}
          valueColor={runningCount > 0 ? "var(--accent-deep)" : undefined}
          href="#/tasks"
          onClick={() => onNavigate?.("tasks")}
        />
        <Metric
          label={t("dashboard.kpiImageBalance")}
          value={formattedBalance}
          note={balanceRateNote}
          href="#/settings?tab=media"
          onClick={() => onNavigate?.("settings", { tab: "media" })}
        />
      </div>

      <div className="dashboard-grid" style={{ marginTop: "24px" }}>
        {/* Cost Savings & ROI Section */}
        <CostSavingsSection voiceMetrics={voiceMetrics} usageLedger={usageLedger} />

        {/* Pipeline Progress & Telemetry */}
        <div className="dashboard-section">
          <OperationalDomainTable tasks={tasks} />
        </div>
      </div>
    </section>
  );
}
