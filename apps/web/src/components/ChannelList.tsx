import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  Broadcast,
  CheckCircle,
  Copy,
  Cpu,
  CurrencyDollar,
  DotsThreeVertical,
  FilmSlate,
  Image as ImageIcon,
  Lightning,
  MagnifyingGlass,
  Plus,
  Smiley,
  SpeakerHigh,
  Trash,
  VideoCamera,
  Wallet,
  X,
} from "@phosphor-icons/react";
import {
  QUIZ_IMAGE_STYLE_LABELS,
  type AppConfig,
  type Channel,
  type MascotProfile,
  type StorageInfo,
  type Task,
} from "@studio/shared";
import type { GitInfo, Page } from "./types";
import { PageTitle } from "./AppChrome";
import { EmptyState } from "./EmptyState";
import { useTranslation } from "../i18n";
import { api } from "../api";

export type ChannelGroupId = "quiz";

function formatRelativeTime(dateString: string, t?: (key: string, params?: Record<string, string | number>) => string): string {
  try {
    const diffMs = Date.now() - new Date(dateString).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return t ? t("channels.updatedJustNow") : "Just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return t ? t("channels.updatedAgo", { time: `${diffMin}m` }) : `${diffMin}m ago`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return t ? t("channels.updatedAgo", { time: `${diffHour}h` }) : `${diffHour}h ago`;
    const diffDays = Math.floor(diffHour / 24);
    if (diffDays < 30) return t ? t("channels.updatedAgo", { time: `${diffDays}d` }) : `${diffDays}d ago`;
    const diffMonths = Math.floor(diffDays / 30);
    return t ? t("channels.updatedAgo", { time: `${diffMonths}mo` }) : `${diffMonths}mo ago`;
  } catch {
    return "";
  }
}

