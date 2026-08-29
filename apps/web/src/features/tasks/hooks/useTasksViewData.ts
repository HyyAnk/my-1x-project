import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import type { Channel, Task } from "@studio/shared";
import { api } from "../../../api";
import { formatTaskType, isTaskActive } from "../../../lib/utils";
import type { Notice } from "../../../components/types";
import { calculateProgress, needsAttention, type ProductionItemSummary, type StatusFilter } from "../types";

export type UseTasksViewDataProps = {
  tasks: Task[];
  channels?: Channel[];
  now: number;
  onRefresh: () => Promise<void>;
  onNotice: (notice: NonNullable<Notice>) => void;
};

export function useTasksViewData({ tasks, channels = [], now, onRefresh, onNotice }: UseTasksViewDataProps) {
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
  const attentionItems = useMemo(() => filteredItems.filter((item) => needsAttention(item, now)), [filteredItems, now]);
  const inProgressItems = useMemo(() => filteredItems.filter((i) => i.status === "RUNNING" || i.status === "QUEUED"), [filteredItems]);
  const doneItems = useMemo(() => filteredItems.filter((i) => i.status === "COMPLETED" || i.status === "CANCELLED"), [filteredItems]);

  // Actions
  const cancel = useCallback(
    async (task: Task) => {
      try {
        await api.cancelTask(task.task_id);
        onNotice({ tone: "good", message: "Task cancelled" });
        await onRefresh();
      } catch (error) {
        onNotice({ tone: "bad", message: error instanceof Error ? error.message : "Failed to cancel task" });
      }
    },
    [onNotice, onRefresh],
  );

  const retry = useCallback(
    async (task: Task) => {
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
    },
    [onNotice, onRefresh],
  );

  const clearCompleted = useCallback(() => {
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
  }, [productionItems, onNotice]);

  const cancelAllQueued = useCallback(async () => {
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
  }, [productionItems, onNotice, onRefresh]);

  const handleManualRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  }, [onRefresh]);

  return {
    statusFilter,
    setStatusFilter,
    channelFilter,
    setChannelFilter,
    searchQuery,
    setSearchQuery,
    selectedInspectItem,
    setSelectedInspectItem,
    isRefreshing,
    actionsMenuOpen,
    setActionsMenuOpen,
    showAllDone,
    setShowAllDone,
    actionsMenuRef,
    totalCount,
    runningCount,
    queuedCount,
    waitingApprovalCount,
    failedCount,
    completedCount,
    cancelledCount,
    filteredItems,
    attentionItems,
    inProgressItems,
    doneItems,
    cancel,
    retry,
    clearCompleted,
    cancelAllQueued,
    handleManualRefresh,
  };
}
