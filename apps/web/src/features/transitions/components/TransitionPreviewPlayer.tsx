import React, { useEffect } from "react";
import { getTransition, injectTransitionStyles } from "@studio/shared";
import { useTransitionPlayback } from "../hooks/useTransitionPlayback";
import type { TransitionPreviewPlayerProps } from "../types/transitionPreview.types";
import { buildTransitionCssVariables } from "../utils/transitionOverlayRenderer";
import { TransitionOverlay } from "./TransitionOverlay";
import { TransitionPlaybackControls } from "./TransitionPlaybackControls";
import { TransitionSceneA } from "./TransitionSceneA";
import { TransitionSceneB } from "./TransitionSceneB";

/**
 * Reusable Transition Preview Player component.
 * Allows interactive previewing, scrubbing, and freeze-frame inspection
 * of intro/outro and scene transitions across 16:9 widescreen and 9:16 vertical reels.
 */
export const TransitionPreviewPlayer: React.FC<TransitionPreviewPlayerProps> = ({
  transitionType,
  durationSeconds,
  aspectRatio = "16:9",
  autoPlay = false,
  isLooping = false,
  showControls = true,
  themeColors = { from: "#F59E0B", to: "#EF4444" },
  onComplete,
  className = "",
  playTrigger,
  progress,
  onProgressChange,
  isPlaying,
  onPlayingChange,
  onLoopingChange,
}) => {
  // Ensure shared transition motion styles are injected into document head
  useEffect(() => {
    injectTransitionStyles();
  }, []);

  const playback = useTransitionPlayback({
    durationSeconds,
    autoPlay,
    isLooping,
    onComplete,
    playTrigger,
    progress,
    onProgressChange,
    isPlaying,
    onPlayingChange,
    onLoopingChange,
  });

  const transitionDef = getTransition(transitionType);
  const displayName = transitionDef?.name ?? transitionType.replace(/_/g, " ");
  const displayTag = transitionDef?.tag;

  // Opacity handling between Outgoing (A) and Incoming (B) scenes
  const isCrossfade = transitionType === "crossfade";
  const sceneAOpacity = isCrossfade ? Math.max(0, 1 - playback.progress) : playback.progress < 0.5 ? 1 : 0;
  const sceneBOpacity = isCrossfade ? Math.min(1, playback.progress) : playback.progress >= 0.5 ? 1 : 0;

  const viewportVariables = buildTransitionCssVariables(durationSeconds, themeColors);

  return (
    <div className={`transition-preview-player ${className}`} data-aspect-ratio={aspectRatio} data-testid="transition-preview-player">
      {/* Player Header Bar */}
      <div className="transition-player-header">
        <div className="transition-info-group">
          <span className="transition-player-title">{displayName}</span>
          {displayTag && <span className="transition-player-tag">{displayTag}</span>}
        </div>
        <span className="transition-player-duration">{durationSeconds.toFixed(1)}s duration</span>
      </div>

      {/* Main Viewport */}
      <div
        className={`transition-viewport aspect-${aspectRatio.replace(":", "-")}`}
        style={viewportVariables}
        data-testid="transition-preview-viewport"
      >
        <TransitionSceneA aspectRatio={aspectRatio} opacity={sceneAOpacity} themeColor={themeColors.from} />
        <TransitionSceneB aspectRatio={aspectRatio} opacity={sceneBOpacity} themeColor={themeColors.to} />
        <TransitionOverlay
          transitionType={transitionType}
          durationSeconds={durationSeconds}
          progress={playback.progress}
          currentTime={playback.currentTime}
          isPlaying={playback.isPlaying}
          themeColors={themeColors}
        />
      </div>

      {/* Playback Controls */}
      {showControls && (
        <TransitionPlaybackControls
          isPlaying={playback.isPlaying}
          progress={playback.progress}
          currentTime={playback.currentTime}
          durationSeconds={durationSeconds}
          isLooping={playback.isLooping}
          onTogglePlay={playback.togglePlay}
          onReplay={playback.replay}
          onToggleLoop={playback.toggleLoop}
          onSeek={playback.seek}
          onPause={playback.pause}
        />
      )}
    </div>
  );
};
