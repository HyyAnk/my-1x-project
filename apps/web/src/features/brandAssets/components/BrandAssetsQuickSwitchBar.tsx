import type { Channel } from "@studio/shared";

export interface BrandAssetsQuickSwitchBarProps {
  channels: Channel[];
  selectedChannelId: string;
  onSelectChannel: (channelId: string) => void;
}

export function BrandAssetsQuickSwitchBar({
  channels,
  selectedChannelId,
  onSelectChannel,
}: BrandAssetsQuickSwitchBarProps) {
  if (channels.length <= 1) return null;

  return (
    <div className="channel-quick-switch-bar">
      <span className="quick-switch-label">Switch Channel:</span>
      <div className="channel-quick-switch">
        {channels.map((ch) => (
          <button
            key={ch.channel_id}
            type="button"
            className={`quiet-button ${ch.channel_id === selectedChannelId ? "is-active" : ""}`}
            onClick={() => onSelectChannel(ch.channel_id)}
          >
            {ch.display_name}
          </button>
        ))}
      </div>
    </div>
  );
}
