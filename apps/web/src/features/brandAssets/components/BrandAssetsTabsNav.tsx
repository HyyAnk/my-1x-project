import {
  Image as ImageIcon,
  ShareNetwork,
  Sparkle,
} from "@phosphor-icons/react";

export interface BrandAssetsTabsNavProps {
  currentTab: string;
  onTabChange?: (tab: string) => void;
  artCount: number;
}

export function BrandAssetsTabsNav({
  currentTab,
  onTabChange,
  artCount,
}: BrandAssetsTabsNavProps) {
  return (
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
  );
}
