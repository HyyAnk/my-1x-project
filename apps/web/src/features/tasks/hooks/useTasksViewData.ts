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
