import { FolderSimple, Sparkle, Television } from "@phosphor-icons/react";
import type { Channel, ChannelAssetsOverviewResponse } from "@studio/shared";

export interface BrandAssetsHeroBannerProps {
  selectedChannel: Channel;
  overview?: ChannelAssetsOverviewResponse | null;
  logoUrl?: string | null;
  channelInitial: string;
  artCount: number;
}

export function BrandAssetsHeroBanner({
  selectedChannel,
  overview,
  logoUrl,
  channelInitial,
  artCount,
}: BrandAssetsHeroBannerProps) {
  const socialKitsCount = [
    overview?.manifest?.social?.youtube?.avatar,
    overview?.manifest?.social?.youtube?.banner,
    overview?.manifest?.social?.x?.avatar,
    overview?.manifest?.social?.x?.banner,
  ].filter(Boolean).length;

  return (
    <header className="page-header brand-assets-hero-card">
      <div className="hero-identity-group">
        <div className="hero-avatar-wrap">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={`${selectedChannel.display_name} avatar`}
              className="hero-avatar-img"
            />
          ) : (
            <div className="hero-avatar-fallback">
              <Television size={24} weight="duotone" className="fallback-icon" />
              <span className="fallback-letter">{channelInitial}</span>
            </div>
          )}
        </div>

        <div className="hero-info-column">
          <div className="hero-title-row">
            <p className="eyebrow">Studio Workspace</p>
            <div className="page-title-row">
              <FolderSimple size={20} weight="duotone" />
              <h1>Brand & Social Asset Hub</h1>
            </div>
          </div>

          <div className="hero-channel-heading">
            <h2 className="hero-channel-title">{selectedChannel.display_name}</h2>
            <div className="channel-badge-indicator" data-testid="active-channel-indicator">
              <span className="badge-label">Active Channel:</span>
              <strong>{selectedChannel.display_name}</strong>
            </div>
          </div>

          <div className="hero-metadata-chips">
            <span className="hero-chip">@{selectedChannel.slug}</span>
            {selectedChannel.target_audience ? (
              <span className="hero-chip chip-audience">{selectedChannel.target_audience}</span>
            ) : null}
            {selectedChannel.country ? (
              <span className="hero-chip chip-country">{selectedChannel.country}</span>
            ) : null}
            {overview?.mascot ? (
              <span className="hero-chip chip-mascot">
                <Sparkle size={12} weight="fill" />
                <span>{overview.mascot.name}</span>
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="hero-stats-panel">
        <div className="hero-stat-box">
          <span className="hero-stat-value">{logoUrl ? "1" : "0"}</span>
          <span className="hero-stat-label">Logo</span>
        </div>
        <div className="hero-stat-box">
          <span className="hero-stat-value">{socialKitsCount}</span>
          <span className="hero-stat-label">Social Kits</span>
        </div>
        <div className="hero-stat-box">
          <span className="hero-stat-value">{artCount}</span>
          <span className="hero-stat-label">Art Media</span>
        </div>
      </div>
    </header>
  );
}
