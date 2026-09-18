import { GameController, Info } from "@phosphor-icons/react";
import { useTranslation } from "../../../../i18n";

export interface PreviewTabsBarProps {
  activeTab: string;
  onSwitchTab: (tab: "arcade" | "details") => void;
}

export function PreviewTabsBar({ activeTab, onSwitchTab }: PreviewTabsBarProps) {
  const { t } = useTranslation();

  return (
    <div className="qb-inspector-tabs" role="tablist">
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === "arcade"}
        className={`qb-inspector-tab-btn ${activeTab === "arcade" ? "is-active" : ""}`}
        onClick={() => onSwitchTab("arcade")}
      >
        <GameController size={15} />
        <span>{t("questionBank.preview.tabs.arcade")}</span>
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === "details"}
        className={`qb-inspector-tab-btn ${activeTab === "details" ? "is-active" : ""}`}
        onClick={() => onSwitchTab("details")}
      >
        <Info size={15} />
        <span>Details</span>
      </button>
    </div>
  );
}
