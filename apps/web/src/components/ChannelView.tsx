import { useEffect, useState } from "react";
import type { Channel, Task } from "@studio/shared";
import { ChannelsListView, type ChannelGroupId } from "./ChannelList";
import { EpisodeDetail } from "./EpisodeView";
import type { Notice } from "./types";
import {
  DeleteChannelModal,
} from "../features/channel/components/DeleteChannelModal";
import {
  DeleteEpisodeModal,
} from "../features/channel/components/DeleteEpisodeModal";
import {
  VisualStylesMenu,
  QUIZ_IMAGE_STYLE_DESCRIPTIONS,
} from "../features/channel/components/VisualStylesMenu";
import {
  TopicLayoutPreviewButton,
} from "../features/channel/components/TopicLayoutPreviewButton";
import {
  TopicCard,
} from "../features/channel/components/TopicCard";
import {
  TopicHistoryRow,
} from "../features/channel/components/TopicHistoryRow";
import {
  EpisodeCard,
} from "../features/channel/components/EpisodeCard";
import {
  CreateChannelModal,
} from "../features/channel/components/CreateChannelModal";
import {
  ChannelDetail,
} from "../features/channel/ChannelDetail";

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
  activeGroupQuery,
  onTabChange,
  onGroupChange,
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
  activeGroupQuery?: string | null;
  onTabChange?: (tab: string) => void;
  onGroupChange?: (group: string) => void;
  onNavigateHome?: () => void;
  onTaskSubmitted: (task: Task) => void;
  openChannel: (id: string, tab?: string) => void;
  onCreate: (groupId?: ChannelGroupId) => void;
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
  const initialGroup: ChannelGroupId = "quiz";
  const [activeGroup, setActiveGroup] = useState<ChannelGroupId>(initialGroup);

  useEffect(() => {
    setActiveGroup("quiz");
  }, [activeGroupQuery]);

  useEffect(() => {
    if (selectedChannel) setActiveGroup("quiz");
  }, [selectedChannel]);

  const handleGroupChange = (group: ChannelGroupId) => {
    setActiveGroup(group);
    onGroupChange?.(group);
  };

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

  return (
    <ChannelsListView
      channels={channels}
      activeGroup={activeGroup}
      onActiveGroupChange={handleGroupChange}
      onCreate={(groupId) => onCreate(groupId)}
      openChannel={(id) => openChannel(id)}
      onDelete={onDelete}
    />
  );
}
