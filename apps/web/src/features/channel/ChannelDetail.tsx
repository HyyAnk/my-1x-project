import { Archive, FileText, FilmSlate, Lightbulb, PencilSimple, Trash } from "@phosphor-icons/react";
import type { Channel, Episode, Task } from "@studio/shared";
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
import { useChannelDetail } from "./hooks/useChannelDetail";

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

  if (state.loadingChannel) {
    return <ChannelLoadingState channel={channel} onBack={onBack} onNavigateHome={onNavigateHome} />;
  }

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
            <button className="quiet-button" onClick={() => state.setIsEditProfileOpen(true)} title={t("channelDetail.editProfileBtn")}>
              <PencilSimple size={16} />
              <span>{t("channelDetail.editProfileBtn")}</span>
            </button>
            <button className="quiet-button" onClick={() => void state.archive()}>
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
            aria-selected={state.channelTab === "episodes"}
            className={`channel-group-tab ${state.channelTab === "episodes" ? "is-selected" : ""}`}
            {...getNavProps(buildHash({ page: "channels", channelId: channel.channel_id, tab: "episodes" }), () =>
              state.switchTab("episodes"),
            )}
          >
            <FilmSlate size={18} weight={state.channelTab === "episodes" ? "fill" : "regular"} />
            <span>Episodes</span>
            <small>{state.episodes.length}</small>
          </a>
          <a
            role="tab"
            aria-selected={state.channelTab === "topics"}
            className={`channel-group-tab ${state.channelTab === "topics" ? "is-selected" : ""}`}
            {...getNavProps(buildHash({ page: "channels", channelId: channel.channel_id, tab: "topics" }), () => state.switchTab("topics"))}
          >
            <Lightbulb size={18} weight={state.channelTab === "topics" ? "fill" : "regular"} />
            <span>Idea Lab & Topics</span>
            <small>{state.topics.length}</small>
          </a>
          {!simplifyMode ? (
            <a
              role="tab"
              aria-selected={state.channelTab === "dna"}
              className={`channel-group-tab ${state.channelTab === "dna" ? "is-selected" : ""}`}
              {...getNavProps(buildHash({ page: "channels", channelId: channel.channel_id, tab: "dna" }), () => state.switchTab("dna"))}
            >
              <FileText size={18} weight={state.channelTab === "dna" ? "fill" : "regular"} />
              <span>Channel DNA & Identity</span>
            </a>
          ) : null}
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
          />
        ) : null}

        {/* Tab 2: Idea Lab & Topics */}
        {state.channelTab === "topics" ? (
          <ChannelTopicsTab
            channel={channel}
            topics={state.topics}
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

        {/* Tab 3: Channel DNA & Identity */}
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
      </section>

      {/* Edit Channel Profile Modal */}
      {state.isEditProfileOpen ? (
        <EditChannelModal
          channel={channel}
          onClose={() => state.setIsEditProfileOpen(false)}
          onSaved={async () => {
            await state.load();
            await onRefresh();
          }}
          onNotice={onNotice}
        />
      ) : null}

      {/* Unified Mascot Video Stage Studio Modal (Single Channel Mode) */}
      <MascotAssignModal
        isOpen={state.isStageStudioOpen}
        singleChannelId={channel.channel_id}
        mascot={state.mascotsList.find((m) => m.id === channel.mascot_id) || null}
        channels={[channel]}
        allMascots={state.mascotsList}
        onClose={() => state.setIsStageStudioOpen(false)}
        onSaved={async () => {
          await onRefresh();
        }}
        onNotice={onNotice}
      />

      {state.deleteEpisodeTarget ? (
        <DeleteEpisodeModal
          channel={channel}
          episode={state.deleteEpisodeTarget}
          onClose={() => state.setDeleteEpisodeTarget(null)}
          onDeleted={state.handleEpisodeDeleted}
          onError={(error) => onNotice({ tone: "bad", message: error instanceof Error ? error.message : "Could not delete episode" })}
        />
      ) : null}
    </>
  );
}
