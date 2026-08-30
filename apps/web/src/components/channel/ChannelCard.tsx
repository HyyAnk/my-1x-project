import React from "react";
import { FilmSlate, Smiley } from "@phosphor-icons/react";
import { getCountryName, getLanguageDisplay, type Channel, type MascotProfile } from "@studio/shared";
import { CountryFlag } from "../CountryFlag";
import { useTranslation } from "../../i18n";
import { buildHash, getNavProps } from "../../hooks/useRouter";
import { formatRelativeTime } from "./utils/formatRelativeTime";
import { ChannelCardMenu } from "./ChannelCardMenu";

export type ChannelCardProps = {
  channel: Channel;
  index: number;
  mascots?: MascotProfile[];
  onOpen: () => void;
  onDelete: (channel: Channel) => void;
};

export function ChannelCard({ channel, index, mascots = [], onOpen, onDelete }: ChannelCardProps) {
  const { t } = useTranslation();

  const assignedMascot = mascots.find((m) => m.id === channel.mascot_id);
  const countryValue = channel.country || channel.market || "GLOBAL";
  const countryName = getCountryName(countryValue);
  const langDisplay = getLanguageDisplay(channel.language || "English");
  const timeAgo = formatRelativeTime(channel.updated_at, t);
  const channelUrl = buildHash({ page: "channels", channelId: channel.channel_id });

  return (
    <article
      className="channel-card"
      style={{ animationDelay: `${Math.min(index * 35, 300)}ms` }}
      {...getNavProps(channelUrl, onOpen)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      aria-label={`${channel.display_name} (${channel.status.toLowerCase()})`}
    >
      <div className="channel-card-header">
        <div className="channel-card-chips">
          <span className="channel-chip country" title={t("channels.countryTooltip", { country: countryName })}>
            <CountryFlag code={countryValue} size={13} />
          </span>

          <span className="channel-chip lang" title={t("channels.languageTooltip", { language: langDisplay })}>
            {langDisplay}
          </span>
        </div>

        <ChannelCardMenu channel={channel} channelUrl={channelUrl} onOpen={onOpen} onDelete={onDelete} />
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
