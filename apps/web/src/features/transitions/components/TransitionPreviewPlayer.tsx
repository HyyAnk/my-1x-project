import React, { useState } from "react";
import type { TransitionPreviewSource, TransitionSelection } from "@studio/shared";
import type { TransitionAspectRatio } from "../types/transitionPreview.types";
import { useTransitionCatalog } from "../hooks/useTransitionCatalog";
import { useTransitionPreview } from "../hooks/useTransitionPreview";
import { useTransitionTransport } from "../hooks/useTransitionTransport";
import { TransitionTransport } from "./TransitionTransport";
import { TransitionTimingPanel } from "./TransitionTimingPanel";
import { TransitionPreviewStatus } from "./TransitionPreviewStatus";

export type TransitionPreviewPlayerProps = {
  transitionType: string;
  durationSeconds?: number;
  aspectRatio?: TransitionAspectRatio;
  autoPlay?: boolean;
  isLooping?: boolean;
  showControls?: boolean;
  onComplete?: () => void;
  className?: string;
  source?: TransitionPreviewSource;
  onTransitionChange?: (id: string) => void;
  onDurationChange?: (duration: number) => void;
  playTrigger?: number;
  progress?: number;
  onProgressChange?: (progress: number) => void;
  isPlaying?: boolean;
  onPlayingChange?: (isPlaying: boolean) => void;
  onLoopingChange?: (isLooping: boolean) => void;
  onTogglePlay?: () => void;
  onReplay?: () => void;
  onToggleLoop?: () => void;
  themeColors?: { from?: string; to?: string };
};

export const TransitionPreviewPlayer: React.FC<TransitionPreviewPlayerProps> = ({
  transitionType,
  durationSeconds,
  aspectRatio = "16:9",
  autoPlay = false,
  isLooping = false,
  showControls = true,
  onComplete,
  className = "",
  source,
  onDurationChange,
  playTrigger,
  themeColors,
}) => {
  const [isTimingOpen, setIsTimingOpen] = useState<boolean>(false);
  const [isInspectNative, setIsInspectNative] = useState<boolean>(false);

  const { catalog, entries } = useTransitionCatalog();

  const selectedDef = entries.find((e) => e.id === transitionType);
  const effectiveDuration = durationSeconds ?? selectedDef?.defaultDurationSeconds ?? 0.8;

  const defaultSource: TransitionPreviewSource = {
    kind: "sample",
    sampleRevision: catalog?.sampleRevision ?? "sample-v1",
    sandboxInput: {
      aspect_ratio: "16:9",
      theme: "candy_arcade",
      palette_id: "lime",
    },
  };

  const effectiveSource = source ?? defaultSource;

  const selection: TransitionSelection = {
    id: transitionType,
    durationSeconds: transitionType === "cut" ? 0 : effectiveDuration,
  };

  const preview = useTransitionPreview({
    selection,
    source: effectiveSource,
    catalogRevision: catalog?.revision,
  });

  const transport = useTransitionTransport({
    artifact: preview.artifact,
    autoPlay,
    isLooping,
    onComplete,
    playTrigger,
  });

  const handleResetDuration = () => {
    if (selectedDef && onDurationChange) {
      onDurationChange(selectedDef.defaultDurationSeconds);
    }
  };

  const resolvedInst = preview.artifact?.manifest.instances.find((i) => i.id === transitionType);

  return (
    <div
      className={`transition-preview-player ${className}`}
      data-aspect-ratio={aspectRatio}
      data-testid="transition-preview-player"
    >
      {/* Viewport container */}
      <div
        className={`transition-viewport-wrapper aspect-${aspectRatio.replace(":", "-")} ${
          isInspectNative ? "inspect-native-mode" : ""
        }`}
        data-testid="transition-preview-viewport"
        style={
          themeColors
            ? ({
                "--from": themeColors.from,
                "--to": themeColors.to,
              } as React.CSSProperties)
            : undefined
        }
      >
        {/* Real server-rendered MP4 video */}
        {preview.artifact?.videoUrl && (
          <video
            ref={transport.videoRef}
            src={preview.artifact.videoUrl}
            className={`transition-video-element ${
              !transport.isPlaying && transport.authoritativePngUrl ? "video-paused-behind" : ""
            }`}
            playsInline
            muted
            data-testid="transition-video"
          />
        )}

        {/* Authoritative exact paused frame PNG layer */}
        {!transport.isPlaying && transport.authoritativePngUrl && (
          <img
            src={transport.authoritativePngUrl}
            className="authoritative-frame-layer"
            alt={`Authoritative frame ${transport.currentFrameIndex + 1}`}
            data-testid="authoritative-frame-image"
          />
        )}

        {/* Status pill & feedback */}
        <TransitionPreviewStatus
          state={preview.state}
          isStale={preview.isStale}
          onRetry={preview.retry}
          isSampleSource={effectiveSource.kind === "sample"}
        />
      </div>

      {/* Timing adjustment panel (secondary, collapsible) */}
      {isTimingOpen && selectedDef && selectedDef.id !== "cut" && (
        <TransitionTimingPanel
          definition={selectedDef}
          currentDurationSeconds={effectiveDuration}
          effectiveDurationSeconds={resolvedInst?.effectiveDurationSeconds}
          onDurationChange={(d) => onDurationChange?.(d)}
          onReset={handleResetDuration}
        />
      )}

      {/* Primary transport bar */}
      {showControls && (
        <TransitionTransport
          transport={transport}
          onToggleTiming={() => setIsTimingOpen(!isTimingOpen)}
          isTimingOpen={isTimingOpen}
          videoUrl={preview.artifact?.videoUrl}
          onInspectNative={() => setIsInspectNative(!isInspectNative)}
        />
      )}
    </div>
  );
};
