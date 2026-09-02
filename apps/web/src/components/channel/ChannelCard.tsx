import React from "react";
import { DotsSixVertical, FilmSlate, Smiley } from "@phosphor-icons/react";
import { getCountryName, getLanguageDisplay, type Channel, type MascotProfile } from "@studio/shared";
import { CountryFlag } from "../CountryFlag";
import { useTranslation } from "../../i18n";
import { buildHash, getNavProps } from "../../hooks/useRouter";
import { formatRelativeTime } from "./utils/formatRelativeTime";
import { ChannelCardMenu } from "./ChannelCardMenu";
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
            <span
              className="channel-drag-handle"
              title={t("channels.dragHandleTooltip")}
              aria-label={t("channels.dragHandleTooltip")}
            >
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
        {channel.mascot_id ? (
          <div className="channel-card-meta">
            <span className="channel-mascot-pill" title={assignedMascot?.description || assignedMascot?.name || "Mascot"}>
              {assignedMascot?.master_image_url ? (
                <img src={assignedMascot.master_image_url} alt={assignedMascot.name} className="channel-mascot-avatar" />
              ) : (
                <span className="channel-mascot-avatar-fallback">
                  <Smiley size={11} weight="fill" />
                </span>
              )}
              <span>{assignedMascot?.name || "Mascot"}</span>
            </span>
          </div>
        ) : null}
      </div>

      <div className="channel-card-footer">
        <div className="channel-footer-stats">
          <span className="stat-item">
            <FilmSlate size={13} />
            <span>
              {channel.episode_count || 0} {channel.episode_count === 1 ? "video" : "videos"}
            </span>
          </span>
          {timeAgo ? (
            <>
              <span className="footer-dot">•</span>
              <span className="stat-item footer-time">{timeAgo}</span>
            </>
          ) : null}
        </div>
      </div>
    </article>
  );
}
