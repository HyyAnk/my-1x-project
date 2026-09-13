import { useEffect, useMemo } from "react";
import { CaretDown } from "@phosphor-icons/react";
import { QUIZ_LANDSCAPE_LAYOUT_IDS, getCompatibleQuizLayout, type QuizPreviewLayoutId } from "@studio/shared";
import { useTranslation } from "../../../../i18n";
import { useAccessibleDropdown } from "../../../../hooks/useAccessibleDropdown";
import { QUIZ_LAYOUT_UI_DEFINITIONS, getQuizLayoutUiDefinition, getQuizLayoutUiDefinitions, type QuizLayoutUiDefinition } from "../../../quizLayouts/quizLayoutUiCatalog";
import { SandboxImageRequirements } from "./SandboxImageRequirements";
import { LayoutIcon, SandboxLayoutIcon } from "./SandboxLayoutIcon";
import { SandboxLayoutOptionItem } from "./SandboxLayoutOptionItem";
import { resolveLayoutRequirements } from "./sandboxLayoutRequirements";

import type { SandboxAspectRatio } from "../../hooks/useSandboxViewportState";

export { LayoutIcon, SandboxLayoutIcon };
export const LANDSCAPE_LAYOUT_IDS: readonly QuizPreviewLayoutId[] = QUIZ_LANDSCAPE_LAYOUT_IDS;

export function getCompatibleLayoutForAspectRatio(
  currentLayoutId: QuizPreviewLayoutId,
  aspectRatio: SandboxAspectRatio = "16:9",
): QuizPreviewLayoutId {
  return getCompatibleQuizLayout(currentLayoutId === "baseline" ? "media_left_choices_right" : currentLayoutId, aspectRatio);
}

export interface SandboxLayoutSelectorProps {
  layoutId: QuizPreviewLayoutId;
  setLayoutId: (layout: QuizPreviewLayoutId) => void;
  disabled?: boolean;
  aspectRatio?: SandboxAspectRatio;
}

export function SandboxLayoutSelector({ layoutId, setLayoutId, disabled = false, aspectRatio = "16:9" }: SandboxLayoutSelectorProps) {
  const { t } = useTranslation();
  const availableLayouts = useMemo(() => getQuizLayoutUiDefinitions(aspectRatio), [aspectRatio]);

  useEffect(() => {
    if (!aspectRatio) return;
    const compatible = getCompatibleLayoutForAspectRatio(layoutId, aspectRatio);
    if (compatible !== layoutId) setLayoutId(compatible);
  }, [aspectRatio, layoutId, setLayoutId]);

  const selectedLayout =
    availableLayouts.find((l) => l.id === layoutId) ??
    (layoutId !== "baseline" ? getQuizLayoutUiDefinition(layoutId) : null) ??
    availableLayouts[0] ??
    QUIZ_LAYOUT_UI_DEFINITIONS[0];

  const { isOpen, containerRef, labelId, handleSelect, triggerProps, listboxProps } =
    useAccessibleDropdown<QuizLayoutUiDefinition>({
      items: availableLayouts,
      selectedItem: selectedLayout,
      onSelect: (item) => setLayoutId(item.id),
      disabled,
      isItemEqual: (a, b) => a.id === b.id,
    });

  const requirements = useMemo(() => resolveLayoutRequirements(layoutId), [layoutId]);

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%" }}>
      <label id={labelId} style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>
        {t("visualSandbox.layoutSection")}
      </label>
      <button
        type="button"
        {...triggerProps}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", minHeight: "44px",
          padding: "9px 12px", borderRadius: "10px", background: "var(--surface-strong)",
          border: isOpen ? "2px solid var(--accent)" : "1px solid var(--line)",
          cursor: disabled ? "not-allowed" : "pointer", color: "var(--text)", textAlign: "left", outline: "none", gap: "8px", boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0, overflow: "hidden" }}>
          <SandboxLayoutIcon icon={selectedLayout.icon} size={18} style={{ color: "var(--accent)", flexShrink: 0 }} />
          <span style={{ fontSize: "12px", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {t(selectedLayout.labelKey)}
          </span>
        </div>
        <CaretDown size={14} style={{ color: "var(--muted)", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s ease", flexShrink: 0 }} />
      </button>
      {isOpen && (
        <ul {...listboxProps} style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 100, margin: 0, padding: "4px", listStyle: "none", borderRadius: "10px", background: "var(--surface)", border: "1px solid var(--line)", boxShadow: "0 8px 24px rgba(0, 0, 0, 0.28)", display: "flex", flexDirection: "column", gap: "2px", maxHeight: "260px", overflowY: "auto" }}>
          {availableLayouts.map((layout) => (
            <SandboxLayoutOptionItem key={layout.id} layout={layout} isSelected={layoutId === layout.id} onSelect={handleSelect} />
          ))}
        </ul>
      )}
      <div style={{ marginTop: "4px", fontSize: "11px", color: "var(--muted)", lineHeight: 1.3 }}>
        {t(selectedLayout.descriptionKey)}
      </div>
      {requirements.length > 0 && <SandboxImageRequirements requirements={requirements} />}
    </div>
  );
}
