import React from "react";
import { FilmStrip, Sparkle } from "@phosphor-icons/react";
export type SandboxTransitionCategory = "intro_outro" | "scene";

export interface SandboxTransitionCategoryToggleProps {
  activeCategory: SandboxTransitionCategory;
  onChangeCategory: (category: SandboxTransitionCategory) => void;
  disabled?: boolean;
}

export const SandboxTransitionCategoryToggle: React.FC<SandboxTransitionCategoryToggleProps> = ({
  activeCategory,
  onChangeCategory,
  disabled = false,
}) => {
  return (
    <div
      className="sandbox-transition-category-toggle"
      data-testid="sandbox-transition-category-toggle"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "6px",
      }}
    >
      <label
        style={{
          display: "block",
          fontSize: "11px",
          fontWeight: 700,
          color: "var(--muted)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        Category
      </label>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "4px",
          background: "var(--surface-strong)",
          padding: "3px",
          borderRadius: "8px",
          border: "1px solid var(--line)",
        }}
      >
        <button
          type="button"
          data-testid="category-btn-intro_outro"
          className={activeCategory === "intro_outro" ? "primary-button compact" : "quiet-button compact"}
          style={{
            fontSize: "11px",
            padding: "6px 8px",
            justifyContent: "center",
            borderRadius: "6px",
          }}
          onClick={() => onChangeCategory("intro_outro")}
          disabled={disabled}
        >
          <FilmStrip size={14} weight="bold" />
          <span>Intro & Outro</span>
        </button>
        <button
          type="button"
          data-testid="category-btn-scene"
          className={activeCategory === "scene" ? "primary-button compact" : "quiet-button compact"}
          style={{
            fontSize: "11px",
            padding: "6px 8px",
            justifyContent: "center",
            borderRadius: "6px",
          }}
          onClick={() => onChangeCategory("scene")}
          disabled={disabled}
        >
          <Sparkle size={14} weight="bold" />
          <span>In-Scene Questions</span>
        </button>
      </div>
    </div>
  );
};
