import React from "react";
import { ArrowsOutSimple, Monitor, SquaresFour } from "@phosphor-icons/react";

export type CanvasBackgroundMode = "dark" | "light" | "grid" | "clean";

export interface MascotMotionStepToolbarProps {
  canvasBackground: CanvasBackgroundMode;
  setCanvasBackground: (bg: CanvasBackgroundMode) => void;
  flipHorizontal: boolean;
  setFlipHorizontal: React.Dispatch<React.SetStateAction<boolean>>;
  canvasZoom: number;
  setCanvasZoom: React.Dispatch<React.SetStateAction<number>>;
  previewMode?: "canvas" | "stage";
  onChangePreviewMode?: (mode: "canvas" | "stage") => void;
  showContactSheet?: boolean;
  onToggleContactSheet?: () => void;
}

const BG_OPTIONS: readonly CanvasBackgroundMode[] = ["dark", "light", "grid", "clean"] as const;

export function MascotMotionStepToolbar({
  canvasBackground,
  setCanvasBackground,
  flipHorizontal,
  setFlipHorizontal,
  canvasZoom,
  setCanvasZoom,
  previewMode,
  onChangePreviewMode,
  showContactSheet,
  onToggleContactSheet,
}: MascotMotionStepToolbarProps) {
  const handleToggleZoom = () => {
    setCanvasZoom((prev) => (prev === 1.0 ? 1.25 : prev === 1.25 ? 1.5 : 1.0));
  };

  return (
    <div
      className="step4-viewport-toolbar"
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "8px",
        padding: "8px 12px",
        background: "var(--surface, #1e293b)",
        border: "1px solid var(--line, rgba(255,255,255,0.08))",
        borderRadius: "var(--radius, 10px)",
        fontSize: "12px",
      }}
    >
      {/* Background Mode Toggles */}
      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
        <span style={{ fontSize: "11px", color: "var(--muted)", marginRight: "4px" }}>Backdrop:</span>
        {BG_OPTIONS.map((bg) => (
          <button
            key={bg}
            type="button"
            className={`quiet-button compact ${canvasBackground === bg ? "is-active" : ""}`}
            style={{
              fontSize: "11px",
              padding: "3px 8px",
              textTransform: "capitalize",
              color: canvasBackground === bg ? "var(--accent)" : undefined,
            }}
            onClick={() => setCanvasBackground(bg)}
          >
            {bg}
          </button>
        ))}
      </div>

      {/* Optional Mode & Contact Sheet Controls (if provided in toolbar context) */}
      {(onChangePreviewMode || onToggleContactSheet) && (
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {onChangePreviewMode && previewMode && (
            <>
              <button
                type="button"
                className={`quiet-button compact ${previewMode === "canvas" ? "is-active" : ""}`}
                style={{ fontSize: "11px", padding: "3px 8px" }}
                onClick={() => onChangePreviewMode("canvas")}
                title="Studio Canvas View"
                data-testid="toolbar-mode-canvas-btn"
              >
                <SquaresFour size={12} weight={previewMode === "canvas" ? "fill" : "regular"} />
                <span>Canvas</span>
              </button>
              <button
                type="button"
                className={`quiet-button compact ${previewMode === "stage" ? "is-active" : ""}`}
                style={{ fontSize: "11px", padding: "3px 8px" }}
                onClick={() => onChangePreviewMode("stage")}
                title="Quiz Stage View (16:9)"
                data-testid="toolbar-mode-stage-btn"
              >
                <Monitor size={12} weight={previewMode === "stage" ? "fill" : "regular"} />
                <span>Stage</span>
              </button>
            </>
          )}

          {onToggleContactSheet && (
            <button
              type="button"
              className={`quiet-button compact ${showContactSheet ? "is-active" : ""}`}
              style={{ fontSize: "11px", padding: "3px 8px" }}
              onClick={onToggleContactSheet}
              title="Toggle Contact Sheet"
              data-testid="toolbar-toggle-contact-sheet-btn"
            >
              <span>{showContactSheet ? "Hide Sheet" : "Sheet"}</span>
            </button>
          )}
        </div>
      )}

      {/* Zoom and Flip Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <button
          type="button"
          className={`quiet-button compact ${flipHorizontal ? "is-active" : ""}`}
          style={{ fontSize: "11px", padding: "3px 8px" }}
          onClick={() => setFlipHorizontal((prev) => !prev)}
          title="Flip Horizontal (⇄)"
        >
          <span>⇄ Flip</span>
        </button>

        <button
          type="button"
          className={`quiet-button compact ${canvasZoom > 1 ? "is-active" : ""}`}
          style={{ fontSize: "11px", padding: "3px 8px" }}
          onClick={handleToggleZoom}
          title="Zoom Toggle"
        >
          <ArrowsOutSimple size={12} />
          <span>{canvasZoom}x</span>
        </button>
      </div>
    </div>
  );
}
