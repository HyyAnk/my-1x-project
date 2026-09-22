import { FolderSimple, MagnifyingGlass, X } from "@phosphor-icons/react";
import type { BrandAssetsOverviewProps } from "./types";
import { useBrandAssetsOverview } from "./hooks/useBrandAssetsOverview";
import { ChannelAssetSummaryCard } from "./components/ChannelAssetSummaryCard";

export function BrandAssetsOverview({
  channels,
  onSelectChannel,
}: BrandAssetsOverviewProps) {
  const {
    searchTerm,
    setSearchTerm,
    sortBy,
    setSortBy,
    hasCustomOrder,
    filteredChannels,
    channelOverviews,
    isLoading,
  } = useBrandAssetsOverview({ channels });

  return (
    <div className="brand-assets-overview" data-testid="brand-assets-overview">
      <header className="page-header brand-assets-header">
        <div>
          <p className="eyebrow">Studio Workspace</p>
          <div className="page-title-row">
            <FolderSimple size={24} weight="duotone" />
            <h1>Brand & Social Asset Hub</h1>
          </div>
          <p className="page-subtitle">
            Select a channel to manage its brand identity, social design assets, and art media.
          </p>
        </div>
      </header>

      <section className="brand-assets-controls-bar">
        <div className="search-input-wrapper">
          <MagnifyingGlass size={16} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search channels by name or slug..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Search channels by name or slug"
          />
          {searchTerm ? (
            <button
              type="button"
              className="clear-search-btn"
              onClick={() => setSearchTerm("")}
              aria-label="Clear search"
              title="Clear search"
            >
              <X size={14} weight="bold" />
            </button>
          ) : null}
        </div>

        <div className="brand-assets-controls-right">
          <select
            className="channel-sort-select brand-assets-sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            aria-label="Sort channels"
            data-testid="brand-assets-sort-select"
          >
            {hasCustomOrder ? <option value="custom">Custom Order</option> : null}
            <option value="latest">Recently updated</option>
            <option value="episodes">Most episodes</option>
            <option value="name">Name A-Z</option>
          </select>

          <div className="channel-count-badge" data-testid="channel-count-badge">
            <span>
              {filteredChannels.length} of {channels.length}{" "}
              {channels.length === 1 ? "channel" : "channels"}
            </span>
          </div>
        </div>
      </section>

      {channels.length === 0 ? (
        <div className="empty-state brand-assets-empty" data-testid="empty-channels">
          <div className="empty-icon">
            <FolderSimple size={36} weight="duotone" />
          </div>
          <h3>No Channels in Workspace</h3>
          <p>Create a channel from the sidebar or channel manager to start organizing brand assets.</p>
        </div>
      ) : filteredChannels.length === 0 ? (
        <div className="empty-state brand-assets-empty" data-testid="empty-search">
          <div className="empty-icon">
            <MagnifyingGlass size={36} weight="duotone" />
          </div>
          <h3>No Channels Found</h3>
          <p>No channels match the search query "{searchTerm}".</p>
          <button
            type="button"
            className="button secondary"
            onClick={() => setSearchTerm("")}
          >
            Clear Search
          </button>
        </div>
      ) : (
        <div className="brand-assets-channel-grid" data-testid="channel-cards-grid">
          {filteredChannels.map((channel) => (
            <ChannelAssetSummaryCard
              key={channel.channel_id}
              channel={channel}
              overview={channelOverviews[channel.channel_id]}
              isLoading={isLoading}
              onSelect={onSelectChannel}
            />
          ))}
        </div>
      )}
    </div>
  );
}
