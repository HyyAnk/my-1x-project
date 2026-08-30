import { ListNumbers, SquareSplitHorizontal } from "@phosphor-icons/react";
import type { QuizPreviewLayoutId } from "@studio/shared";
import { useTranslation } from "../../../../i18n";
import { QUIZ_LAYOUT_UI_DEFINITIONS } from "../../../quizLayouts/quizLayoutUiCatalog";

export interface SandboxLayoutSelectorProps {
  layoutId: QuizPreviewLayoutId;
  setLayoutId: (layout: QuizPreviewLayoutId) => void;
}

export function SandboxLayoutSelector({ layoutId, setLayoutId }: SandboxLayoutSelectorProps) {
  const { t } = useTranslation();

  return (
    <div>
      <label
        style={{
          display: "block",
          fontSize: "11px",
          fontWeight: 700,
          color: "var(--muted)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: "6px",
        }}
      >
        {t("visualSandbox.layoutSection")}
      </label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
        {QUIZ_LAYOUT_UI_DEFINITIONS.map((layout) => {
          const active = layoutId === layout.id;
          return (
            <button
              key={layout.id}
              type="button"
              onClick={() => setLayoutId(layout.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 10px",
                borderRadius: "10px",
                background: active ? "var(--soft-accent)" : "var(--surface-strong)",
                border: active ? "2px solid var(--accent)" : "1px solid var(--line)",
                cursor: "pointer",
                fontSize: "11px",
                fontWeight: active ? 700 : 500,
                color: active ? "var(--accent)" : "var(--text)",
                textAlign: "left",
              }}
            >
              {layout.icon === "split" ? <SquareSplitHorizontal size={18} /> : <ListNumbers size={18} />}
              <span style={{ minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {t(layout.sandboxLabelKey)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
