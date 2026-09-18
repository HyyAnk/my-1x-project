import { Archive, PencilSimple, Trash } from "@phosphor-icons/react";
import type { Channel } from "@studio/shared";
import { ChannelBreadcrumb } from "../../../components/Breadcrumbs";
import { StatusBadge } from "../../../components/AppChrome";
import { useTranslation } from "../../../i18n";

export interface ChannelDetailHeaderProps {
  channel: Channel;
  onNavigateHome?: () => void;
  onBack: () => void;
  onEditProfile: () => void;
  onArchive: () => void | Promise<void>;
  onDelete: (channel: Channel) => void;
}

export function ChannelDetailHeader({ channel, onNavigateHome, onBack, onEditProfile, onArchive, onDelete }: ChannelDetailHeaderProps) {
  const { t } = useTranslation();

  return (
    <>
      <ChannelBreadcrumb channelName={channel.display_name} onNavigateHome={onNavigateHome} onNavigateChannels={onBack} />

      <div className="detail-header">
        <div>
          <p className="eyebrow">Quiz Engine Channel</p>
          <h1>{channel.display_name}</h1>
          {channel.description ? <p className="detail-copy">{channel.description}</p> : null}
        </div>
        <div className="detail-actions">
          <StatusBadge status={channel.status} />
          <button className="quiet-button" onClick={onEditProfile} title={t("channelDetail.editProfileBtn")}>
            <PencilSimple size={16} />
            <span>{t("channelDetail.editProfileBtn")}</span>
          </button>
          <button className="quiet-button" onClick={() => void onArchive()}>
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
    </>
  );
}
