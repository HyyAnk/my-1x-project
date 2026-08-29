import { useState, useMemo, useEffect, useRef } from "react";
import { ArrowClockwise, CaretDown, FilmSlate, Funnel, ListChecks, MagnifyingGlass, Trash, X } from "@phosphor-icons/react";
import type { Channel, Task } from "@studio/shared";
import { api } from "../../api";
import { formatTaskStatus, formatTaskType, isTaskActive } from "../../lib/utils";
import { EmptyState } from "../../components/EmptyState";
import { PageTitle } from "../../components/AppChrome";
import type { Notice } from "../../components/types";
import { useTranslation } from "../../i18n";
import { calculateProgress, needsAttention, type ProductionItemSummary, type StatusFilter } from "./types";
import { TaskDetailDrawer } from "./components/TaskDetailDrawer";
import { StreamlinedTaskCard } from "./components/StreamlinedTaskCard";
import { getNavProps } from "../../hooks/useRouter";

export function TasksView({
  tasks,
  channels = [],
  now,
  onRefresh,
  onNotice,
  onOpenEpisode,
}: {
  tasks: Task[];
  channels?: Channel[];
  now: number;
  onRefresh: () => Promise<void>;
  onNotice: (notice: NonNullable<Notice>) => void;
  onOpenEpisode?: (channelId: string, episodeId: string) => void;
}) {
  const { t } = useTranslation();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [selectedInspectItem, setSelectedInspectItem] = useState<ProductionItemSummary | null>(null);
  const [dismissedTaskIds, setDismissedTaskIds] = useState<Set<string>>(new Set());
  const [episodeTitleMap, setEpisodeTitleMap] = useState<Map<string, string>>(new Map());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const [showAllDone, setShowAllDone] = useState(false);

  const actionsMenuRef = useRef<HTMLDivElement>(null);
  const channelMap = useMemo(() => new Map(channels.map((c) => [c.channel_id, c.display_name])), [channels]);

  // Close actions dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(e.target as Node)) {
        setActionsMenuOpen(false);
      }
    };
    if (actionsMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [actionsMenuOpen]);

  // Load episode titles for channels
  useEffect(() => {
    let isCancelled = false;
    const fetchEpisodeTitles = async () => {
      const titleMap = new Map<string, string>();
      await Promise.all(
        channels.map(async (channel) => {
          try {
            const res = await api.episodes(channel.channel_id);
            if (res.episodes) {
              res.episodes.forEach((ep) => {
                if (ep.topic?.title) {
                  titleMap.set(ep.episode_id, ep.topic.title);
                }
              });
            }
          } catch {
            // Ignore background title load errors
          }
        }),
      );
      if (!isCancelled) {
        setEpisodeTitleMap(titleMap);
      }
    };

    if (channels.length > 0) {
      void fetchEpisodeTitles();
    }
    return () => {
      isCancelled = true;
    };
  }, [channels]);

  // Group and structure all episode-level production items
  const productionItems = useMemo(() => {
    const epMap = new Map<string, Task[]>();

    for (const task of tasks) {
      if (dismissedTaskIds.has(task.task_id)) continue;
      if (task.episode_id) {
        const existing = epMap.get(task.episode_id) || [];
        existing.push(task);
        epMap.set(task.episode_id, existing);
      }
    }

    const list: ProductionItemSummary[] = [];

    // Episode-grouped items
    for (const [episodeId, epTasks] of epMap.entries()) {
      const sorted = [...epTasks].sort((a, b) => b.created_at.localeCompare(a.created_at));
      const activeTask = sorted.find(isTaskActive) ?? null;
      const latestTask = sorted[0];
      const status = activeTask ? activeTask.status : latestTask.status;
      const channelId = latestTask.channel_id;
      const channelName = channelMap.get(channelId) || "Channel";
      const episodeTitle = episodeTitleMap.get(episodeId) || `Episode · ${episodeId.slice(-6).toUpperCase()}`;
      const progressPercent = calculateProgress(activeTask, status);
      const progressMessage =
        activeTask?.progress_message || latestTask.progress_message || (status === "COMPLETED" ? "Video build completed" : "");

      list.push({
        id: `ep-${episodeId}`,
        channelId,
        channelName,
        episodeId,
        episodeTitle,
        tasks: sorted,
        activeTask,
        latestTask,
        status,
        progressPercent,
        progressMessage,
        queuePosition: activeTask?.queue_position ?? null,
        error: activeTask?.error || latestTask.error || null,
        startedAt: activeTask?.started_at || latestTask.started_at || latestTask.created_at,
        completedAt: latestTask.completed_at,
        accumulatedSeconds: latestTask.accumulated_duration_seconds || 0,
      });
    }

    // Sorting: RUNNING (0), QUEUED (1), WAITING_APPROVAL (2), FAILED (3), COMPLETED (4), CANCELLED (5)
    return list.sort((a, b) => {
      const rank = (s: Task["status"]) => {
        switch (s) {
          case "RUNNING":
            return 0;
          case "QUEUED":
            return 1;
          case "WAITING_APPROVAL":
            return 2;
          case "FAILED":
            return 3;
          case "COMPLETED":
            return 4;
          case "CANCELLED":
            return 5;
          default:
            return 6;
        }
      };
      const rankDiff = rank(a.status) - rank(b.status);
      if (rankDiff !== 0) return rankDiff;

      // Tie-break for QUEUED: sort by queuePosition ascending
      if (a.status === "QUEUED" && b.status === "QUEUED") {
        const posA = a.queuePosition ?? 9999;
        const posB = b.queuePosition ?? 9999;
        if (posA !== posB) return posA - posB;
      }

      // Tie-break for terminal states: most recently completed first
      if ((a.status === "COMPLETED" || a.status === "CANCELLED") && (b.status === "COMPLETED" || b.status === "CANCELLED")) {
        const timeA = a.completedAt || a.startedAt;
        const timeB = b.completedAt || b.startedAt;
        return timeB.localeCompare(timeA);
      }

      // Default tie-break: newest started/created first
      return b.startedAt.localeCompare(a.startedAt);
    });
  }, [tasks, dismissedTaskIds, channelMap, episodeTitleMap]);

  // Overall status count metrics for interactive KPI chips
  const totalCount = productionItems.length;
  const runningCount = productionItems.filter((i) => i.status === "RUNNING").length;
  const queuedCount = productionItems.filter((i) => i.status === "QUEUED").length;
  const waitingApprovalCount = productionItems.filter((i) => i.status === "WAITING_APPROVAL").length;
  const failedCount = productionItems.filter((i) => i.status === "FAILED").length;
  const completedCount = productionItems.filter((i) => i.status === "COMPLETED").length;
  const cancelledCount = productionItems.filter((i) => i.status === "CANCELLED").length;

  // Filtered list based on Status, Channel, and Search Query
  const filteredItems = useMemo(() => {
    return productionItems.filter((item) => {
      // Status filter
      if (statusFilter === "running" && item.status !== "RUNNING") return false;
      if (statusFilter === "queued" && item.status !== "QUEUED") return false;
      if (statusFilter === "waiting_approval" && item.status !== "WAITING_APPROVAL") return false;
      if (statusFilter === "failed" && item.status !== "FAILED") return false;
      if (statusFilter === "completed" && item.status !== "COMPLETED") return false;
      if (statusFilter === "cancelled" && item.status !== "CANCELLED") return false;

      // Channel filter
      if (channelFilter !== "all" && item.channelId !== channelFilter) return false;

      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchTitle = item.episodeTitle.toLowerCase().includes(query);
        const matchChannel = item.channelName.toLowerCase().includes(query);
        const matchType = formatTaskType(item.latestTask.task_type).toLowerCase().includes(query);
        const matchEpId = item.episodeId.toLowerCase().includes(query);
        if (!matchTitle && !matchChannel && !matchType && !matchEpId) {
          return false;
        }
      }

      return true;
    });
  }, [productionItems, statusFilter, channelFilter, searchQuery]);

  // Grouped priority subsets for default "all" view
  // Failed episodes only need attention within a 10-hour window
  const attentionItems = useMemo(() => filteredItems.filter((item) => needsAttention(item, now)), [filteredItems, now]);
  const inProgressItems = useMemo(() => filteredItems.filter((i) => i.status === "RUNNING" || i.status === "QUEUED"), [filteredItems]);
  const doneItems = useMemo(() => filteredItems.filter((i) => i.status === "COMPLETED" || i.status === "CANCELLED"), [filteredItems]);

  // Actions
  const cancel = async (task: Task) => {
    try {
      await api.cancelTask(task.task_id);
      onNotice({ tone: "good", message: "Task cancelled" });
      await onRefresh();
    } catch (error) {
      onNotice({ tone: "bad", message: error instanceof Error ? error.message : "Failed to cancel task" });
    }
  };

  const retry = async (task: Task) => {
    try {
      await api.createTask({
        task_type: task.task_type,
        channel_id: task.channel_id,
        episode_id: task.episode_id,
        scene_number: task.scene_number,
      });
      onNotice({ tone: "good", message: `${formatTaskType(task.task_type)} added to queue` });
      await onRefresh();
    } catch (error) {
      onNotice({ tone: "bad", message: error instanceof Error ? error.message : "Failed to retry task" });
    }
  };

  const clearCompleted = () => {
    const completedIds = new Set<string>();
    productionItems
      .filter((i) => i.status === "COMPLETED" || i.status === "CANCELLED")
      .forEach((item) => {
        item.tasks.forEach((t) => completedIds.add(t.task_id));
      });

    setDismissedTaskIds((prev) => {
      const next = new Set(prev);
      completedIds.forEach((id) => next.add(id));
      return next;
    });
    onNotice({ tone: "good", message: "Cleared finished tasks from view" });
  };

  const cancelAllQueued = async () => {
    const queuedTasks = productionItems
      .filter((i) => i.status === "QUEUED")
      .map((i) => i.activeTask || i.latestTask)
      .filter((t): t is Task => Boolean(t && t.status === "QUEUED"));
    if (queuedTasks.length === 0) return;

    try {
      await Promise.all(queuedTasks.map((t) => api.cancelTask(t.task_id)));
      onNotice({ tone: "good", message: `Cancelled ${queuedTasks.length} queued tasks` });
      await onRefresh();
    } catch (err) {
      onNotice({ tone: "bad", message: err instanceof Error ? err.message : "Failed to cancel queue" });
    }
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  const selectedChannelObj = channels.find((c) => c.channel_id === channelFilter);

  return (
    <section className="page-wrap task-manager-page">
      {/* Row 1: Header with Refresh Action */}
      <PageTitle
        eyebrow={t("tasks.eyebrow")}
        title={t("tasks.pageTitle")}
        action={
          <button
            type="button"
            className="quiet-button"
            onClick={() => void handleManualRefresh()}
            disabled={isRefreshing}
            aria-label={t("tasks.refreshTasks")}
          >
            <ArrowClockwise size={15} className={isRefreshing ? "spin" : ""} />
            <span>{t("tasks.refreshTasks")}</span>
          </button>
        }
      />

      {/* Row 2: Consolidated Toolbar */}
      <div className="task-toolbar-unified">
        {/* Left: Status Filter Chips */}
        <div className="task-kpi-bar" role="group" aria-label="Filter tasks by status">
          <a
            aria-pressed={statusFilter === "all"}
            className={`task-kpi-chip ${statusFilter === "all" ? "is-active" : ""}`}
            {...getNavProps("#/tasks?tab=all", () => setStatusFilter("all"))}
          >
            <span className="kpi-label">{t("tasks.filterAll")}</span>
            <span className="kpi-count">{totalCount}</span>
          </a>

          <a
            aria-pressed={statusFilter === "running"}
            className={`task-kpi-chip is-running ${statusFilter === "running" ? "is-active" : ""}`}
            {...getNavProps("#/tasks?tab=running", () => setStatusFilter("running"))}
          >
            {runningCount > 0 && <span className="live-dot-pulse" />}
            <span className="kpi-label">{t("tasks.filterRunning")}</span>
            <span className="kpi-count">{runningCount}</span>
          </a>

          <a
            aria-pressed={statusFilter === "queued"}
            className={`task-kpi-chip is-queued ${statusFilter === "queued" ? "is-active" : ""}`}
            {...getNavProps("#/tasks?tab=queued", () => setStatusFilter("queued"))}
          >
            <span className="kpi-label">{t("tasks.filterQueued")}</span>
            <span className="kpi-count">{queuedCount}</span>
          </a>

          {waitingApprovalCount > 0 && (
            <a
              aria-pressed={statusFilter === "waiting_approval"}
              className={`task-kpi-chip is-waiting_approval ${statusFilter === "waiting_approval" ? "is-active" : ""}`}
              {...getNavProps("#/tasks?tab=waiting_approval", () => setStatusFilter("waiting_approval"))}
            >
              <span className="kpi-label">{t("tasks.filterWaiting")}</span>
              <span className="kpi-count">{waitingApprovalCount}</span>
            </a>
          )}

          <a
            aria-pressed={statusFilter === "failed"}
            className={`task-kpi-chip is-failed ${statusFilter === "failed" ? "is-active" : ""}`}
            {...getNavProps("#/tasks?tab=failed", () => setStatusFilter("failed"))}
          >
            <span className="kpi-label">{t("tasks.filterFailed")}</span>
            <span className={`kpi-count ${failedCount > 0 ? "has-errors" : ""}`}>{failedCount}</span>
          </a>

          <a
            aria-pressed={statusFilter === "completed"}
            className={`task-kpi-chip is-completed ${statusFilter === "completed" ? "is-active" : ""}`}
            {...getNavProps("#/tasks?tab=completed", () => setStatusFilter("completed"))}
          >
            <span className="kpi-label">{t("tasks.filterCompleted")}</span>
            <span className="kpi-count">{completedCount}</span>
          </a>

          {cancelledCount > 0 && (
            <a
              aria-pressed={statusFilter === "cancelled"}
              className={`task-kpi-chip is-cancelled ${statusFilter === "cancelled" ? "is-active" : ""}`}
              {...getNavProps("#/tasks?tab=cancelled", () => setStatusFilter("cancelled"))}
            >
              <span className="kpi-label">{t("tasks.filterCancelled")}</span>
              <span className="kpi-count">{cancelledCount}</span>
            </a>
          )}
        </div>

        {/* Right: Search + Channel Selector + Actions Menu */}
        <div className="task-toolbar-controls">
          {/* Search Box */}
          <div className="task-search-box">
            <MagnifyingGlass size={14} className="search-icon" />
            <input
              type="search"
              placeholder={t("tasks.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label={t("tasks.searchPlaceholder")}
            />
            {searchQuery && (
              <button type="button" className="clear-search-btn" onClick={() => setSearchQuery("")} aria-label="Clear search">
                <X size={12} />
              </button>
            )}
          </div>

          {/* Channel Selector */}
          {channels.length > 1 && (
            <div className="task-channel-filter-wrap">
              <Funnel size={13} className="channel-filter-icon" />
              <select
                value={channelFilter}
                onChange={(e) => setChannelFilter(e.target.value)}
                className="task-channel-select"
                aria-label="Filter by channel"
              >
                <option value="all">All Channels</option>
                {channels.map((ch) => (
                  <option key={ch.channel_id} value={ch.channel_id}>
                    {ch.display_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Bulk Actions Dropdown */}
          <div className="task-bulk-actions-wrap" ref={actionsMenuRef}>
            <button
              type="button"
              className={`quiet-button compact task-actions-trigger ${actionsMenuOpen ? "is-active" : ""}`}
              onClick={() => setActionsMenuOpen((prev) => !prev)}
              aria-haspopup="true"
              aria-expanded={actionsMenuOpen}
              aria-label="Bulk actions menu"
            >
              <ListChecks size={14} />
              <span>Actions</span>
              <CaretDown size={11} />
            </button>

            {actionsMenuOpen && (
              <div className="task-actions-dropdown-menu" role="menu">
                <button
                  type="button"
                  role="menuitem"
                  className="task-dropdown-item danger-text"
                  disabled={queuedCount === 0}
                  onClick={() => {
                    setActionsMenuOpen(false);
                    void cancelAllQueued();
                  }}
                >
                  <X size={14} />
                  <span>Cancel Queue ({queuedCount})</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="task-dropdown-item"
                  disabled={completedCount + cancelledCount === 0}
                  onClick={() => {
                    setActionsMenuOpen(false);
                    clearCompleted();
                  }}
                >
                  <Trash size={14} />
                  <span>Clear Finished ({completedCount + cancelledCount})</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {filteredItems.length === 0 ? (
        <EmptyState
          icon={<FilmSlate size={32} />}
          title={
            searchQuery && channelFilter !== "all"
              ? "No matching tasks found"
              : searchQuery
                ? "No tasks match your search"
                : channelFilter !== "all"
                  ? `No tasks for "${selectedChannelObj?.display_name || "channel"}"`
                  : statusFilter !== "all"
                    ? `No ${formatTaskStatus(statusFilter.toUpperCase() as Task["status"])} tasks`
                    : "No episode tasks found"
          }
          copy={
            searchQuery && channelFilter !== "all"
              ? "Try adjusting your search query or reset your channel filter."
              : searchQuery
                ? "Try adjusting your search terms to find what you are looking for."
                : channelFilter !== "all"
                  ? "This channel has no matching episode tasks. Switch to All Channels or generate a new episode."
                  : "When you generate episode videos, scripts, or assets, operations will appear here in real-time."
          }
          action={
            searchQuery && channelFilter !== "all"
              ? "Reset All Filters"
              : searchQuery
                ? "Clear Search"
                : channelFilter !== "all"
                  ? "Reset Channel Filter"
                  : statusFilter !== "all"
                    ? "Show All Tasks"
                    : "Refresh"
          }
          onAction={
            searchQuery && channelFilter !== "all"
              ? () => {
                  setSearchQuery("");
                  setChannelFilter("all");
                }
              : searchQuery
                ? () => setSearchQuery("")
                : channelFilter !== "all"
                  ? () => setChannelFilter("all")
                  : statusFilter !== "all"
                    ? () => setStatusFilter("all")
                    : () => void handleManualRefresh()
          }
        />
      ) : statusFilter === "all" ? (
        /* Grouped Priority Layout for Default View */
        <div className="task-priority-groups">
          {/* Group 1: Needs Attention */}
          {attentionItems.length > 0 && (
            <section className="task-group-section is-attention" aria-label="Tasks needing attention">
              <div className="task-group-header">
                <div className="task-group-title-wrap">
                  <span className="task-group-badge is-attention">Needs Attention</span>
                  <span className="task-group-count">{attentionItems.length}</span>
                </div>
              </div>
              <div className="streamlined-task-grid">
                {attentionItems.map((item) => (
                  <StreamlinedTaskCard
                    key={item.id}
                    item={item}
                    now={now}
                    onOpenEpisode={onOpenEpisode}
                    onCancel={cancel}
                    onRetry={retry}
                    onInspect={setSelectedInspectItem}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Group 2: In Progress & Queue */}
          {inProgressItems.length > 0 && (
            <section className="task-group-section is-in-progress" aria-label="Tasks in progress and queue">
              <div className="task-group-header">
                <div className="task-group-title-wrap">
                  <span className="task-group-badge is-in-progress">In Progress & Queue</span>
                  <span className="task-group-count">{inProgressItems.length}</span>
                </div>
                {queuedCount > 0 && (
                  <button type="button" className="text-button compact" onClick={() => void cancelAllQueued()}>
                    <X size={13} />
                    <span>Cancel Queue</span>
                  </button>
                )}
              </div>
              <div className="streamlined-task-grid">
                {inProgressItems.map((item) => (
                  <StreamlinedTaskCard
                    key={item.id}
                    item={item}
                    now={now}
                    onOpenEpisode={onOpenEpisode}
                    onCancel={cancel}
                    onRetry={retry}
                    onInspect={setSelectedInspectItem}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Group 3: Completed & Cancelled */}
          {doneItems.length > 0 && (
            <section className="task-group-section is-done" aria-label="Finished and cancelled tasks">
              <div className="task-group-header">
                <div className="task-group-title-wrap">
                  <span className="task-group-badge is-done">Completed & Cancelled</span>
                  <span className="task-group-count">{doneItems.length}</span>
                </div>
                <button type="button" className="text-button compact" onClick={clearCompleted}>
                  <Trash size={13} />
                  <span>Clear List</span>
                </button>
              </div>
              <div className="streamlined-task-grid">
                {(showAllDone ? doneItems : doneItems.slice(0, 6)).map((item) => (
                  <StreamlinedTaskCard
                    key={item.id}
                    item={item}
                    now={now}
                    onOpenEpisode={onOpenEpisode}
                    onCancel={cancel}
                    onRetry={retry}
                    onInspect={setSelectedInspectItem}
                  />
                ))}
              </div>
              {doneItems.length > 6 && (
                <div className="task-group-expand-row">
                  <button type="button" className="quiet-button compact" onClick={() => setShowAllDone((prev) => !prev)}>
                    <span>{showAllDone ? "Show Less" : `Show All ${doneItems.length} Finished Tasks`}</span>
                  </button>
                </div>
              )}
            </section>
          )}
        </div>
      ) : (
        /* Flat Filtered List View */
        <div className="streamlined-task-grid">
          {filteredItems.map((item) => (
            <StreamlinedTaskCard
              key={item.id}
              item={item}
              now={now}
              onOpenEpisode={onOpenEpisode}
              onCancel={cancel}
              onRetry={retry}
              onInspect={setSelectedInspectItem}
            />
          ))}
        </div>
      )}

      {/* Slide-over Task Detail & Error Drawer */}
      <TaskDetailDrawer
        item={selectedInspectItem}
        task={null}
        now={now}
        onClose={() => setSelectedInspectItem(null)}
        onCancel={cancel}
        onRetry={retry}
        onOpenEpisode={onOpenEpisode}
      />
    </section>
  );
}
