import { ArrowLeft, CaretRight, DownloadSimple } from "@phosphor-icons/react";
import type { Channel } from "@studio/shared";

export interface BrandAssetsTopbarProps {
  selectedChannel: Channel;
  orderedChannelList: Channel[];
  onBackToOverview: () => void;
  onSelectChannel: (channelId: string) => void;
  onExportBrandKit: () => void | Promise<void>;
}

export function BrandAssetsTopbar({
  selectedChannel,
  orderedChannelList,
  onBackToOverview,
  onSelectChannel,
  onExportBrandKit,
}: BrandAssetsTopbarProps) {
  return (
    <div className="brand-assets-workspace-topbar">
      <div className="workspace-topbar-nav">
        <button
          type="button"
          className="button quiet back-to-channels-btn"
          onClick={onBackToOverview}
          aria-label="Back to Channels"
        >
          <ArrowLeft size={16} weight="bold" />
          <span>Back to Channels</span>
        </button>

        <nav className="brand-assets-breadcrumbs" aria-label="Breadcrumb navigation">
          <span className="breadcrumb-root">Brand Assets</span>
          <CaretRight size={14} className="breadcrumb-separator" />
          <span className="breadcrumb-current">{selectedChannel.display_name}</span>
        </nav>
      </div>

      <div className="workspace-topbar-actions">
        {orderedChannelList.length > 1 ? (
          <select
            className="channel-select-dropdown"
            value={selectedChannel.channel_id}
            onChange={(e) => onSelectChannel(e.target.value)}
            aria-label="Switch Channel"
          >
            {orderedChannelList.map((ch) => (
              <option key={ch.channel_id} value={ch.channel_id}>
                {ch.display_name}
              </option>
            ))}
          </select>
        ) : null}

        <button
          type="button"
          className="button primary export-brand-kit-btn"
          onClick={onExportBrandKit}
          aria-label="Export Brand Kit"
          data-testid="export-brand-kit-btn"
          title="Download complete brand kit as .zip"
        >
          <DownloadSimple size={16} weight="bold" />
          <span>Export Brand Kit (.zip)</span>
        </button>
      </div>
    </div>
  );
}