export function ChannelCard({
  channel,
  index,
  mascots = [],
  onOpen,
  onDelete,
}: {
  channel: Channel;
  index: number;
  mascots?: MascotProfile[];
  onOpen: () => void;
  onDelete: (channel: Channel) => void;
}) {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const assignedMascot = mascots.find((m) => m.id === channel.mascot_id);

  const handleCopyId = (e: React.MouseEvent) => {
    e.stopPropagation();
    void navigator.clipboard.writeText(channel.channel_id);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      setMenuOpen(false);
    }, 1200);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    onDelete(channel);
  };

  const langDisplay = channel.language || "English";
  const langTag = langDisplay.toLowerCase().includes("viet") ? "🇻🇳 VI" : langDisplay.toLowerCase().includes("eng") ? "🇺🇸 EN" : langDisplay;
  const timeAgo = formatRelativeTime(channel.updated_at, t);

  const activeStyles = channel.selected_styles && channel.selected_styles.length > 0 ? channel.selected_styles : [];
  const primaryStyleLabel = activeStyles[0] ? QUIZ_IMAGE_STYLE_LABELS[activeStyles[0]] : null;
  const extraStylesCount = activeStyles.length > 1 ? activeStyles.length - 1 : 0;

  return (
    <article
      className="channel-card"
      style={{ animationDelay: `${Math.min(index * 35, 300)}ms` }}
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      aria-label={`${channel.display_name} (${channel.status.toLowerCase()})`}
    >
      <div className="channel-card-header">
        <div className="channel-card-chips">
          <span className={`channel-status-pill ${channel.status.toLowerCase()}`}>
            <span className="channel-status-dot" />
            {channel.status === "ACTIVE"
              ? t("channels.activeStatus")
              : channel.status === "DRAFT"
              ? t("channels.draftStatus")
              : t("channels.archivedStatus")}
          </span>

          <span className="channel-chip lang" title={`Language: ${langDisplay}`}>
            {langTag}
          </span>

          {channel.target_audience ? (
            <span className="channel-chip audience" title={`Audience: ${channel.target_audience}`}>
              🎯 {channel.target_audience}
            </span>
          ) : null}
        </div>

        <div className="channel-card-menu-wrap" ref={menuRef} onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className={`channel-card-menu-btn ${menuOpen ? "is-active" : ""}`}
            title={t("channels.moreActions")}
            aria-label={t("channels.moreActions")}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            <DotsThreeVertical size={18} weight="bold" />
          </button>

          {menuOpen ? (
            <div className="channel-menu-dropdown" role="menu">
              <button
                type="button"
                className="channel-menu-item"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onOpen();
                }}
              >
                <ArrowUpRight size={15} />
                <span>{t("channels.openChannel")}</span>
              </button>

              <button
                type="button"
                className="channel-menu-item"
                role="menuitem"
                onClick={handleCopyId}
              >
                <Copy size={15} />
                <span>{copied ? t("channels.idCopied") : t("channels.copyId")}</span>
              </button>

              <div className="channel-menu-divider" />

              <button
                type="button"
                className="channel-menu-item danger"
                role="menuitem"
                onClick={handleDelete}
              >
                <Trash size={15} />
                <span>{t("common.delete")}</span>
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="channel-card-body">
        <h3 className="channel-card-title">{channel.display_name}</h3>
        {channel.description ? (
          <p className="channel-card-desc">{channel.description}</p>
        ) : (
          <p className="channel-card-desc" style={{ opacity: 0.6, fontStyle: "italic" }}>
            {channel.target_audience ? `Target: ${channel.target_audience}` : "Quiz Channel"}
          </p>
        )}
      </div>

      <div className="channel-card-meta">
        {channel.mascot_id ? (
          <span
            className="channel-mascot-pill"
            title={assignedMascot?.description || assignedMascot?.name || "Mascot"}
          >
            {assignedMascot?.master_image_url ? (
              <img
                src={assignedMascot.master_image_url}
                alt={assignedMascot.name}
                className="channel-mascot-avatar"
              />
            ) : (
              <span className="channel-mascot-avatar-fallback">
                <Smiley size={12} weight="fill" />
              </span>
            )}
            <span>{assignedMascot?.name || "Mascot"}</span>
          </span>
        ) : null}

        {primaryStyleLabel ? (
          <span className="channel-styles-pill" title={`Visual Styles: ${activeStyles.map((s) => QUIZ_IMAGE_STYLE_LABELS[s]).join(", ")}`}>
            <span className="style-dot" />
            <span>
              {primaryStyleLabel}
              {extraStylesCount > 0 ? ` +${extraStylesCount}` : ""}
            </span>
          </span>
        ) : null}
      </div>

      <div className="channel-card-footer">
        <div className="channel-footer-stats">
          <span className="stat-item">
            <FilmSlate size={14} />
            <span>
              {channel.episode_count || 0} {channel.episode_count === 1 ? "video" : "videos"}
            </span>
          </span>
          {timeAgo ? (
            <>
              <span style={{ opacity: 0.4 }}>•</span>
              <span className="stat-item" style={{ opacity: 0.85 }}>
                {timeAgo}
              </span>
            </>
          ) : null}
        </div>
        <span className="channel-card-arrow">
          <ArrowUpRight size={16} weight="bold" />
        </span>
      </div>
    </article>
  );
}

function Metric({
  label,
  value,
  note,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  note: string;
  icon?: typeof Broadcast;
}) {
  return (
    <div className="metric">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span className="metric-label">{label}</span>
        {Icon ? <Icon size={18} style={{ color: "var(--accent-deep)", opacity: 0.85 }} /> : null}
      </div>
      <strong>{value}</strong>
      <span className="metric-note">{note}</span>
    </div>
  );
}

