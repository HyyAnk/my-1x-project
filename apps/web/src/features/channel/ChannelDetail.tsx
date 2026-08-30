import { useCallback, useEffect, useRef, useState } from "react";
import { Archive, FileText, FilmSlate, Lightbulb, PencilSimple, Trash } from "@phosphor-icons/react";
import type { Channel, ChannelMascotConfig, Episode, MascotProfile, QuizImageStyle, Task, TopicCandidate } from "@studio/shared";
import { api } from "../../api";
import { isTaskActive, isTaskTerminal, latestTask } from "../../lib/utils";
import { ChannelBreadcrumb } from "../../components/Breadcrumbs";
import { StatusBadge } from "../../components/AppChrome";
import type { Notice } from "../../components/types";
import { useTranslation } from "../../i18n";
import { buildHash, getNavProps } from "../../hooks/useRouter";
import { MascotAssignModal } from "../../components/MascotAssignModal";
import { ChannelLoadingState } from "./components/ChannelLoadingState";
import { DeleteEpisodeModal } from "./components/DeleteEpisodeModal";
import { EditChannelModal } from "./components/EditChannelModal";
import { ChannelEpisodesTab } from "./components/ChannelEpisodesTab";
import { ChannelTopicsTab } from "./components/ChannelTopicsTab";
import { ChannelDnaTab } from "./components/ChannelDnaTab";

