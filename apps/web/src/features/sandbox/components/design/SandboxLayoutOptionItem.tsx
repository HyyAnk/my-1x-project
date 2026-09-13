import type { ReactNode } from "react";
import { Check } from "@phosphor-icons/react";
import { useTranslation } from "../../../../i18n";
import type { QuizLayoutUiDefinition } from "../../../quizLayouts/quizLayoutUiCatalog";
import { SandboxLayoutIcon } from "./SandboxLayoutIcon";

export interface SandboxLayoutOptionItemProps {
  layout: QuizLayoutUiDefinition;
  isSelected: boolean;
  onSelect: (layout: QuizLayoutUiDefinition) => void;
  badge?: ReactNode;
}

export function SandboxLayoutOptionItem({
  layout,
  isSelected,
  onSelect,
  badge,
}: SandboxLayoutOptionItemProps) {
  const { t } = useTranslation();

  return (
    <li
      role="option"
      aria-selected={isSelected}
      onClick={() => onSelect(layout)}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "8px 10px",
        borderRadius: "8px",
        background: isSelected ? "var(--soft-accent)" : "transparent",
        color: isSelected ? "var(--accent)" : "var(--text)",
        cursor: "pointer",
        gap: "8px",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "2px", minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <SandboxLayoutIcon
            icon={layout.icon}
            size={16}
            style={{ color: isSelected ? "var(--accent)" : "var(--muted)", flexShrink: 0 }}
          />
          <span style={{ fontSize: "12px", fontWeight: isSelected ? 700 : 500 }}>
            {t(layout.labelKey)}
          </span>
          {badge && (
            <span
              style={{
                fontSize: "10px",
                fontWeight: 600,
                padding: "1px 6px",
                borderRadius: "4px",
                background: isSelected ? "var(--accent)" : "var(--surface-strong)",
                color: isSelected ? "#fff" : "var(--muted)",
                border: "1px solid var(--line)",
              }}
            >
              {badge}
            </span>
          )}
        </div>
        <span
          style={{
            fontSize: "10px",
            color: isSelected ? "var(--accent)" : "var(--muted)",
            paddingLeft: "24px",
            lineHeight: 1.2,
          }}
        >
          {t(layout.descriptionKey)}
        </span>
      </div>
      {isSelected && <Check size={16} style={{ color: "var(--accent)", flexShrink: 0 }} />}
    </li>
  );
}
