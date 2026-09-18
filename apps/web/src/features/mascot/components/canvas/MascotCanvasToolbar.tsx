import React from "react";
import { ArrowsOutSimple } from "@phosphor-icons/react";
import { useTranslation } from "../../../../i18n";

export type CanvasBackgroundMode = "dark" | "light" | "grid" | "clean";

export interface MascotCanvasToolbarProps {
  canvasBackground: CanvasBackgroundMode;
  setCanvasBackground: (mode: CanvasBackgroundMode) => void;
  flipHorizontal: boolean;
  setFlipHorizontal: React.Dispatch<React.SetStateAction<boolean>>;
  canvasZoom: number;
  setCanvasZoom: React.Dispatch<React.SetStateAction<number>>;
}

const BG_MODES: readonly CanvasBackgroundMode[] = ["dark", "light", "grid", "clean"] as const;

export function MascotCanvasToolbar({
  canvasBackground,
  setCanvasBackground,
  flipHorizontal,
  setFlipHorizontal,
  canvasZoom,
  setCanvasZoom,
}: MascotCanvasToolbarProps) {
  const { t } = useTranslation();

  const getBgLabel = (mode: CanvasBackgroundMode): string => {
    switch (mode) {
      case "dark":
        return t("mascots.bgDark");
      case "light":
        return t("mascots.bgLight");
      case "grid":
        return t("mascots.bgGrid");
      case "clean":
        return t("mascots.bgClean");
    }
  };

  const handleToggleZoom = () => {
    setCanvasZoom((prev) => (prev === 1.0 ? 1.25 : prev === 1.25 ? 1.5 : 1.0));
  };

  return (
    <div className="motion-canvas-toolbar">
      <div className="motion-canvas-toolbar-left">
        <div className="motion-bg-toggle-group">
          {BG_MODES.map((mode) => (
            <button
              key={mode}
              type="button"
              className={`motion-bg-btn ${canvasBackground === mode ? "is-active" : ""}`}
              onClick={() => setCanvasBackground(mode)}
            >
              {getBgLabel(mode)}
            </button>
          ))}
        </div>
      </div>

      <div className="motion-canvas-toolbar-right">
        <button
          type="button"
          className={`motion-tool-btn ${flipHorizontal ? "is-active" : ""}`}
          onClick={() => setFlipHorizontal((prev) => !prev)}
          title={t("mascots.canvasFlipTooltip")}
        >
          <span>⇄</span>
        </button>

        <button
          type="button"
          className={`motion-tool-btn ${canvasZoom > 1 ? "is-active" : ""}`}
          onClick={handleToggleZoom}
          title={t("mascots.canvasZoomTooltip")}
        >
          <ArrowsOutSimple size={13} />
          <span>{canvasZoom}x</span>
        </button>
      </div>
    </div>
  );
}