export function ChannelDetail({
  channel,
  channels: _channels,
  tasks,
  activeTab,
  onTabChange,
  onNavigateHome,
  onTaskSubmitted,
  onBack,
  onRefresh,
  onNotice,
  onDelete,
  openEpisode,
  simplifyMode = true,
}: {
  channel: Channel;
  channels: Channel[];
  tasks: Task[];
  activeTab?: string | null;
  onTabChange?: (tab: string) => void;
  onNavigateHome?: () => void;
  onTaskSubmitted: (task: Task) => void;
  onBack: () => void;
  onRefresh: () => Promise<void>;
  onNotice: (notice: NonNullable<Notice>) => void;
  onDelete: (channel: Channel) => void;
  openEpisode: (channelId: string, episodeId: string, tab?: string) => void;
  simplifyMode?: boolean;
}) {
  const { t } = useTranslation();
  const [dna, setDna] = useState<{ content: string; path: string; modified_at: string } | null>(null);
  const [topics, setTopics] = useState<TopicCandidate[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [editingDna, setEditingDna] = useState(false);
  const [dnaDraft, setDnaDraft] = useState("");
  const [showDna, setShowDna] = useState(true);
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
  const [topicClock, setTopicClock] = useState(() => Date.now());
  const [topicHint, setTopicHint] = useState("");
  const [mascotsList, setMascotsList] = useState<MascotProfile[]>([]);
  const [changingMascot, setChangingMascot] = useState(false);
  const [isStageStudioOpen, setIsStageStudioOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const observedTerminalTasks = useRef(new Set<string>());
  const loadVersion = useRef(0);

  useEffect(() => {
    void api
      .mascots()
      .then((res) => setMascotsList(res.mascots))
      .catch(() => undefined);
  }, []);

  const handleMascotChange = async (mascotId: string | null) => {
    try {
      setChangingMascot(true);
      await api.assignMascotToChannel(channel.channel_id, { mascot_id: mascotId });
      onNotice({ tone: "good", message: mascotId ? t("notices.mascotAssignedChannel") : t("notices.mascotUnassignedChannel") });
      await onRefresh();
    } catch (err) {
      onNotice({ tone: "bad", message: err instanceof Error ? err.message : t("notices.mascotAssignFailed") });
    } finally {
      setChangingMascot(false);
    }
  };

  const handleMascotConfigUpdate = async (updates: Partial<ChannelMascotConfig>) => {
    try {
      setChangingMascot(true);
      await api.assignMascotToChannel(channel.channel_id, {
        mascot_id: channel.mascot_id,
        config: updates,
      });
      onNotice({ tone: "good", message: t("notices.mascotConfigUpdated") });
      await onRefresh();
    } catch (err) {
      onNotice({ tone: "bad", message: err instanceof Error ? err.message : t("notices.mascotAssignFailed") });
    } finally {
      setChangingMascot(false);
    }
  };

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
        setDna(dnaResponse);
        setDnaDraft(dnaResponse.content);
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
      const result = await api.confirmTopic(channel.channel_id, topic.topic_id, questionCount, visualStyle);
      onNotice({
        tone: "good",
        message: `Episode created: ${result.episode.topic.title} with ${questionCount} questions`,
      });
      await load();
      await onRefresh();
      switchTab("episodes");
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

  const saveDna = async () => {
    setBusy("dna");
    try {
      await api.saveDna(channel.channel_id, dnaDraft);
      setEditingDna(false);
      onNotice({ tone: "good", message: "Channel DNA saved to the repository" });
      await load();
      await onRefresh();
    } catch (error) {
      onNotice({ tone: "bad", message: error instanceof Error ? error.message : "Could not save Channel DNA" });
    } finally {
      setBusy(null);
    }
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

  if (loadingChannel) return <ChannelLoadingState channel={channel} onBack={onBack} onNavigateHome={onNavigateHome} />;

  return (
    <>
      <section className="page-wrap detail-page">
        <ChannelBreadcrumb channelName={channel.display_name} onNavigateHome={onNavigateHome} onNavigateChannels={onBack} />

        <div className="detail-header">
          <div>
            <p className="eyebrow">Quiz Engine Channel</p>
            <h1>{channel.display_name}</h1>
            {channel.description ? <p className="detail-copy">{channel.description}</p> : null}
          </div>
          <div className="detail-actions">
            <StatusBadge status={channel.status} />
            <button className="quiet-button" onClick={() => setIsEditProfileOpen(true)} title={t("channelDetail.editProfileBtn")}>
              <PencilSimple size={16} />
              <span>{t("channelDetail.editProfileBtn")}</span>
            </button>
            <button className="quiet-button" onClick={() => void archive()}>
              <Archive size={16} />
              <span>{channel.status === "ARCHIVED" ? "Restore" : "Archive"}</span>
            </button>
            <button
              className="icon-button danger"
              title="Delete channel"
              aria-label={`Delete ${channel.display_name}`}
              onClick={() => onDelete(channel)}
            >
              <Trash size={17} />
            </button>
          </div>
        </div>

        {/* 3-Tab Navigation Bar */}
        <div className="channel-group-tabs" role="tablist" aria-label="Channel workspace tabs">
          <a
            role="tab"
            aria-selected={channelTab === "episodes"}
            className={`channel-group-tab ${channelTab === "episodes" ? "is-selected" : ""}`}
            {...getNavProps(buildHash({ page: "channels", channelId: channel.channel_id, tab: "episodes" }), () => switchTab("episodes"))}
          >
            <FilmSlate size={18} weight={channelTab === "episodes" ? "fill" : "regular"} />
            <span>Episodes</span>
            <small>{episodes.length}</small>
          </a>
          <a
            role="tab"
            aria-selected={channelTab === "topics"}
            className={`channel-group-tab ${channelTab === "topics" ? "is-selected" : ""}`}
            {...getNavProps(buildHash({ page: "channels", channelId: channel.channel_id, tab: "topics" }), () => switchTab("topics"))}
          >
            <Lightbulb size={18} weight={channelTab === "topics" ? "fill" : "regular"} />
            <span>Idea Lab & Topics</span>
            <small>{topics.length}</small>
          </a>
          {!simplifyMode ? (
            <a
              role="tab"
              aria-selected={channelTab === "dna"}
              className={`channel-group-tab ${channelTab === "dna" ? "is-selected" : ""}`}
              {...getNavProps(buildHash({ page: "channels", channelId: channel.channel_id, tab: "dna" }), () => switchTab("dna"))}
            >
              <FileText size={18} weight={channelTab === "dna" ? "fill" : "regular"} />
              <span>Channel DNA & Identity</span>
            </a>
          ) : null}
        </div>

        {/* Tab 1: Episodes */}
        {channelTab === "episodes" ? (
          <ChannelEpisodesTab
            channel={channel}
            episodes={episodes}
            tasks={tasks}
            onOpenEpisode={openEpisode}
            onDeleteEpisode={(ep) => setDeleteEpisodeTarget(ep)}
            onGoToTopics={() => switchTab("topics")}
          />
        ) : null}

        {/* Tab 2: Idea Lab & Topics */}
        {channelTab === "topics" ? (
          <ChannelTopicsTab
            channel={channel}
            topics={topics}
            topicTask={topicTask}
            topicClock={topicClock}
            topicHint={topicHint}
            setTopicHint={setTopicHint}
            topicTaskActive={topicTaskActive}
            busy={busy}
            confirmingTopicId={confirmingTopicId}
            onSuggest={suggest}
            onConfirmTopic={confirmTopic}
          />
        ) : null}

        {/* Tab 3: Channel DNA & Identity */}
        {channelTab === "dna" && !simplifyMode ? (
          <ChannelDnaTab
            channel={channel}
            dna={dna}
            dnaDraft={dnaDraft}
            setDnaDraft={setDnaDraft}
            editingDna={editingDna}
            setEditingDna={setEditingDna}
            busy={busy}
            dnaTask={dnaTask}
            topicClock={topicClock}
            totalEpisodes={episodes.length}
            mascotsList={mascotsList}
            changingMascot={changingMascot}
            onRefresh={onRefresh}
            onNotice={onNotice}
            onSaveDna={saveDna}
            onMascotChange={handleMascotChange}
            onMascotConfigUpdate={handleMascotConfigUpdate}
            onOpenStageStudio={() => setIsStageStudioOpen(true)}
            onTaskSubmitted={onTaskSubmitted}
          />
        ) : null}
      </section>

      {/* Edit Channel Profile Modal */}
      {isEditProfileOpen ? (
        <EditChannelModal
          channel={channel}
          onClose={() => setIsEditProfileOpen(false)}
          onSaved={async () => {
            await load();
            await onRefresh();
          }}
          onNotice={onNotice}
        />
      ) : null}

      {/* Unified Mascot Video Stage Studio Modal (Single Channel Mode) */}
      <MascotAssignModal
        isOpen={isStageStudioOpen}
        singleChannelId={channel.channel_id}
        mascot={mascotsList.find((m) => m.id === channel.mascot_id) || null}
        channels={[channel]}
        allMascots={mascotsList}
        onClose={() => setIsStageStudioOpen(false)}
        onSaved={async () => {
          await onRefresh();
        }}
        onNotice={onNotice}
      />

      {deleteEpisodeTarget ? (
        <DeleteEpisodeModal
          channel={channel}
          episode={deleteEpisodeTarget}
          onClose={() => setDeleteEpisodeTarget(null)}
          onDeleted={handleEpisodeDeleted}
          onError={(error) => onNotice({ tone: "bad", message: error instanceof Error ? error.message : "Could not delete episode" })}
        />
      ) : null}
    </>
  );
}
