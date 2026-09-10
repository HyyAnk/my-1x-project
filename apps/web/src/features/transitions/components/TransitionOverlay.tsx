import React from "react";
import type { TransitionThemeColors } from "../types/transitionPreview.types";
import { renderTransitionOverlay } from "../utils/transitionOverlayRenderer";

export interface TransitionOverlayProps {
  transitionType: string;
  durationSeconds: number;
  progress: number;
  currentTime: number;
  isPlaying: boolean;
  themeColors?: TransitionThemeColors;
}

/**
 * Overlay component hosting the transition animation layer.
 */
export const TransitionOverlay: React.FC<TransitionOverlayProps> = ({
  transitionType,
  durationSeconds,
  progress,
  currentTime,
  isPlaying,
  themeColors,
}) => {
  return (
    <>
      {renderTransitionOverlay({
        transitionType,
        durationSeconds,
        progress,
        currentTime,
        isPlaying,
        themeColors,
      })}
    </>
  );
};
