import { useMemo } from "react";
import type { Channel, Task } from "@studio/shared";
import type { Notice } from "../../components/types";
import { useChannelOrder } from "../channel/hooks/useChannelOrder";
import { BrandAssetsOverview } from "./BrandAssetsOverview";
import { BrandIdentitySection } from "./components/BrandIdentitySection";
import { SocialArtSection } from "./components/SocialArtSection";
import { SocialDesignSection } from "./components/SocialDesignSection";
import { BrandAssetsTopbar } from "./components/BrandAssetsTopbar";
import { BrandAssetsHeroBanner } from "./components/BrandAssetsHeroBanner";
import { BrandAssetsTabsNav } from "./components/BrandAssetsTabsNav";
import { BrandAssetsQuickSwitchBar } from "./components/BrandAssetsQuickSwitchBar";
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
      <BrandAssetsTopbar
        selectedChannel={selectedChannel}
        orderedChannelList={orderedChannelList}
        onBackToOverview={handleBackToOverview}
        onSelectChannel={handleSelectChannel}
        onExportBrandKit={exportBrandKit}
      />

      {/* Enhanced Hero Showcase Banner */}
      <BrandAssetsHeroBanner
        selectedChannel={selectedChannel}
        overview={overview}
        logoUrl={logoUrl}
        channelInitial={channelInitial}
        artCount={artCount}
      />

      {/* Segmented Workspace Navigation Tabs */}
      <BrandAssetsTabsNav
        currentTab={currentTab}
        onTabChange={onTabChange}
        artCount={artCount}
      />

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

      {/* Bottom Quick Switch Bar */}
      <BrandAssetsQuickSwitchBar
        channels={channels}
        selectedChannelId={selectedChannel.channel_id}
        onSelectChannel={handleSelectChannel}
      />
    </div>
  );
}
