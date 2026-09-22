import { CheckCircle, Eye, Globe } from "@phosphor-icons/react";

export interface SocialProfileMockupProps {
  platform: "youtube" | "x";
  channelName: string;
  channelSlug: string;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
}

export function SocialProfileMockup({
  platform,
  channelName,
  channelSlug,
  avatarUrl,
  bannerUrl,
}: SocialProfileMockupProps) {
  const isYouTube = platform === "youtube";
  const initial = channelName ? channelName.charAt(0).toUpperCase() : "C";
  const platformDomain = isYouTube ? `youtube.com/@${channelSlug || "channel"}` : `x.com/${channelSlug || "handle"}`;

  return (
    <div className={`social-profile-mockup-frame platform-${platform}`} data-testid={`social-mockup-${platform}`}>
      <div className="mockup-browser-chrome">
        <div className="mockup-window-controls">
          <span className="window-dot dot-red" />
          <span className="window-dot dot-yellow" />
          <span className="window-dot dot-green" />
        </div>
        <div className="mockup-address-bar">
          <Globe size={12} className="address-icon" />
          <span className="address-text">{platformDomain}</span>
        </div>
        <div className="mockup-badge-indicator">
          <Eye size={12} weight="bold" />
          <span>Live {isYouTube ? "YouTube" : "X"} Mockup</span>
        </div>
      </div>

      <div className="mockup-banner-viewport">
        {bannerUrl ? (
          <img src={bannerUrl} alt={`${channelName} banner preview`} className="mockup-banner-img" />
        ) : (
          <div className="mockup-banner-placeholder">
            <span className="placeholder-brand-logo">{isYouTube ? "▶ YouTube Banner (16:9)" : "𝕏 Header (3:1)"}</span>
            <span className="placeholder-guidance">Upload banner below to preview in mockup</span>
          </div>
        )}
      </div>

      <div className="mockup-profile-bar">
        <div className="mockup-avatar-wrap">
          {avatarUrl ? (
            <img src={avatarUrl} alt={`${channelName} avatar preview`} className="mockup-avatar-img" />
          ) : (
            <div className="mockup-avatar-placeholder">
              <span>{initial}</span>
            </div>
          )}
        </div>

        <div className="mockup-channel-details">
          <div className="mockup-name-row">
            <h4 className="mockup-channel-title">{channelName || "Channel Name"}</h4>
            <CheckCircle size={15} weight="fill" className="mockup-verified-badge" />
          </div>
          <p className="mockup-channel-handle">@{channelSlug || "handle"}</p>
          <p className="mockup-channel-stats">
            {isYouTube ? "12.4K subscribers • 36 videos" : "1.8K Followers • 140 Following"}
          </p>
        </div>

        <div className="mockup-action-pill">
          {isYouTube ? (
            <span className="mockup-youtube-sub-btn">Subscribe</span>
          ) : (
            <span className="mockup-x-follow-btn">Follow</span>
          )}
        </div>
      </div>
    </div>
  );
}
