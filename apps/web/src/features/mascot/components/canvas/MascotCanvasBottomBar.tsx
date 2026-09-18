import React from "react";
import { Pause, Play } from "@phosphor-icons/react";
import type { MascotActionType, MascotProfile } from "@studio/shared";
import { useTranslation } from "../../../../i18n";
import { CORE_GAMEPLAY_ACTIONS, getLocalizedActionMeta } from "../../constants";

export interface MascotCanvasBottomBarProps {
  isPlaying: boolean;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  editingMascot: MascotProfile | null;
  activePreviewAction: MascotActionType;
  setActivePreviewAction: (action: MascotActionType) => void;
  variantCounts?: Partial<Record<MascotActionType, number>>;
}

export function MascotCanvasBottomBar({
  isPlaying,
  setIsPlaying,
  editingMascot,
  activePreviewAction,
  setActivePreviewAction,
  variantCounts,
}: MascotCanvasBottomBarProps) {
  const { t } = useTranslation();

  return (
    <div className="motion-canvas-bottom-bar">
      <div className="motion-canvas-play-row">
        <button type="button" className={`motion-play-btn ${isPlaying ? "is-playing" : ""}`} onClick={() => setIsPlaying((prev) => !prev)}>
          {isPlaying ? <Pause size={14} weight="fill" /> : <Play size={14} weight="fill" />}
          <span>{isPlaying ? t("mascots.playbackPause") : t("mascots.playbackPlay")}</span>
        </button>

        <div className="motion-play-status-pill">
          <span className={`motion-play-status-dot ${isPlaying ? "active" : ""}`} />
          <span>{isPlaying ? "Live Motion Active" : "Paused"}</span>
        </div>
      </div>

      <div className="motion-quick-pose-strip">
        {CORE_GAMEPLAY_ACTIONS.map((action) => {
          const meta = getLocalizedActionMeta(action, t);
          const isReady = Boolean(
            editingMascot?.render_bundle?.assets?.actions?.[action]?.image_url || editingMascot?.actions?.[action]?.sprite_url,
          );
          const isSelected = activePreviewAction === action;
          const variantCount = variantCounts?.[action];

          return (
            <button
              key={action}
              type="button"
              className={`motion-quick-pose-btn ${isSelected ? "is-selected" : ""}`}
              onClick={() => setActivePreviewAction(action)}
            >
              <span>{meta.icon}</span>
              <span>{meta.label.split(" ")[0]}</span>
              {typeof variantCount === "number" && variantCount > 0 && <span className="pose-variant-count">{variantCount}</span>}
              <span className={`pose-status-dot ${isReady ? "ready" : ""}`} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
