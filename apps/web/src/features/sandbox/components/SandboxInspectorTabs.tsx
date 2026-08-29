import { Question, SlidersHorizontal, Smiley } from "@phosphor-icons/react";
import { useTranslation } from "../../../i18n";

export interface SandboxInspectorTabsProps {
  activeTab: "design" | "mascot" | "content";
  onTabChange: (tab: "design" | "mascot" | "content") => void;
  mascotEnabled: boolean;
  mascotId: string;
}

export function SandboxInspectorTabs({ activeTab, onTabChange, mascotEnabled, mascotId }: SandboxInspectorTabsProps) {
  const { t } = useTranslation();

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1.2fr 1fr 1fr",
        gap: "3px",
        background: "var(--surface-strong)",
        padding: "3px",
        borderRadius: "10px",
        border: "1px solid var(--line)",
      }}
    >
      <button
        type="button"
        className={activeTab === "design" ? "primary-button compact" : "quiet-button compact"}
        style={{ fontSize: "11px", padding: "6px 4px", justifyContent: "center", borderRadius: "7px" }}
        onClick={() => onTabChange("design")}
      >
        <SlidersHorizontal size={13} weight="bold" />
        <span>{t("visualSandbox.tabElements")}</span>
      </button>
      <button
        type="button"
        className={activeTab === "mascot" ? "primary-button compact" : "quiet-button compact"}
        style={{ fontSize: "11px", padding: "6px 4px", justifyContent: "center", borderRadius: "7px" }}
        onClick={() => onTabChange("mascot")}
      >
        <Smiley size={13} weight="bold" />
        <span>
          {t("visualSandbox.tabMascot")} (
          {mascotEnabled && mascotId !== "none" ? t("visualSandbox.mascotStateOn") : t("visualSandbox.mascotStateOff")})
        </span>
      </button>
      <button
        type="button"
        className={activeTab === "content" ? "primary-button compact" : "quiet-button compact"}
        style={{ fontSize: "11px", padding: "6px 4px", justifyContent: "center", borderRadius: "7px" }}
        onClick={() => onTabChange("content")}
      >
        <Question size={13} weight="bold" />
        <span>{t("visualSandbox.tabContent")}</span>
      </button>
    </div>
  );
}
