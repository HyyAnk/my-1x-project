export type StudioTab = "script" | "assets" | "publishing";

export interface StudioTabItem {
  key: StudioTab;
  label: string;
  ariaLabel: string;
}

export const STUDIO_TABS: readonly StudioTabItem[] = [
  { key: "script", label: "Script", ariaLabel: "Script & Segments" },
  { key: "assets", label: "Assets", ariaLabel: "Assets & Prompts" },
  { key: "publishing", label: "Publishing", ariaLabel: "Publishing Metadata" },
];

export interface StudioTabNavProps {
  activeTab: StudioTab;
  onSelectTab: (tab: StudioTab) => void;
}

export function StudioTabNav({ activeTab, onSelectTab }: StudioTabNavProps) {
  return (
    <nav className="short-reel-nav-tabs" role="tablist" aria-label="Studio View Tabs">
      {STUDIO_TABS.map((tab) => (
        <button
          key={tab.key}
          type="button"
          role="tab"
          aria-label={tab.ariaLabel}
          aria-selected={activeTab === tab.key}
          className={`short-reel-nav-tab ${activeTab === tab.key ? "active" : ""}`}
          onClick={() => onSelectTab(tab.key)}
        >
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
