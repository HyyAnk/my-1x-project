import React from "react";
import type { TransitionAspectRatio } from "../types/transitionPreview.types";

export interface TransitionSceneBProps {
  aspectRatio: TransitionAspectRatio;
  opacity: number;
  themeColor?: string;
}

/**
 * Scene B: Incoming Scene mockup (Question 1 card).
 */
export const TransitionSceneB: React.FC<TransitionSceneBProps> = ({ aspectRatio, opacity, themeColor = "#10B981" }) => {
  const isVertical = aspectRatio === "9:16";

  return (
    <div
      className="transition-scene transition-scene-b"
      style={{
        opacity,
        background: "linear-gradient(145deg, #064e3b 0%, #0f172a 100%)",
        borderColor: `${themeColor}40`,
      }}
      data-testid="transition-scene-b"
    >
      <div className="scene-content">
        <span className="scene-badge" style={{ background: `${themeColor}25`, color: themeColor }}>
          Incoming Scene &bull; Question 1
        </span>

        <div className="scene-card question-mockup">
          <span className="question-counter">QUESTION 1 / 10</span>
          <h2 className={isVertical ? "scene-title-vertical" : "scene-title"}>What is the capital of France?</h2>

          <div className={`mockup-choices ${isVertical ? "choices-vertical" : ""}`}>
            <div className="choice-chip is-correct">
              <span className="choice-letter">A</span>
              <span>Paris</span>
            </div>
            <div className="choice-chip">
              <span className="choice-letter">B</span>
              <span>London</span>
            </div>
            <div className="choice-chip">
              <span className="choice-letter">C</span>
              <span>Berlin</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