function CostSavingsSection({
  voiceMetrics,
}: {
  voiceMetrics?: {
    rendered_characters: number;
    rendered_duration_seconds: number;
    rendered_segments_count: number;
    rendered_episodes_count: number;
  } | null;
}) {
  const { t } = useTranslation();
  const elevenLabsRatePer1k = 0.10; // $0.10 per 1,000 characters
  const usdToVnd = 25500;

  const renderedChars = voiceMetrics?.rendered_characters || 0;
  const renderedSeconds = voiceMetrics?.rendered_duration_seconds || 0;

  const savedUsd = (renderedChars / 1000) * elevenLabsRatePer1k;
  const savedVnd = savedUsd * usdToVnd;

  return (
    <div className="dashboard-section">
      <div className="dashboard-section-header">
        <div className="dashboard-section-title">
          <CurrencyDollar size={18} weight="duotone" style={{ color: "var(--green)" }} />
          <h2>{t("dashboard.voiceSavingsTitle")}</h2>
        </div>
      </div>

      <div className="savings-card">
        <div className="savings-metrics-row">
          <div className="savings-submetric">
            <span className="submetric-label">{t("dashboard.estimatedSavings")}</span>
            <strong className="submetric-val" style={{ color: "var(--green)" }}>
              ${savedUsd.toFixed(2)} USD{" "}
              <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 500 }}>
                ({Math.round(savedVnd).toLocaleString("vi-VN")} ₫)
              </span>
            </strong>
          </div>
          <div className="savings-submetric">
            <span className="submetric-label">{t("dashboard.renderedCharacters")}</span>
            <strong className="submetric-val">
              {renderedChars.toLocaleString("vi-VN")} chars
            </strong>
          </div>
          <div className="savings-submetric">
            <span className="submetric-label">{t("dashboard.audioProduced")}</span>
            <strong className="submetric-val">
              {renderedSeconds > 0 ? `${(renderedSeconds / 60).toFixed(1)} mins` : "0 mins"}
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
}

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
  storage: _storage = null,
  git: _git = { branch: null, dirty: false, changed_files: 0 },
  engineStatus: _engineStatus = "ready",
  openTaskList: _openTaskList,
  onNavigate: _onNavigate,
}: {
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
  storage?: StorageInfo | null;
  git?: GitInfo;
  engineStatus?: string;
  openTaskList?: () => void;
  onNavigate?: (page: Page, params?: Record<string, string>) => void;
}) {
  const { t } = useTranslation();

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
  const formattedBalance = imageBalance
    ? `${imageBalance.balance_vnd.toLocaleString("vi-VN")} ₫`
    : "N/A";
  const balanceRateNote = imageBalance?.rpm
    ? t("dashboard.kpiNoteRateLimit", { rpm: imageBalance.rpm })
    : t("dashboard.kpiNoteImageQuota");

  // Category breakdown
  const categoryStats = [
    {
      domainKey: "domainVisualArt",
      domain: t("dashboard.domainVisualArt"),
      filter: (t: Task) => t.task_type === "GENERATE_BUNDLE_IMAGE",
      icon: ImageIcon,
    },
    {
      domainKey: "domainVoiceTTS",
      domain: t("dashboard.domainVoiceTTS"),
      filter: (t: Task) => t.task_type === "GENERATE_AUDIO" || t.task_type === "GENERATE_NARRATION",
      icon: SpeakerHigh,
    },
    {
      domainKey: "domainScriptIntelligence",
      domain: t("dashboard.domainScriptIntelligence"),
      filter: (t: Task) =>
        [
          "SUGGEST_TOPICS",
          "GENERATE_RESEARCH",
          "GENERATE_TREATMENT",
          "GENERATE_SCRIPT",
          "GENERATE_VISUAL_BIBLE",
          "GENERATE_SCENES",
          "GENERATE_SEQUENCE_SCENES",
          "GENERATE_PIPELINE",
          "GENERATE_DNA",
          "REGENERATE_DIALOGUE",
          "REGENERATE_PROMPT",
          "REGENERATE_BOTH",
        ].includes(t.task_type),
      icon: Cpu,
    },
    {
      domainKey: "domainVideoComposition",
      domain: t("dashboard.domainVideoComposition"),
      filter: (t: Task) => t.task_type === "GENERATE_VIDEO",
      icon: VideoCamera,
    },
  ].map((cat) => {
    const catTasks = tasks.filter(cat.filter);
    const catCompleted = catTasks.filter((t) => t.status === "COMPLETED").length;
    const catFailed = catTasks.filter((t) => t.status === "FAILED").length;
    const catRunning = catTasks.filter((t) => t.status === "RUNNING").length;
    const catTerminal = catCompleted + catFailed;
    const catRate = catTerminal > 0 ? ((catCompleted / catTerminal) * 100).toFixed(0) : "100";
    return {
      ...cat,
      total: catTasks.length,
      completed: catCompleted,
      failed: catFailed,
      running: catRunning,
      successRate: catRate,
    };
  });

  return (
    <section className="page-wrap">
      <div className="hero-row">
        <div>
          <p className="eyebrow">{t("dashboard.eyebrow")}</p>
          <h1>
            {t("dashboard.title")} <em>{t("dashboard.titleEmphasis")}</em>
          </h1>
          <p className="hero-copy">
            {t("dashboard.subtitle")}
          </p>
        </div>
      </div>

      {/* Top Level Metric KPIs */}
      <div className="metric-grid">
        <Metric
          label={t("dashboard.kpiChannels")}
          value={channels.length}
          note={t("dashboard.kpiNoteChannels", { active: activeChannelsCount, draft: draftChannelsCount })}
          icon={Broadcast}
        />
        <Metric
          label={t("dashboard.kpiEpisodes")}
          value={totalEpisodes}
          note={t("dashboard.kpiNoteEpisodes", { count: channels.length })}
          icon={FilmSlate}
        />
        <Metric
          label={t("dashboard.kpiSuccessRate")}
          value={`${successRate}%`}
          note={t("dashboard.kpiNoteSuccessRate", { completed: completedCount, failed: failedCount })}
          icon={CheckCircle}
        />
        <Metric
          label={t("dashboard.kpiActiveTasks")}
          value={activeTasks.length}
          note={t("dashboard.kpiNoteActiveTasks", { running: runningCount, queued: queuedCount })}
          icon={Lightning}
        />
        <Metric
          label={t("dashboard.kpiImageBalance")}
          value={formattedBalance}
          note={balanceRateNote}
          icon={Wallet}
        />
      </div>

      <div className="dashboard-grid" style={{ marginTop: "24px" }}>
        {/* Cost Savings & ROI Section */}
        <CostSavingsSection voiceMetrics={voiceMetrics} />

        {/* Pipeline Progress & Telemetry */}
        <div className="dashboard-section">
          {/* Operational Domain Breakdown Table */}
          <div className="dashboard-table-card">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>{t("dashboard.productionDomain")}</th>
                  <th>{t("dashboard.totalRuns")}</th>
                  <th>{t("dashboard.running")}</th>
                  <th>{t("dashboard.completed")}</th>
                  <th>{t("dashboard.failed")}</th>
                  <th>{t("dashboard.successRate")}</th>
                </tr>
              </thead>
              <tbody>
                {categoryStats.map((item) => {
                  const Icon = item.icon;
                  return (
                    <tr key={item.domainKey}>
                      <td>
                        <div className="table-domain-cell">
                          <Icon size={16} style={{ color: "var(--accent-deep)" }} />
                          <span>{item.domain}</span>
                        </div>
                      </td>
                      <td className="table-num-cell">{item.total}</td>
                      <td className="table-num-cell" style={{ color: item.running ? "var(--accent)" : "inherit" }}>
                        {item.running}
                      </td>
                      <td className="table-num-cell" style={{ color: "var(--green)" }}>
                        {item.completed}
                      </td>
                      <td className="table-num-cell" style={{ color: item.failed ? "var(--notice-error)" : "inherit" }}>
                        {item.failed}
                      </td>
                      <td>
                        <div className="progress-pill-wrap">
                          <div className="progress-mini-bar">
                            <div
                              className="progress-mini-fill"
                              style={{ width: `${item.successRate}%` }}
                            />
                          </div>
                          <span className="table-num-cell" style={{ fontSize: "11px" }}>
                            {item.successRate}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

export function ChannelsListView({
  channels,
  mascots: initialMascots,
  onCreate,
  openChannel,
  onDelete,
}: {
  channels: Channel[];
  mascots?: MascotProfile[];
  activeGroup?: ChannelGroupId;
  onActiveGroupChange?: (groupId: ChannelGroupId) => void;
  onCreate: (groupId?: ChannelGroupId) => void;
  openChannel: (id: string) => void;
  onDelete: (channel: Channel) => void;
}) {
  const { t } = useTranslation();
  const [mascots, setMascots] = useState<MascotProfile[]>(initialMascots || []);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "draft" | "archived">("all");
  const [sortBy, setSortBy] = useState<"latest" | "episodes" | "name">("latest");

  useEffect(() => {
    if (!initialMascots || initialMascots.length === 0) {
      void api.mascots().then((res) => setMascots(res.mascots)).catch(() => {});
    }
  }, [initialMascots]);

  const activeCount = channels.filter((c) => c.status === "ACTIVE").length;
  const draftCount = channels.filter((c) => c.status === "DRAFT").length;
  const archivedCount = channels.filter((c) => c.status === "ARCHIVED").length;

  const filteredChannels = useMemo(() => {
    return channels
      .filter((c) => {
        if (statusFilter !== "all" && c.status.toLowerCase() !== statusFilter) {
          return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchName = c.display_name.toLowerCase().includes(q);
          const matchDesc = c.description?.toLowerCase().includes(q);
          const matchAudience = c.target_audience?.toLowerCase().includes(q);
          const matchLang = c.language?.toLowerCase().includes(q);
          if (!matchName && !matchDesc && !matchAudience && !matchLang) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "episodes") {
          return (b.episode_count || 0) - (a.episode_count || 0);
        }
        if (sortBy === "name") {
          return a.display_name.localeCompare(b.display_name);
        }
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      });
  }, [channels, statusFilter, searchQuery, sortBy]);

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
  };

  return (
    <section className="page-wrap">
      <div className="hero-row" style={{ marginBottom: "20px" }}>
        <div>
          <p className="eyebrow">{t("channels.pageEyebrow")}</p>
          <h1>{t("channels.pageTitle")}</h1>
        </div>
        <button className="primary-button hero-action" onClick={() => onCreate("quiz")}>
          <Plus size={16} weight="bold" />
          <span>{t("channels.newQuizChannel")}</span>
        </button>
      </div>

      {/* Smart Toolbar */}
      <div className="channel-toolbar">
        <div className="channel-toolbar-left">
          <div className="channel-search-box">
            <MagnifyingGlass size={16} className="search-icon" />
            <input
              type="text"
              className="channel-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("channels.searchPlaceholder")}
              aria-label={t("channels.searchPlaceholder")}
            />
            {searchQuery ? (
              <button
                type="button"
                className="channel-search-clear"
                onClick={() => setSearchQuery("")}
                title="Clear search"
                aria-label="Clear search"
              >
                <X size={12} />
              </button>
            ) : null}
          </div>

          <div className="channel-filter-pills" role="radiogroup" aria-label="Filter channels by status">
            <button
              type="button"
              className={`channel-filter-btn ${statusFilter === "all" ? "is-active" : ""}`}
              onClick={() => setStatusFilter("all")}
            >
              <span>{t("channels.filterAll")}</span>
              <span className="channel-filter-count">{channels.length}</span>
            </button>
            <button
              type="button"
              className={`channel-filter-btn ${statusFilter === "active" ? "is-active" : ""}`}
              onClick={() => setStatusFilter("active")}
            >
              <span>{t("channels.filterActive")}</span>
              <span className="channel-filter-count">{activeCount}</span>
            </button>
            <button
              type="button"
              className={`channel-filter-btn ${statusFilter === "draft" ? "is-active" : ""}`}
              onClick={() => setStatusFilter("draft")}
            >
              <span>{t("channels.filterDraft")}</span>
              <span className="channel-filter-count">{draftCount}</span>
            </button>
            {archivedCount > 0 ? (
              <button
                type="button"
                className={`channel-filter-btn ${statusFilter === "archived" ? "is-active" : ""}`}
                onClick={() => setStatusFilter("archived")}
              >
                <span>{t("channels.filterArchived")}</span>
                <span className="channel-filter-count">{archivedCount}</span>
              </button>
            ) : null}
          </div>
        </div>

        <div className="channel-toolbar-right">
          <select
            className="channel-sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "latest" | "episodes" | "name")}
            aria-label={t("channels.sortBy")}
          >
            <option value="latest">{t("channels.sortLatest")}</option>
            <option value="episodes">{t("channels.sortEpisodes")}</option>
            <option value="name">{t("channels.sortName")}</option>
          </select>
        </div>
      </div>

      {/* Grid or Empty state */}
      {channels.length === 0 ? (
        <EmptyState
          icon={<Broadcast size={26} />}
          title={t("channels.noQuizChannelsTitle")}
          copy={t("channels.noQuizChannelsCopy")}
          action={t("channels.newQuizChannel")}
          onAction={() => onCreate("quiz")}
        />
      ) : filteredChannels.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 16px", background: "var(--surface)", borderRadius: "var(--radius-lg)", border: "1px dashed var(--line)" }}>
          <MagnifyingGlass size={36} style={{ color: "var(--muted)", margin: "0 auto 12px" }} />
          <h3 style={{ fontSize: "16px", fontWeight: 700, margin: "0 0 6px" }}>{t("channels.noResultsTitle")}</h3>
          <p style={{ fontSize: "13px", color: "var(--muted)", margin: "0 0 16px" }}>{t("channels.noResultsCopy")}</p>
          <button type="button" className="quiet-button" onClick={clearFilters} style={{ margin: "0 auto" }}>
            <X size={14} />
            <span>{t("channels.clearFilters")}</span>
          </button>
        </div>
      ) : (
        <div className="channel-grid">
          {filteredChannels.map((channel, index) => (
            <ChannelCard
              key={channel.channel_id}
              index={index + 1}
              channel={channel}
              mascots={mascots}
              onOpen={() => openChannel(channel.channel_id)}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </section>
  );
}

