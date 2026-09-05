import { useCallback, useEffect, useRef, useState } from "react";
import type { Channel, Episode, QuizImageStyle, Task, TopicCandidate } from "@studio/shared";
import { api } from "../../../api";
import { isTaskActive, isTaskTerminal, latestTask } from "../../../lib/utils";
import type { Notice } from "../../../components/types";
import { useChannelDna } from "./useChannelDna";
import { useChannelMascotAndStyle } from "./useChannelMascotAndStyle";

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
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmingTopicId, setConfirmingTopicId] = useState<string | null>(null);
  const [deleteEpisodeTarget, setDeleteEpisodeTarget] = useState<Episode | null>(null);
  const [loadingChannel, setLoadingChannel] = useState(true);
  const initialTab = activeTab === "episodes" || activeTab === "topics" || (activeTab === "dna" && !simplifyMode) ? activeTab : "episodes";
  const [channelTab, setChannelTab] = useState<"episodes" | "topics" | "dna">(initialTab);

  useEffect(() => {
    if (
      activeTab &&
      (activeTab === "episodes" || activeTab === "topics" || (activeTab === "dna" && !simplifyMode)) &&
      activeTab !== channelTab
    ) {
      setChannelTab(activeTab);
    }
  }, [activeTab, simplifyMode, channelTab]);

  useEffect(() => {
    if (simplifyMode && channelTab === "dna") {
      setChannelTab("episodes");
    }
  }, [simplifyMode, channelTab]);

  const switchTab = (tab: "episodes" | "topics" | "dna") => {
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

  const load = useCallback(
    async (showLoading = false) => {
      const version = ++loadVersion.current;
      if (showLoading) setLoadingChannel(true);
      try {
        const [dnaResponse, topicResponse, episodeResponse] = await Promise.all([
          api.dna(channel.channel_id),
          api.topics(channel.channel_id),
          api.episodes(channel.channel_id),
        ]);
        if (version !== loadVersion.current) return;
        dnaHook.setDna(dnaResponse);
        dnaHook.setDnaDraft(dnaResponse.content);
        setTopics(topicResponse.topics);
        setEpisodes(episodeResponse.episodes);
      } finally {
        if (showLoading && version === loadVersion.current) setLoadingChannel(false);
      }
    },
    [channel.channel_id],
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
        message: hintToUse ? `Generating 5 topic ideas (2 on "${hintToUse}" + 3 random)...` : "Generating 5 lightweight topic ideas...",
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
      const result = await api.confirmTopic(channel.channel_id, topic.topic_id, questionCount, visualStyle, true);
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
    } catch (error) {
      onNotice({ tone: "bad", message: error instanceof Error ? error.message : "Could not create episode" });
    } finally {
      setConfirmingTopicId(null);
    }
  };

  const handleEpisodeDeleted = async (episode: Episode) => {
    setDeleteEpisodeTarget(null);
    setEpisodes((current) => current.filter((item) => item.episode_id !== episode.episode_id));
    onNotice({ tone: "good", message: `Episode deleted: ${episode.topic.title}` });
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
    episodes,
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
    saveDna: dnaHook.saveDna,
    generateDna: dnaHook.generateDna,
    resetDnaDraft: dnaHook.resetDnaDraft,
    archive,
    load,
  };
}
