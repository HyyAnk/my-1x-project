import { useTranslation } from "../../../../i18n";

export type PresetFilterTab = "all" | "custom" | "builtin";

export interface PresetManagerFilterTabsProps {
  filterTab: PresetFilterTab;
  onChangeTab: (tab: PresetFilterTab) => void;
  allCount: number;
  customCount: number;
  builtInCount: number;
}

export function PresetManagerFilterTabs({ filterTab, onChangeTab, allCount, customCount, builtInCount }: PresetManagerFilterTabsProps) {
  const { t } = useTranslation();

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom: "1px solid var(--line)",
        paddingBottom: "12px",
        marginBottom: "14px",
      }}
    >
      <div style={{ display: "flex", gap: "6px" }}>
        {(["all", "custom", "builtin"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            className={`tab-button compact ${filterTab === tab ? "active" : ""}`}
            onClick={() => onChangeTab(tab)}
            style={{
              padding: "4px 12px",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: filterTab === tab ? 700 : 500,
              background: filterTab === tab ? "var(--surface-strong)" : "transparent",
              color: filterTab === tab ? "var(--text)" : "var(--muted)",
              border: filterTab === tab ? "1px solid var(--line)" : "1px solid transparent",
              cursor: "pointer",
            }}
          >
            {tab === "all"
              ? `${t("visualSandbox.tabAllPresets")} (${allCount})`
              : tab === "custom"
                ? `${t("visualSandbox.tabCustomPresets")} (${customCount})`
                : `${t("visualSandbox.tabBuiltInPresets")} (${builtInCount})`}
          </button>
        ))}
      </div>
    </div>
  );
}
