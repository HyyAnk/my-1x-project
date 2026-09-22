import type { Channel, ChannelAssetsOverviewResponse } from "@studio/shared";

export type ReadinessStatus = "configured" | "incomplete" | "missing";

export interface CategoryReadiness {
  logoStatus: "configured" | "missing";
  youtubeStatus: ReadinessStatus;
  xStatus: ReadinessStatus;
  artCount: number;
}

export interface ChannelAssetSummaryCardProps {
  channel: Channel;
  overview?: ChannelAssetsOverviewResponse | null;
  isLoading?: boolean;
  onSelect: (channelId: string) => void;
}

export interface BrandAssetsOverviewProps {
  channels: Channel[];
  onSelectChannel: (channelId: string) => void;
}
