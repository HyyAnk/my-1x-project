import { useMemo } from "react";
import {
  ArrowLeft,
  CaretRight,
  DownloadSimple,
  FolderSimple,
  Image as ImageIcon,
  ShareNetwork,
  Sparkle,
  Television,
} from "@phosphor-icons/react";
import type { Channel, Task } from "@studio/shared";
import type { Notice } from "../../components/types";
import { useChannelOrder } from "../channel/hooks/useChannelOrder";
import { BrandAssetsOverview } from "./BrandAssetsOverview";
import { BrandIdentitySection } from "./components/BrandIdentitySection";
import { SocialArtSection } from "./components/SocialArtSection";
import { SocialDesignSection } from "./components/SocialDesignSection";
import { useChannelAssetsDetail } from "./hooks/useChannelAssetsDetail";

export interface BrandAssetsRootViewProps {
  channels: Channel[];
  selectedChannel?: Channel | null;
  tasks?: Task[];
  activeTab?: string | null;
  onTabChange?: (tab: string) => void;
  openChannel?: (channelId: string) => void;
  openMascot?: (mascotId?: string | null, step?: number | null) => void;
  onSelectChannel?: (channelId: string) => void;
  onBackToOverview?: () => void;
  onNotice?: (notice: NonNullable<Notice>) => void;
}

export function BrandAssetsRootView({
  channels = [],
  selectedChannel = null,
  activeTab = "brand",
  onTabChange,
  openChannel,
  openMascot,
  onSelectChannel,
  onBackToOverview,
  onNotice,
}: BrandAssetsRootViewProps) {
  const {
    overview,
    isLoading,
    isMutating,
    uploadLogo,
    deleteLogo,
    uploadSocialAsset,
    deleteSocialAsset,
    uploadSocialArt,
    deleteSocialArt,
    exportBrandKit,
  } = useChannelAssetsDetail({
    channelId: selectedChannel?.channel_id,
    onNotice,
  });

  const { orderedChannels, hasCustomOrder } = useChannelOrder(channels);
  const orderedChannelList = useMemo(() => {
    if (hasCustomOrder) return orderedChannels;
    return [...channels].sort(
      (a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime(),
    );
  }, [channels, orderedChannels, hasCustomOrder]);

  const handleSelectChannel = (channelId: string) => {
    if (onSelectChannel) {
      onSelectChannel(channelId);
    } else if (openChannel) {
      openChannel(channelId);
    } else {
      window.location.hash = `#/brand_assets/${encodeURIComponent(channelId)}`;
    }
  };

  const handleBackToOverview = () => {
    if (onBackToOverview) {
      onBackToOverview();
    } else {
      window.location.hash = "#/brand_assets";
    }
  };

  if (!selectedChannel) {
    return (
      <div className="page-wrap brand-assets-root" data-testid="brand-assets-view">
        <BrandAssetsOverview
          channels={channels}
          onSelectChannel={handleSelectChannel}
        />
      </div>
    );
  }

  const currentTab = activeTab || "brand";
  const logoUrl = overview?.manifest?.brand?.logo?.url;
  const channelInitial = selectedChannel.display_name?.charAt(0).toUpperCase() || "C";
  const artCount = overview?.manifest?.art?.length || 0;

  return (
    <div className="page-wrap brand-assets-root" data-testid="brand-assets-view">
      {/* Topbar with Navigation & Quick Actions */}
      <div className="brand-assets-workspace-topbar">
        <div className="workspace-topbar-nav">
          <button
            type="button"
            className="button quiet back-to-channels-btn"
            onClick={handleBackToOverview}
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
              onChange={(e) => handleSelectChannel(e.target.value)}
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
            onClick={exportBrandKit}
            aria-label="Export Brand Kit"
            data-testid="export-brand-kit-btn"
            title="Download complete brand kit as .zip"
          >
            <DownloadSimple size={16} weight="bold" />
            <span>Export Brand Kit (.zip)</span>
          </button>
        </div>
      </div>

      {/* Enhanced Hero Showcase Banner */}
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
            <span className="hero-stat-value">
              {[
                overview?.manifest?.social?.youtube?.avatar,
                overview?.manifest?.social?.youtube?.banner,
                overview?.manifest?.social?.x?.avatar,
                overview?.manifest?.social?.x?.banner,
              ].filter(Boolean).length}
            </span>
            <span className="hero-stat-label">Social Kits</span>
          </div>
          <div className="hero-stat-box">
            <span className="hero-stat-value">{artCount}</span>
            <span className="hero-stat-label">Art Media</span>
          </div>
        </div>
      </header>

      {/* Segmented Workspace Navigation Tabs */}
      <nav className="workspace-tabs brand-workspace-tabs" aria-label="Brand Asset Hub Sections">
        <button
          type="button"
          className={`tab-button ${currentTab === "brand" ? "is-active" : ""}`}
          onClick={() => onTabChange?.("brand")}
        >
          <Sparkle size={16} weight={currentTab === "brand" ? "fill" : "regular"} />
          <span>Brand Identity</span>
        </button>
        <button
          type="button"
          className={`tab-button ${currentTab === "social" ? "is-active" : ""}`}
          onClick={() => onTabChange?.("social")}
        >
          <ShareNetwork size={16} weight={currentTab === "social" ? "fill" : "regular"} />
          <span>Social Media Kits</span>
        </button>
        <button
          type="button"
          className={`tab-button ${currentTab === "art" ? "is-active" : ""}`}
          onClick={() => onTabChange?.("art")}
        >
          <ImageIcon size={16} weight={currentTab === "art" ? "fill" : "regular"} />
          <span>Art Gallery</span>
          {artCount > 0 ? <span className="tab-count-pill">{artCount}</span> : null}
        </button>
      </nav>

      {/* Tab Contents */}
      <div className="brand-assets-tab-content">
        {currentTab === "brand" ? (
          <BrandIdentitySection
            overview={overview}
            isLoading={isLoading}
            isMutating={isMutating}
            onUploadLogo={uploadLogo}
            onDeleteLogo={deleteLogo}
            onOpenMascot={openMascot}
          />
        ) : null}

        {currentTab === "social" ? (
          <SocialDesignSection
            manifest={overview?.manifest}
            channelName={selectedChannel.display_name}
            channelSlug={selectedChannel.slug}
            isMutating={isMutating}
            onUploadAsset={uploadSocialAsset}
            onDeleteAsset={deleteSocialAsset}
          />
        ) : null}

        {currentTab === "art" ? (
          <SocialArtSection
            artAssets={overview?.manifest?.art || []}
            isMutating={isMutating}
            onUploadArt={uploadSocialArt}
            onDeleteArt={deleteSocialArt}
            onNotice={onNotice}
          />
        ) : null}
      </div>

      {channels.length > 1 ? (
        <div className="channel-quick-switch-bar">
          <span className="quick-switch-label">Switch Channel:</span>
          <div className="channel-quick-switch">
            {channels.map((ch) => (
              <button
                key={ch.channel_id}
                type="button"
                className={`quiet-button ${ch.channel_id === selectedChannel.channel_id ? "is-active" : ""}`}
                onClick={() => handleSelectChannel(ch.channel_id)}
              >
                {ch.display_name}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
