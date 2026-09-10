import { useCallback, useEffect, useRef, useState } from "react";
import type { Channel, Episode, QuizImageStyle, ShortReelRecord, Task, TopicCandidate, TopicRun } from "@studio/shared";
import { api } from "../../../api";

export type ChannelTab = "episodes" | "short-reels" | "topics" | "dna" | "intro-outro";
import { isTaskActive, isTaskTerminal, latestTask } from "../../../lib/utils";
import type { Notice } from "../../../components/types";
import { useChannelDna } from "./useChannelDna";
import { useChannelMascotAndStyle } from "./useChannelMascotAndStyle";
import { useTopicAvailability } from "./useTopicAvailability";
import { useChannelEpisodes } from "./useChannelEpisodes";

export type UseChannelDetailProps = {
  channel: Channel;
  tasks: Task[];
  activeTab?: string | null;
  onTabChange?: (tab: string) => void;
  onRefresh: () => Promise<void>;
  onNotice: (notice: NonNullable<Notice>) => void;
  onTaskSubmitted: (task: Task) => void;
  onSelectEpisode?: (episodeId: string) => void;
  simplifyMode?: boolean;
};

export function useChannelDetail({
  channel,
  tasks,
  activeTab,
  onTabChange,
  onRefresh,
  onNotice,
  onTaskSubmitted,
  onSelectEpisode,
  simplifyMode = true,
}: UseChannelDetailProps) {
  const [topics, setTopics] = useState<TopicCandidate[]>([]);
  const [latestTopicRun, setLatestTopicRun] = useState<TopicRun | null>(null);
  const [shortReels, setShortReels] = useState<ShortReelRecord[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmingTopicId, setConfirmingTopicId] = useState<string | null>(null);
  const [deleteEpisodeTarget, setDeleteEpisodeTarget] = useState<Episode | null>(null);
  const [deleteShortReelTarget, setDeleteShortReelTarget] = useState<ShortReelRecord | null>(null);
  const [loadingChannel, setLoadingChannel] = useState(true);

  const isValidTab = (tab?: string | null): tab is ChannelTab =>
    tab === "episodes" || tab === "short-reels" || tab === "topics" || tab === "intro-outro" || (tab === "dna" && !simplifyMode);

  const initialTab: ChannelTab = isValidTab(activeTab) ? activeTab : "episodes";
  const [channelTab, setChannelTab] = useState<ChannelTab>(initialTab);

  useEffect(() => {
    if (activeTab && isValidTab(activeTab) && activeTab !== channelTab) {
      setChannelTab(activeTab);
    }
  }, [activeTab, simplifyMode, channelTab]);

  useEffect(() => {
    if (simplifyMode && channelTab === "dna") {
      setChannelTab("episodes");
    }
  }, [simplifyMode, channelTab]);

  const switchTab = (tab: ChannelTab) => {
    setChannelTab(tab);
    onTabChange?.(tab);
  };

  const channelTasks = tasks.filter((task) => task.channel_id === channel.channel_id);
  const topicTask = latestTask(channelTasks, ["SUGGEST_TOPICS"]);
  const dnaTask = latestTask(channelTasks, ["GENERATE_DNA"]);
  const topicTaskActive = Boolean(topicTask && isTaskActive(topicTask));
  const dnaTaskActive = Boolean(dnaTask && isTaskActive(dnaTask));
  const [topicClock, setTopicClock] = useState(() => Date.now());
  const [topicHint, setTopicHint] = useState("");
  const observedTerminalTasks = useRef(new Set<string>());
  const loadVersion = useRef(0);

  const dnaHook = useChannelDna({
    channel,
    dnaTaskActive,
    onTaskSubmitted,
    onNotice,
    setBusy,
    switchTab,
  });

  const mascotHook = useChannelMascotAndStyle({
    channel,
    onRefresh,
    onNotice,
  });

  const topicAvailabilityHook = useTopicAvailability({
    channelId: channel.channel_id,
    enabled: channelTab === "topics",
  });

  const episodesHook = useChannelEpisodes({
    channelId: channel.channel_id,
    onNotice,
  });

  const load = useCallback(
    async (showLoading = false) => {
      const version = ++loadVersion.current;
      if (showLoading) setLoadingChannel(true);
      try {
        const [dnaResponse, topicResponse, shortReelsResponse] = await Promise.all([
          api.dna(channel.channel_id),
          api.topics(channel.channel_id),
          api.listShortReels(channel.channel_id).catch(() => ({ short_reels: [] })),
        ]);
        if (version !== loadVersion.current) return;
        dnaHook.setDna(dnaResponse);
        dnaHook.setDnaDraft(dnaResponse.content);
        setTopics(topicResponse.topics);
        setLatestTopicRun(topicResponse.latest_run ?? null);
        setShortReels(shortReelsResponse.short_reels ?? []);
        void topicAvailabilityHook.refresh();
        void episodesHook.reload();
      } finally {
        if (showLoading && version === loadVersion.current) setLoadingChannel(false);
      }
    },
    [channel.channel_id, episodesHook.reload, topicAvailabilityHook.refresh],
  );

  useEffect(() => {
    void load(true).catch((error: Error) => onNotice({ tone: "bad", message: error.message }));
    return () => {
      loadVersion.current += 1;
    };
  }, [load, onNotice]);

  useEffect(() => {
    observedTerminalTasks.current = new Set(channelTasks.filter(isTaskTerminal).map((task) => task.task_id));
  }, [channel.channel_id]);

  useEffect(() => {
    if (!channelTasks.some(isTaskActive)) return;
    const timer = window.setInterval(() => setTopicClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [channelTasks.some(isTaskActive)]);

  useEffect(() => {
    const newlyTerminal = channelTasks.filter((task) => isTaskTerminal(task) && !observedTerminalTasks.current.has(task.task_id));
    if (newlyTerminal.length === 0) return;
    newlyTerminal.forEach((task) => observedTerminalTasks.current.add(task.task_id));
    void load()
      .then(onRefresh)
      .catch((error: Error) => onNotice({ tone: "bad", message: error.message }));
  }, [channelTasks.map((task) => `${task.task_id}:${task.status}`).join("|"), load, onNotice, onRefresh]);

  const suggest = async (overrideHint?: string) => {
    if (topicTaskActive) return;
    setBusy("topics");
    const hintToUse = (overrideHint !== undefined ? overrideHint : topicHint).trim();
    try {
      const result = await api.suggestTopics(channel.channel_id, hintToUse || undefined);
      onTaskSubmitted(result.task);
      onNotice({
        tone: "good",
        message: hintToUse ? `Generating topics with hint "${hintToUse}"...` : "Generating topics...",
      });
      switchTab("topics");
    } catch (error) {
      onNotice({ tone: "bad", message: error instanceof Error ? error.message : "Could not generate topics" });
    } finally {
      setBusy(null);
    }
  };

  const confirmTopic = async (topic: TopicCandidate, questionCount: number, visualStyle: QuizImageStyle | "mixed" = "mixed") => {
    if (confirmingTopicId) return;
    setConfirmingTopicId(topic.topic_id);
    try {
      const result = await api.confirmTopic(channel.channel_id, topic.topic_id, questionCount, visualStyle, false);
      if (result.content_kind === "short_reel") {
        onNotice({
          tone: "good",
          message: `Short-Reel draft created: ${result.short_reel.topic.title}`,
        });
        await load();
        await onRefresh();
        window.location.hash = `#/channels/${encodeURIComponent(channel.channel_id)}/short-reels/${encodeURIComponent(result.short_reel.reel_id)}`;
      } else {
        if (result.task) {
          onTaskSubmitted(result.task);
          onNotice({
            tone: "good",
            message: "Video generation started with curated questions!",
          });
        } else {
          onNotice({
            tone: "good",
            message: `Episode created: ${result.episode.topic.title} with ${questionCount} questions`,
          });
        }
        await load();
        await onRefresh();
        if (onSelectEpisode) {
          onSelectEpisode(result.episode.episode_id);
        } else {
          switchTab("episodes");
        }
      }
    } catch (error) {
      onNotice({ tone: "bad", message: error instanceof Error ? error.message : "Could not confirm topic" });
    } finally {
      setConfirmingTopicId(null);
    }
  };

  const handleEpisodeDeleted = async (episode: Episode) => {
    setDeleteEpisodeTarget(null);
    await episodesHook.handleEpisodeDeleted(episode);
    onNotice({ tone: "good", message: `Episode deleted: ${episode.topic.title}` });
    await onRefresh();
  };

  const handleShortReelDeleted = async (reel: ShortReelRecord) => {
    setDeleteShortReelTarget(null);
    setShortReels((current) => current.filter((item) => item.reel_id !== reel.reel_id));
    onNotice({ tone: "good", message: `Short-Reel deleted: ${reel.topic.title}` });
    await onRefresh();
  };

  const archive = async () => {
    try {
      await api.updateChannel(channel.channel_id, {
        status: channel.status === "ARCHIVED" ? "ACTIVE" : "ARCHIVED",
      });
      onNotice({ tone: "good", message: channel.status === "ARCHIVED" ? "Channel restored" : "Channel archived" });
      await onRefresh();
    } catch (error) {
      onNotice({ tone: "bad", message: error instanceof Error ? error.message : "Could not update channel" });
    }
  };

  return {
    dna: dnaHook.dna,
    topics,
    latestTopicRun,
    episodes: episodesHook.episodes,
    episodesHook,
    shortReels,
    editingDna: dnaHook.editingDna,
    setEditingDna: dnaHook.setEditingDna,
    dnaDraft: dnaHook.dnaDraft,
    setDnaDraft: dnaHook.setDnaDraft,
    showDna: dnaHook.showDna,
    setShowDna: dnaHook.setShowDna,
    busy,
    confirmingTopicId,
    deleteEpisodeTarget,
    setDeleteEpisodeTarget,
    deleteShortReelTarget,
    setDeleteShortReelTarget,
    loadingChannel,
    channelTab,
    switchTab,
    topicTask,
    dnaTask,
    topicTaskActive,
    dnaTaskActive,
    topicClock,
    topicHint,
    setTopicHint,
    mascotsList: mascotHook.mascotsList,
    changingMascot: mascotHook.changingMascot,
    isStageStudioOpen: mascotHook.isStageStudioOpen,
    setIsStageStudioOpen: mascotHook.setIsStageStudioOpen,
    isEditProfileOpen: mascotHook.isEditProfileOpen,
    setIsEditProfileOpen: mascotHook.setIsEditProfileOpen,
    handleMascotChange: mascotHook.handleMascotChange,
    handleMascotConfigUpdate: mascotHook.handleMascotConfigUpdate,
    suggest,
    confirmTopic,
    handleEpisodeDeleted,
    handleShortReelDeleted,
    saveDna: dnaHook.saveDna,
    generateDna: dnaHook.generateDna,
    resetDnaDraft: dnaHook.resetDnaDraft,
    archive,
    load,
    topicAvailability: topicAvailabilityHook.availability,
    topicAvailabilityMap: topicAvailabilityHook.availabilityMap,
    refreshTopicAvailability: topicAvailabilityHook.refresh,
  };
}
