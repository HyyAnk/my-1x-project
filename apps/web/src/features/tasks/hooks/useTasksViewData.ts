import { useState, useMemo, useEffect, useRef } from "react";
import type { Channel, Task } from "@studio/shared";
import { api } from "../../../api";
import type { Notice } from "../../../components/types";
import type { ProductionItemSummary, StatusFilter } from "../types";
import { useTaskFiltering } from "./useTaskFiltering";
import { useTaskActions } from "./useTaskActions";

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

  // Load episode titles only for relevant episode IDs present in active tasks
  useEffect(() => {
    let isCancelled = false;

    // Collect unique episode IDs and any pre-attached titles from active tasks
    const relevantEpisodeIds = new Set<string>();
    const seedTitles = new Map<string, string>();

    for (const task of tasks) {
      if (task.episode_id) {
        relevantEpisodeIds.add(task.episode_id);
        if (task.episode_title) {
          seedTitles.set(task.episode_id, task.episode_title);
        }
      }
    }

    if (relevantEpisodeIds.size === 0) {
      return;
    }

    // Identify which episode IDs are missing from existing cache and seed titles
    const missingIds = Array.from(relevantEpisodeIds).filter((id) => !episodeTitleMap.has(id) && !seedTitles.has(id));

    if (missingIds.length === 0) {
      if (seedTitles.size > 0) {
        setEpisodeTitleMap((prev) => {
          let hasChange = false;
          const next = new Map(prev);
          for (const [id, title] of seedTitles) {
            if (!next.has(id)) {
              next.set(id, title);
              hasChange = true;
            }
          }
          return hasChange ? next : prev;
        });
      }
      return;
    }

    // Fetch only missing titles in a single batch network call
    const fetchBatchTitles = async () => {
      try {
        const res = await api.batchEpisodeTitles(missingIds);
        if (isCancelled) return;

        setEpisodeTitleMap((prev) => {
          const next = new Map(prev);
          for (const [id, title] of seedTitles) {
            next.set(id, title);
          }
          if (res?.titles) {
            for (const [id, title] of Object.entries(res.titles)) {
              if (title) next.set(id, title);
            }
          }
          return next;
        });
      } catch {
        if (!isCancelled && seedTitles.size > 0) {
          setEpisodeTitleMap((prev) => {
            const next = new Map(prev);
            for (const [id, title] of seedTitles) {
              next.set(id, title);
            }
            return next;
          });
        }
      }
    };

    void fetchBatchTitles();

    return () => {
      isCancelled = true;
    };
  }, [tasks]);

  const filtering = useTaskFiltering({
    tasks,
    dismissedTaskIds,
    channelMap,
    episodeTitleMap,
    statusFilter,
    channelFilter,
    searchQuery,
    now,
  });

  const actions = useTaskActions({
    onRefresh,
    onNotice,
    productionItems: filtering.productionItems,
    setIsRefreshing,
    setDismissedTaskIds,
  });

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
    actionsMenuRef,
    showAllDone,
    setShowAllDone,
    ...filtering,
    ...actions,
  };
}
