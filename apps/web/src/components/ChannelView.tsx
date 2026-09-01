import type { Channel, Task } from "@studio/shared";
import { ChannelsListView } from "./ChannelList";
import { EpisodeDetail } from "./EpisodeView";
import type { Notice } from "./types";
import { DeleteChannelModal } from "../features/channel/components/DeleteChannelModal";
import { DeleteEpisodeModal } from "../features/channel/components/DeleteEpisodeModal";
import { VisualStylesMenu, QUIZ_IMAGE_STYLE_DESCRIPTIONS } from "../features/channel/components/VisualStylesMenu";
import { TopicLayoutPreviewButton } from "../features/channel/components/TopicLayoutPreviewButton";
import { TopicCard } from "../features/channel/components/TopicCard";
import { TopicHistoryRow } from "../features/channel/components/TopicHistoryRow";
import { EpisodeCard } from "../features/channel/components/EpisodeCard";
import { CreateChannelModal } from "../features/channel/components/CreateChannelModal";
import { ChannelDetail } from "../features/channel/ChannelDetail";

export {
  DeleteChannelModal,
  DeleteEpisodeModal,
  QUIZ_IMAGE_STYLE_DESCRIPTIONS,
  VisualStylesMenu,
  TopicLayoutPreviewButton,
  TopicCard,
  TopicHistoryRow,
  EpisodeCard,
  ChannelDetail,
  CreateChannelModal,
};

export function ChannelsView({
  selectedChannel,
  selectedEpisodeId,
  channels,
  tasks,
  activeTab,
  onTabChange,
  onNavigateHome,
  onTaskSubmitted,
  openChannel,
  onCreate,
  onRefresh,
  onNotice,
  onDelete,
  openEpisode,
  maxDuration,
  narrationWordsPerSecond,
  imageGenerationEnabled,
  imagesPerBundle,
  simplifyMode = true,
}: {
  selectedChannel: Channel | null;
  selectedEpisodeId: string | null;
  channels: Channel[];
  tasks: Task[];
  activeTab?: string | null;
  onTabChange?: (tab: string) => void;
  onNavigateHome?: () => void;
  onTaskSubmitted: (task: Task) => void;
  openChannel: (id: string, tab?: string) => void;
  onCreate: () => void;
  onRefresh: () => Promise<void>;
  onNotice: (notice: NonNullable<Notice>) => void;
  onDelete: (channel: Channel) => void;
  openEpisode: (channelId: string, episodeId: string, tab?: string) => void;
  maxDuration: number;
  narrationWordsPerSecond: number;
  imageGenerationEnabled: boolean;
  imagesPerBundle: number;
  simplifyMode?: boolean;
}) {
  if (selectedChannel && selectedEpisodeId) {
    return (
      <EpisodeDetail
        channel={selectedChannel}
        episodeId={selectedEpisodeId}
        tasks={tasks}
        activeTab={activeTab}
        onTabChange={onTabChange}
        onNavigateHome={onNavigateHome}
        onNavigateChannels={() => openChannel("")}
        onNavigateChannel={() => openChannel(selectedChannel.channel_id)}
        onTaskSubmitted={onTaskSubmitted}
        maxDuration={maxDuration}
        narrationWordsPerSecond={narrationWordsPerSecond}
        imageGenerationEnabled={imageGenerationEnabled}
        imagesPerBundle={imagesPerBundle}
        onBack={() => openChannel(selectedChannel.channel_id)}
        onNotice={onNotice}
        simplifyMode={simplifyMode}
      />
    );
  }

  if (selectedChannel) {
    return (
      <ChannelDetail
        channel={selectedChannel}
        channels={channels}
        tasks={tasks}
        activeTab={activeTab}
        onTabChange={onTabChange}
        onNavigateHome={onNavigateHome}
        onTaskSubmitted={onTaskSubmitted}
        onBack={() => openChannel("")}
        onRefresh={onRefresh}
        onNotice={onNotice}
        onDelete={onDelete}
        openEpisode={openEpisode}
        simplifyMode={simplifyMode}
      />
    );
  }

  return <ChannelsListView channels={channels} onCreate={onCreate} openChannel={(id) => openChannel(id)} onDelete={onDelete} />;
}
