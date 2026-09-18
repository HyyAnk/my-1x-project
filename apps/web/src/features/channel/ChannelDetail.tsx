import { useState } from "react";
import { FileText, FilmSlate, FilmStrip, Lightbulb, VideoCamera } from "@phosphor-icons/react";
import type { Channel, Task } from "@studio/shared";
import type { Notice } from "../../components/types";
import { buildHash, getNavProps } from "../../hooks/useRouter";
import { ChannelDetailHeader } from "./components/ChannelDetailHeader";
import { ChannelDetailModals } from "./components/ChannelDetailModals";
import { ChannelLoadingState } from "./components/ChannelLoadingState";
import { ChannelEpisodesTab } from "./components/ChannelEpisodesTab";
import { ChannelShortReelsTab } from "./components/ChannelShortReelsTab";
import { ChannelTopicsTab } from "./components/ChannelTopicsTab";
import { ChannelDnaTab } from "./components/ChannelDnaTab";
import { ChannelIntroOutroTab } from "./components/ChannelIntroOutroTab";
import { useChannelDetail, type ChannelTab } from "./hooks/useChannelDetail";

type ChannelDetailProps = {
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
};

export function ChannelDetail(props: ChannelDetailProps) {
  const {
    channel,
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
  } = props;

  const state = useChannelDetail({
    channel,
    tasks,
    activeTab,
    onTabChange,
    onRefresh,
    onNotice,
    onTaskSubmitted,
    onSelectEpisode: (episodeId) => openEpisode(channel.channel_id, episodeId),
    simplifyMode,
  });

  const [isCreateShortReelOpen, setIsCreateShortReelOpen] = useState(false);

  if (state.loadingChannel) {
    return <ChannelLoadingState channel={channel} onBack={onBack} onNavigateHome={onNavigateHome} />;
  }

  return (
    <>
      <section className="page-wrap detail-page">
        <ChannelDetailHeader
          channel={channel}
          onNavigateHome={onNavigateHome}
          onBack={onBack}
          onEditProfile={() => state.setIsEditProfileOpen(true)}
          onArchive={() => state.archive()}
          onDelete={onDelete}
        />

        {/* Tab Navigation Bar */}
        <div className="channel-group-tabs" role="tablist" aria-label="Channel workspace tabs">
          {[
            { id: "episodes" as ChannelTab, label: "Episodes", icon: FilmSlate, count: state.episodes.length },
            { id: "short-reels" as ChannelTab, label: "Short-Reels", icon: FilmStrip, count: state.shortReels.length },
            { id: "topics" as ChannelTab, label: "Idea Lab & Topics", icon: Lightbulb, count: state.topics.length },
            ...(!simplifyMode ? [{ id: "dna" as ChannelTab, label: "Channel DNA & Identity", icon: FileText }] : []),
            { id: "intro-outro" as ChannelTab, label: "Intro & Outro", icon: VideoCamera },
          ].map((tab) => (
            <a
              key={tab.id}
              role="tab"
              aria-selected={state.channelTab === tab.id}
              className={`channel-group-tab ${state.channelTab === tab.id ? "is-selected" : ""}`}
              {...getNavProps(buildHash({ page: "channels", channelId: channel.channel_id, tab: tab.id }), () => state.switchTab(tab.id))}
            >
              <tab.icon size={18} weight={state.channelTab === tab.id ? "fill" : "regular"} />
              <span>{tab.label}</span>
              {"count" in tab ? <small>{tab.count}</small> : null}
            </a>
          ))}
        </div>

        {/* Tab 1: Episodes */}
        {state.channelTab === "episodes" ? (
          <ChannelEpisodesTab
            channel={channel}
            episodes={state.episodes}
            tasks={tasks}
            onOpenEpisode={openEpisode}
            onDeleteEpisode={(ep) => state.setDeleteEpisodeTarget(ep)}
            onGoToTopics={() => state.switchTab("topics")}
            page={state.episodesHook.page}
            totalPages={state.episodesHook.paginationMeta.total_pages}
            totalItems={state.episodesHook.paginationMeta.total}
            limit={state.episodesHook.limit}
            onPageChange={state.episodesHook.setPage}
            onLimitChange={state.episodesHook.setLimit}
            search={state.episodesHook.search}
            onSearchChange={state.episodesHook.setSearch}
            sort={state.episodesHook.sort}
            onSortChange={state.episodesHook.setSort}
            status={state.episodesHook.status}
            onStatusChange={state.episodesHook.setStatus}
            loading={state.episodesHook.loading}
          />
        ) : null}
        {/* Tab 2: Short-Reels */}
        {state.channelTab === "short-reels" ? (
          <ChannelShortReelsTab
            channel={channel}
            shortReels={state.shortReels}
            tasks={tasks}
            onOpenStudio={(cId, rId) => {
              window.location.hash = buildHash({ page: "channels", channelId: cId, shortReelId: rId });
            }}
            onDeleteShortReel={(reel) => state.setDeleteShortReelTarget(reel)}
            onGoToTopics={() => state.switchTab("topics")}
            onNewShortReel={() => setIsCreateShortReelOpen(true)}
          />
        ) : null}
        {/* Tab 3: Idea Lab & Topics */}
        {state.channelTab === "topics" ? (
          <ChannelTopicsTab
            channel={channel}
            topics={state.topics}
            latestRun={state.latestTopicRun}
            topicTask={state.topicTask}
            topicClock={state.topicClock}
            topicHint={state.topicHint}
            setTopicHint={state.setTopicHint}
            topicTaskActive={state.topicTaskActive}
            busy={state.busy}
            confirmingTopicId={state.confirmingTopicId}
            onSuggest={state.suggest}
            onConfirmTopic={state.confirmTopic}
          />
        ) : null}
        {/* Tab 4: Channel DNA & Identity */}
        {state.channelTab === "dna" && !simplifyMode ? (
          <ChannelDnaTab
            channel={channel}
            dna={state.dna}
            dnaDraft={state.dnaDraft}
            setDnaDraft={state.setDnaDraft}
            editingDna={state.editingDna}
            setEditingDna={state.setEditingDna}
            busy={state.busy}
            dnaTask={state.dnaTask}
            topicClock={state.topicClock}
            totalEpisodes={state.episodes.length}
            mascotsList={state.mascotsList}
            changingMascot={state.changingMascot}
            onRefresh={onRefresh}
            onNotice={onNotice}
            onSaveDna={state.saveDna}
            onMascotChange={state.handleMascotChange}
            onMascotConfigUpdate={state.handleMascotConfigUpdate}
            onOpenStageStudio={() => state.setIsStageStudioOpen(true)}
            onTaskSubmitted={onTaskSubmitted}
          />
        ) : null}
        {/* Tab 5: Custom Intro & Outro Styles */}
        {state.channelTab === "intro-outro" ? (
          <ChannelIntroOutroTab channel={channel} onNotice={onNotice} onChannelUpdate={() => void onRefresh()} />
        ) : null}
      </section>

      <ChannelDetailModals
        channel={channel}
        state={state}
        isCreateShortReelOpen={isCreateShortReelOpen}
        setIsCreateShortReelOpen={setIsCreateShortReelOpen}
        onRefresh={onRefresh}
        onNotice={onNotice}
      />
    </>
  );
}
