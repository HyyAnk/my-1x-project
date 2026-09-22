import { useState } from "react";
import type { ChannelAssetManifest, SocialAssetKind, SocialPlatform } from "@studio/shared";
import { SocialAssetCard } from "./SocialAssetCard";
import { SocialProfileMockup } from "./SocialProfileMockup";

export interface SocialDesignSectionProps {
  manifest?: ChannelAssetManifest;
  channelName?: string;
  channelSlug?: string;
  isMutating?: boolean;
  onUploadAsset: (platform: SocialPlatform, kind: SocialAssetKind, file: File) => Promise<void>;
  onDeleteAsset: (platform: SocialPlatform, kind: SocialAssetKind) => Promise<void>;
}

type ActiveSocialPlatform = "youtube" | "x";

export function SocialDesignSection({
  manifest,
  channelName = "Channel",
  channelSlug = "channel",
  isMutating = false,
  onUploadAsset,
  onDeleteAsset,
}: SocialDesignSectionProps) {
  const [activePlatform, setActivePlatform] = useState<ActiveSocialPlatform>("youtube");

  const youtubeAvatar = manifest?.social?.youtube?.avatar;
  const youtubeBanner = manifest?.social?.youtube?.banner;
  const xAvatar = manifest?.social?.x?.avatar;
  const xBanner = manifest?.social?.x?.banner;

  return (
    <section
      className="social-design-section"
      data-testid="social-design-section"
      aria-label="Social Design Section"
    >
      <div className="section-intro">
        <h2 className="section-title">Social Media Kits</h2>
        <p className="section-subtitle">
          Manage platform-optimized profile avatars and channel header banners for your social platforms.
        </p>
      </div>

      <nav className="social-platform-subtabs" aria-label="Social Platform Sub-Tabs">
        <button
          type="button"
          className={`platform-subtab-btn ${activePlatform === "youtube" ? "is-active" : ""}`}
          onClick={() => setActivePlatform("youtube")}
          data-testid="subtab-youtube"
        >
          <span className="platform-icon-yt">▶</span>
          <span>YouTube</span>
        </button>

        <button
          type="button"
          className={`platform-subtab-btn ${activePlatform === "x" ? "is-active" : ""}`}
          onClick={() => setActivePlatform("x")}
          data-testid="subtab-x"
        >
          <span className="platform-icon-x">𝕏</span>
          <span>X (Twitter)</span>
        </button>

        <button
          type="button"
          className="platform-subtab-btn is-disabled"
          disabled
          data-testid="subtab-facebook"
          title="Facebook support is coming soon"
        >
          <span>Facebook</span>
          <span className="coming-soon-badge">Coming Soon</span>
        </button>

        <button
          type="button"
          className="platform-subtab-btn is-disabled"
          disabled
          data-testid="subtab-tiktok"
          title="TikTok support is coming soon"
        >
          <span>TikTok</span>
          <span className="coming-soon-badge">Coming Soon</span>
        </button>
      </nav>

      {activePlatform === "youtube" ? (
        <div className="social-platform-panel" data-testid="youtube-assets-panel">
          {/* Live Mockup Preview */}
          <SocialProfileMockup
            platform="youtube"
            channelName={channelName}
            channelSlug={channelSlug}
            avatarUrl={youtubeAvatar?.url}
            bannerUrl={youtubeBanner?.url}
          />

          <div className="social-assets-grid">
            <SocialAssetCard
              platform="youtube"
              kind="avatar"
              title="YouTube Profile Avatar"
              recommendedGuidance="Recommended: 800 × 800 px, 1:1 ratio"
              aspectRatio="1/1"
              asset={youtubeAvatar}
              isMutating={isMutating}
              onUpload={(file) => onUploadAsset("youtube", "avatar", file)}
              onDelete={() => onDeleteAsset("youtube", "avatar")}
            />
            <SocialAssetCard
              platform="youtube"
              kind="banner"
              title="YouTube Channel Banner"
              recommendedGuidance="Recommended: 2560 × 1440 px, 16:9 ratio"
              aspectRatio="16/9"
              asset={youtubeBanner}
              isMutating={isMutating}
              onUpload={(file) => onUploadAsset("youtube", "banner", file)}
              onDelete={() => onDeleteAsset("youtube", "banner")}
            />
          </div>
        </div>
      ) : (
        <div className="social-platform-panel" data-testid="x-assets-panel">
          {/* Live Mockup Preview */}
          <SocialProfileMockup
            platform="x"
            channelName={channelName}
            channelSlug={channelSlug}
            avatarUrl={xAvatar?.url}
            bannerUrl={xBanner?.url}
          />

          <div className="social-assets-grid">
            <SocialAssetCard
              platform="x"
              kind="avatar"
              title="X Profile Avatar"
              recommendedGuidance="Recommended: 400 × 400 px, 1:1 ratio"
              aspectRatio="1/1"
              asset={xAvatar}
              isMutating={isMutating}
              onUpload={(file) => onUploadAsset("x", "avatar", file)}
              onDelete={() => onDeleteAsset("x", "avatar")}
            />
            <SocialAssetCard
              platform="x"
              kind="banner"
              title="X Header / Banner"
              recommendedGuidance="Recommended: 1500 × 500 px, 3:1 ratio"
              aspectRatio="3/1"
              asset={xBanner}
              isMutating={isMutating}
              onUpload={(file) => onUploadAsset("x", "banner", file)}
              onDelete={() => onDeleteAsset("x", "banner")}
            />
          </div>
        </div>
      )}
    </section>
  );
}
