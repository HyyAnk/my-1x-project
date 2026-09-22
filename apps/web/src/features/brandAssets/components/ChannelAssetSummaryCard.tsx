import type { KeyboardEvent } from "react";
import { ArrowRight, Sparkle, Television } from "@phosphor-icons/react";
import type { ChannelAssetSummaryCardProps } from "../types";
import { calculateCategoryReadiness } from "../utils/readinessHelpers";
import { CategoryStatusPills } from "./CategoryStatusPills";
import { MascotIndicatorBadge } from "./MascotIndicatorBadge";

export function ChannelAssetSummaryCard({
  channel,
  overview,
  isLoading = false,
  onSelect,
}: ChannelAssetSummaryCardProps) {
  const readiness = calculateCategoryReadiness(overview);
  const logoUrl = overview?.manifest?.brand?.logo?.url;
  const bannerUrl =
    overview?.manifest?.social?.youtube?.banner?.url ||
    overview?.manifest?.social?.x?.banner?.url;
  const initial = channel.display_name?.charAt(0).toUpperCase() || "C";

  const configuredCount = [
    readiness.logoStatus === "configured",
    readiness.youtubeStatus === "configured",
    readiness.xStatus === "configured",
    readiness.artCount > 0,
  ].filter(Boolean).length;
  const readinessPercent = Math.round((configuredCount / 4) * 100);

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(channel.channel_id);
    }
  };

  return (
    <article
      className="channel-asset-summary-card"
      data-testid={`channel-asset-card-${channel.channel_id}`}
      tabIndex={0}
      role="article"
      aria-label={`Brand assets for ${channel.display_name}`}
      onKeyDown={handleKeyDown}
      onClick={() => onSelect(channel.channel_id)}
    >
      {/* Decorative Card Header Banner */}
      <div className="channel-card-cover-wrap">
        {bannerUrl ? (
          <img
            src={bannerUrl}
            alt=""
            aria-hidden="true"
            className="channel-card-cover-img"
          />
        ) : (
          <div className="channel-card-cover-ambient" aria-hidden="true">
            <span className="cover-ambient-sparkle">
              <Sparkle size={14} weight="fill" />
            </span>
          </div>
        )}
      </div>

      <div className="card-body-content">
        <div className="card-top-row">
          <div className="channel-avatar-wrapper">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={`${channel.display_name} logo`}
                className="channel-card-avatar"
              />
            ) : (
              <div className="channel-card-avatar-fallback">
                <Television size={18} weight="duotone" className="fallback-icon" />
                <span className="fallback-letter">{initial}</span>
              </div>
            )}
          </div>

          <div className="channel-meta">
            <h3 className="channel-display-name" title={channel.display_name}>
              {channel.display_name}
            </h3>
            <div className="channel-meta-sub">
              <p className="channel-slug">@{channel.slug}</p>
              {channel.target_audience ? (
                <span className="channel-audience-tag">{channel.target_audience}</span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="card-mascot-section">
          <MascotIndicatorBadge mascot={overview?.mascot} />
        </div>

        {/* Readiness Meter Bar */}
        <div className="card-readiness-meter">
          <div className="meter-label-row">
            <span className="meter-caption">Brand Readiness</span>
            <span className="meter-percent">{readinessPercent}%</span>
          </div>
          <div className="meter-track" role="progressbar" aria-valuenow={readinessPercent} aria-valuemin={0} aria-valuemax={100}>
            <div
              className={`meter-fill ${readinessPercent === 100 ? "is-complete" : ""}`}
              style={{ width: `${Math.max(readinessPercent, 6)}%` }}
            />
          </div>
        </div>

        <div className="card-readiness-section">
          <CategoryStatusPills readiness={readiness} />
        </div>

        <div className="card-actions-row">
          <button
            type="button"
            className="button primary manage-assets-btn"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(channel.channel_id);
            }}
            disabled={isLoading}
            aria-label={`Manage assets for ${channel.display_name}`}
          >
            <span>Manage Assets</span>
            <ArrowRight size={14} weight="bold" />
          </button>
        </div>
      </div>
    </article>
  );
}
