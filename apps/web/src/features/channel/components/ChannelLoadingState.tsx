import type { Channel } from "@studio/shared";
import { ChannelBreadcrumb } from "../../../components/Breadcrumbs";

export function ChannelLoadingState({
  channel,
  onBack,
  onNavigateHome,
}: {
  channel: Channel;
  onBack: () => void;
  onNavigateHome?: () => void;
}) {
  return (
    <section className="page-wrap detail-page">
      <ChannelBreadcrumb channelName={channel.display_name} onNavigateHome={onNavigateHome} onNavigateChannels={onBack} />
      <div className="detail-header">
        <div>
          <p className="eyebrow">Channel workspace</p>
          <h1>{channel.display_name}</h1>
        </div>
      </div>
      <div className="channel-loading" role="status" aria-label="Loading channel">
        <span>Loading channel</span>
        <div className="channel-loading-grid" aria-hidden="true">
          <div className="channel-skeleton channel-skeleton-large" />
          <div className="channel-skeleton" />
          <div className="channel-skeleton channel-skeleton-wide" />
        </div>
      </div>
    </section>
  );
}
