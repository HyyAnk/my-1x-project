import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { CaretDown, Check, ListDashes, ListNumbers, SquareSplitHorizontal, type IconProps } from "@phosphor-icons/react";
import { QUIZ_PORTRAIT_LAYOUT_IDS, type QuizPreviewLayoutId, type ResolvedQuizLayoutId } from "@studio/shared";
import { useTranslation } from "../../../../i18n";
import {
  QUIZ_LAYOUT_UI_DEFINITIONS,
  getQuizLayoutUiDefinition,
  type QuizLayoutUiDefinition,
} from "../../../quizLayouts/quizLayoutUiCatalog";

export const PORTRAIT_LAYOUT_IDS: readonly QuizPreviewLayoutId[] = QUIZ_PORTRAIT_LAYOUT_IDS;

export const LANDSCAPE_LAYOUT_IDS: readonly QuizPreviewLayoutId[] = [
  "media_left_choices_right",
  "visual_choices_three",
  "visual_choices_three_pure",
  "split_versus_two",
  "verdict_true_false",
  "full_stack_list",
  "mystery_reveal",
  "clue_deduction",
];

export function getCompatibleLayoutForAspectRatio(
  currentLayoutId: QuizPreviewLayoutId,
  targetAspectRatio: "16:9" | "9:16",
): QuizPreviewLayoutId {
  if (targetAspectRatio === "9:16") {
    if (PORTRAIT_LAYOUT_IDS.includes(currentLayoutId)) {
      return currentLayoutId;
    }
    switch (currentLayoutId) {
      case "split_versus_two":
        return "portrait_split_versus";
      case "verdict_true_false":
        return "portrait_verdict_tf";
      case "full_stack_list":
        return "portrait_stack_list";
      default:
        return "portrait_hero_choices";
    }
  } else {
    if (LANDSCAPE_LAYOUT_IDS.includes(currentLayoutId)) {
      return currentLayoutId;
    }
    switch (currentLayoutId) {
      case "portrait_split_versus":
        return "split_versus_two";
      case "portrait_verdict_tf":
        return "verdict_true_false";
      case "portrait_stack_list":
        return "full_stack_list";
      default:
        return "media_left_choices_right";
    }
  }
}

export interface SandboxLayoutSelectorProps {
  layoutId: QuizPreviewLayoutId;
  setLayoutId: (layout: QuizPreviewLayoutId) => void;
  disabled?: boolean;
  aspectRatio?: "16:9" | "9:16";
}

function LayoutIcon({ icon, size = 18, ...props }: { icon: QuizLayoutUiDefinition["icon"]; size?: number } & IconProps) {
  switch (icon) {
    case "split":
      return <SquareSplitHorizontal size={size} {...props} />;
    case "visual":
      return <ListNumbers size={size} {...props} />;
    case "stack":
      return <ListDashes size={size} {...props} />;
    default:
      return <SquareSplitHorizontal size={size} {...props} />;
  }
}

export function SandboxLayoutSelector({
  layoutId,
  setLayoutId,
  disabled = false,
  aspectRatio = "16:9",
}: SandboxLayoutSelectorProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const labelId = useId();

  const availableLayouts = useMemo(() => {
    if (aspectRatio === "9:16") {
      return QUIZ_LAYOUT_UI_DEFINITIONS.filter((layout) =>
        PORTRAIT_LAYOUT_IDS.includes(layout.id),
      );
    }
    return QUIZ_LAYOUT_UI_DEFINITIONS.filter((layout) =>
      LANDSCAPE_LAYOUT_IDS.includes(layout.id),
    );
  }, [aspectRatio]);

  useEffect(() => {
    if (!aspectRatio) return;
    const compatible = getCompatibleLayoutForAspectRatio(layoutId, aspectRatio);
    if (compatible !== layoutId) {
      setLayoutId(compatible);
    }
  }, [aspectRatio, layoutId, setLayoutId]);

  const selectedLayout =
    availableLayouts.find((l) => l.id === layoutId) ??
    (layoutId !== "baseline" ? getQuizLayoutUiDefinition(layoutId as ResolvedQuizLayoutId) : null) ??
    availableLayouts[0] ??
    QUIZ_LAYOUT_UI_DEFINITIONS[0];

  const handleSelect = useCallback(
    (id: QuizPreviewLayoutId) => {
      setLayoutId(id);
      setIsOpen(false);
    },
    [setLayoutId],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return;
      if (e.key === "Escape") {
        setIsOpen(false);
      } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          const currentIndex = availableLayouts.findIndex((l) => l.id === selectedLayout.id);
          const activeIndex = currentIndex >= 0 ? currentIndex : 0;
          const nextIndex =
            e.key === "ArrowDown"
              ? (activeIndex + 1) % availableLayouts.length
              : (activeIndex - 1 + availableLayouts.length) % availableLayouts.length;
          handleSelect(availableLayouts[nextIndex].id);
        }
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    },
    [availableLayouts, disabled, handleSelect, isOpen, selectedLayout.id],
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%" }}>
      <label
        id={labelId}
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

      <button
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-labelledby={labelId}
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          minHeight: "44px",
          padding: "9px 12px",
          borderRadius: "10px",
          background: "var(--surface-strong)",
          border: isOpen ? "2px solid var(--accent)" : "1px solid var(--line)",
          cursor: disabled ? "not-allowed" : "pointer",
          color: "var(--text)",
          textAlign: "left",
          outline: "none",
          gap: "8px",
          boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0, overflow: "hidden" }}>
          <LayoutIcon icon={selectedLayout.icon} size={18} style={{ color: "var(--accent)", flexShrink: 0 }} />
          <span
            style={{
              fontSize: "12px",
              fontWeight: 600,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {t(selectedLayout.sandboxLabelKey)}
          </span>
        </div>
        <CaretDown
          size={14}
          style={{
            color: "var(--muted)",
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.15s ease",
            flexShrink: 0,
          }}
        />
      </button>

      {isOpen && (
        <ul
          id={listboxId}
          role="listbox"
          aria-labelledby={labelId}
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 100,
            margin: 0,
            padding: "4px",
            listStyle: "none",
            borderRadius: "10px",
            background: "var(--surface)",
            border: "1px solid var(--line)",
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.28)",
            display: "flex",
            flexDirection: "column",
            gap: "2px",
            maxHeight: "260px",
            overflowY: "auto",
          }}
        >
          {availableLayouts.map((layout) => {
            const isSelected = layoutId === layout.id;
            return (
              <li
                key={layout.id}
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(layout.id)}
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
                    <LayoutIcon
                      icon={layout.icon}
                      size={16}
                      style={{ color: isSelected ? "var(--accent)" : "var(--muted)", flexShrink: 0 }}
                    />
                    <span style={{ fontSize: "12px", fontWeight: isSelected ? 700 : 500 }}>{t(layout.sandboxLabelKey)}</span>
                  </div>
                  <span
                    style={{
                      fontSize: "10px",
                      color: isSelected ? "var(--accent)" : "var(--muted)",
                      paddingLeft: "24px",
                      lineHeight: 1.2,
                    }}
                  >
                    {t(layout.sandboxDescriptionKey)}
                  </span>
                </div>
                {isSelected && <Check size={16} style={{ color: "var(--accent)", flexShrink: 0 }} />}
              </li>
            );
          })}
        </ul>
      )}

      <div
        style={{
          marginTop: "4px",
          fontSize: "11px",
          color: "var(--muted)",
          lineHeight: 1.3,
        }}
      >
        {t(selectedLayout.sandboxDescriptionKey)}
      </div>
    </div>
  );
}
