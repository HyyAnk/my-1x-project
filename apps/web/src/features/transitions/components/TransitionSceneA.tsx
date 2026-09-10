import React from "react";
import type { TransitionAspectRatio } from "../types/transitionPreview.types";

export interface TransitionSceneAProps {
  aspectRatio: TransitionAspectRatio;
  opacity: number;
  themeColor?: string;
}

/**
 * Scene A: Outgoing Scene mockup (Intro video card).
 */
export const TransitionSceneA: React.FC<TransitionSceneAProps> = ({ aspectRatio, opacity, themeColor = "#F59E0B" }) => {
  const isVertical = aspectRatio === "9:16";

  return (
    <div
      className="transition-scene transition-scene-a"
      style={{
        opacity,
        background: "linear-gradient(145deg, #1e1b4b 0%, #0f172a 100%)",
        borderColor: `${themeColor}40`,
      }}
      data-testid="transition-scene-a"
    >
      <div className="scene-content">
        <span className="scene-badge" style={{ background: `${themeColor}25`, color: themeColor }}>
          Outgoing Scene &bull; Intro
        </span>

        <div className="scene-card intro-mockup">
          <div className="scene-icon-glow" style={{ color: themeColor }}>
            ✦
          </div>
          <h2 className={isVertical ? "scene-title-vertical" : "scene-title"}>Quiz Challenge!</h2>
          <p className="scene-subtitle">Get ready to test your knowledge</p>
        </div>

        <div className="scene-footer-meta">
          <span>Intro Sequence</span>
          <span>&bull;</span>
          <span>{isVertical ? "9:16 Reel" : "16:9 Widescreen"}</span>
        </div>
      </div>
    </div>
  );
};
