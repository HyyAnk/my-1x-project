import React from "react";
import { ArrowUpRight, FilmSlate, Smiley } from "@phosphor-icons/react";
import { QUIZ_IMAGE_STYLE_LABELS, getCountryName, getLanguageDisplay, type Channel, type MascotProfile } from "@studio/shared";
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

  const activeStyles = channel.selected_styles && channel.selected_styles.length > 0 ? channel.selected_styles : [];
  const primaryStyleLabel = activeStyles[0] ? QUIZ_IMAGE_STYLE_LABELS[activeStyles[0]] : null;
  const extraStylesCount = activeStyles.length > 1 ? activeStyles.length - 1 : 0;
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
          <span className={`channel-status-pill ${channel.status.toLowerCase()}`}>
            <span className="channel-status-dot" />
            {channel.status === "ACTIVE"
              ? t("channels.activeStatus")
              : channel.status === "DRAFT"
                ? t("channels.draftStatus")
                : t("channels.archivedStatus")}
          </span>

          <span className="channel-chip country" title={t("channels.countryTooltip", { country: countryName })}>
            <CountryFlag code={countryValue} size={14} />
          </span>

          <span className="channel-chip lang" title={t("channels.languageTooltip", { language: langDisplay })}>
            {langDisplay}
          </span>
        </div>

        <ChannelCardMenu channel={channel} channelUrl={channelUrl} onOpen={onOpen} onDelete={onDelete} />
      </div>

      <div className="channel-card-body">
        <h3 className="channel-card-title">{channel.display_name}</h3>
        {channel.description ? (
          <p className="channel-card-desc">{channel.description}</p>
        ) : (
          <p className="channel-card-desc" style={{ opacity: 0.6, fontStyle: "italic" }}>
            {t("channels.quizChannel")}
          </p>
        )}
      </div>

      <div className="channel-card-meta">
        {channel.mascot_id ? (
          <span className="channel-mascot-pill" title={assignedMascot?.description || assignedMascot?.name || "Mascot"}>
            {assignedMascot?.master_image_url ? (
              <img src={assignedMascot.master_image_url} alt={assignedMascot.name} className="channel-mascot-avatar" />
            ) : (
              <span className="channel-mascot-avatar-fallback">
                <Smiley size={12} weight="fill" />
              </span>
            )}
            <span>{assignedMascot?.name || "Mascot"}</span>
          </span>
        ) : null}

        {primaryStyleLabel ? (
          <span className="channel-styles-pill" title={`Visual Styles: ${activeStyles.map((s) => QUIZ_IMAGE_STYLE_LABELS[s]).join(", ")}`}>
            <span className="style-dot" />
            <span>
              {primaryStyleLabel}
              {extraStylesCount > 0 ? ` +${extraStylesCount}` : ""}
            </span>
          </span>
        ) : null}
      </div>

      <div className="channel-card-footer">
        <div className="channel-footer-stats">
          <span className="stat-item">
            <FilmSlate size={14} />
            <span>
              {channel.episode_count || 0} {channel.episode_count === 1 ? "video" : "videos"}
            </span>
          </span>
          {timeAgo ? (
            <>
              <span style={{ opacity: 0.4 }}>•</span>
              <span className="stat-item" style={{ opacity: 0.85 }}>
                {timeAgo}
              </span>
            </>
          ) : null}
        </div>
        <span className="channel-card-arrow">
          <ArrowUpRight size={16} weight="bold" />
        </span>
      </div>
    </article>
  );
}
