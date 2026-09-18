import { useCallback, type KeyboardEvent } from "react";

export interface MascotAnimationPlaybackControls {
  togglePlay: () => void;
  stepBackward: () => void;
  stepForward: () => void;
}

export interface UseMascotAnimationHotkeysOptions {
  playback: MascotAnimationPlaybackControls;
  enabled?: boolean;
}

export interface UseMascotAnimationHotkeysReturn {
  handleKeyDown: (e: KeyboardEvent<HTMLDivElement>) => void;
}

/**
 * Custom hook handling keyboard navigation and playback controls for the mascot animation step.
 * - Space: Toggle play/pause
 * - ArrowLeft: Step backward one frame
 * - ArrowRight: Step forward one frame
 */
export function useMascotAnimationHotkeys(
  optionsOrPlayback: UseMascotAnimationHotkeysOptions | MascotAnimationPlaybackControls,
): UseMascotAnimationHotkeysReturn {
  const playback = "playback" in optionsOrPlayback ? optionsOrPlayback.playback : optionsOrPlayback;
  const enabled = "enabled" in optionsOrPlayback ? (optionsOrPlayback.enabled ?? true) : true;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (!enabled) return;

      if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        playback.togglePlay();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        playback.stepBackward();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        playback.stepForward();
      }
    },
    [playback, enabled],
  );

  return { handleKeyDown };
}
