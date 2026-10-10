import React from "react";
import { DotsSixVertical } from "@phosphor-icons/react";
import { getCountryName, getLanguageDisplay, type Channel, type MascotProfile } from "@studio/shared";
import { CountryFlag } from "../CountryFlag";
import { useTranslation } from "../../i18n";
import { buildHash, getNavProps } from "../../hooks/useRouter";
import { formatRelativeTime } from "./utils/formatRelativeTime";
import { ChannelCardMenu } from "./ChannelCardMenu";
import { ChannelMascotPill } from "./ChannelMascotPill";
import { ChannelVideoCountBadge } from "./ChannelVideoCountBadge";
import type { DraggableCardProps } from "../../features/channel/hooks/useChannelDragAndDrop";

export type ChannelCardProps = {
  channel: Channel;
  index: number;
  mascots?: MascotProfile[];
  onOpen: () => void;
  onDelete: (channel: Channel) => void;
  isReordering?: boolean;
  draggableProps?: DraggableCardProps;
  onPinToTop?: (channelId: string) => void;
};

export function ChannelCard({
  channel,
  index,
  mascots = [],
  onOpen,
  onDelete,
  isReordering = false,
  draggableProps,
  onPinToTop,
}: ChannelCardProps) {
  const { t } = useTranslation();

  const assignedMascot = mascots.find((m) => m.id === channel.mascot_id);
  const countryValue = channel.country || channel.market || "GLOBAL";
  const countryName = getCountryName(countryValue);
  const langDisplay = getLanguageDisplay(channel.language || "English");
  const timeAgo = formatRelativeTime(channel.updated_at, t);
  const channelUrl = buildHash({ page: "channels", channelId: channel.channel_id });

  const isDragging = draggableProps?.["data-dragging"];
  const isDragOver = draggableProps?.["data-drag-over"];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isReordering) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpen();
    }
  };

  const navProps = isReordering ? {} : getNavProps(channelUrl, onOpen);

  return (
    <article
      className={`channel-card ${isReordering ? "is-reordering" : ""} ${isDragging ? "is-dragging" : ""} ${
        isDragOver ? "is-drag-over" : ""
      }`}
      style={{ animationDelay: `${Math.min(index * 35, 300)}ms` }}
      {...navProps}
      {...(isReordering && draggableProps ? draggableProps : {})}
      role={isReordering ? "listitem" : "button"}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-label={`${channel.display_name} (${channel.status.toLowerCase()})`}
    >
      <div className="channel-card-header">
        <div className="channel-card-chips">
          {isReordering ? (
            <span className="channel-drag-handle" title={t("channels.dragHandleTooltip")} aria-label={t("channels.dragHandleTooltip")}>
              <DotsSixVertical size={16} weight="bold" />
            </span>
          ) : null}

          <span className="channel-chip country" title={t("channels.countryTooltip", { country: countryName })}>
            <CountryFlag code={countryValue} size={13} />
          </span>

          <span className="channel-chip lang" title={t("channels.languageTooltip", { language: langDisplay })}>
            {langDisplay}
          </span>
        </div>

        <ChannelCardMenu
          channel={channel}
          channelUrl={channelUrl}
          onOpen={onOpen}
          onDelete={onDelete}
          onPinToTop={onPinToTop ? () => onPinToTop(channel.channel_id) : undefined}
        />
      </div>

      <div className="channel-card-body">
        <h3 className="channel-card-title">{channel.display_name}</h3>
        {channel.mascot_id ? <ChannelMascotPill mascot={assignedMascot} /> : null}
      </div>

      <div className="channel-card-footer">
        <div className="channel-footer-stats">
          {timeAgo ? (
            <span className="stat-item footer-time" title={channel.updated_at}>
              {timeAgo}
            </span>
          ) : null}
        </div>

        <ChannelVideoCountBadge episodeCount={channel.episode_count} />
      </div>
    </article>
  );
}
