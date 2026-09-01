import { CaretDown } from "@phosphor-icons/react";
import type { Channel } from "@studio/shared";
import { useTranslation } from "../../../i18n";

export type ChannelSelectorProps = {
  channel: Channel | null;
  channels: Channel[];
  onSelectChannel?: (channelId: string) => void;
};

export function ChannelSelector({ channel, channels, onSelectChannel }: ChannelSelectorProps) {
  const { t } = useTranslation();
  if (!channels || channels.length === 0) {
    return <span className="context-title">{channel?.display_name ?? t("common.overview")}</span>;
  }
  return (
    <div className="topbar-channel-selector">
      <select
        aria-label="Quick Switch Channel"
        value={channel?.channel_id ?? ""}
        onChange={(e) => {
          if (e.target.value) onSelectChannel?.(e.target.value);
        }}
      >
        <option value="" disabled={Boolean(channel)}>
          {channel ? channel.display_name : t("topbar.selectChannel")}
        </option>
        {channels.map((ch) => (
          <option key={ch.channel_id} value={ch.channel_id}>
            🎯 {ch.display_name}
          </option>
        ))}
      </select>
      <CaretDown size={12} className="selector-caret" />
    </div>
  );
}
