import { useEffect, useMemo, useRef } from "react";
import {
  isMockFixtureIdentifier,
  resolveAnimationFrameAtTime,
  type MascotPublishedAnimationAsset,
} from "@studio/shared";
import {
  CanvasContent,
  FramerateBadge,
  FrameReadoutBadge,
  useCanvasAtlasDrawer,
} from "./frameCanvas";

export interface ManifestFrameCanvasProps {
  animation?: MascotPublishedAnimationAsset | null;
  fallbackImageUrl?: string;
  timeSeconds: number;
  isPlaying?: boolean;
  isLooping?: boolean;
  canvasBackground: "dark" | "light" | "grid" | "clean";
  canvasZoom?: number;
  flipHorizontal?: boolean;
}

export function ManifestFrameCanvas({
  animation,
  fallbackImageUrl,
  timeSeconds,
  isPlaying,
  isLooping,
  canvasBackground,
  canvasZoom = 1.0,
  flipHorizontal = false,
}: ManifestFrameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const rawVideoUrl = animation?.transparent_video_url;
  const videoUrl = rawVideoUrl && !isMockFixtureIdentifier(rawVideoUrl) ? rawVideoUrl : null;
  const validFallbackUrl =
    fallbackImageUrl && !isMockFixtureIdentifier(fallbackImageUrl) ? fallbackImageUrl : null;

  const resolvedFrame = useMemo(() => {
    if (!animation) return null;
    return resolveAnimationFrameAtTime(animation, timeSeconds);
  }, [animation, timeSeconds]);

  // Sync transparent video playback and seeking
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;

    if (isPlaying !== undefined) {
      if (isPlaying) {
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    }
  }, [isPlaying, videoUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;

    if (isLooping !== undefined) {
      video.loop = Boolean(isLooping);
    }
  }, [isLooping, videoUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;

    // Calculate effective cycle for seamless looping seek
    const cycle = video.duration && Number.isFinite(video.duration) && video.duration > 0
      ? video.duration
      : (animation?.frame_count && animation?.fps && animation.fps > 0 ? animation.frame_count / animation.fps : 0);

    const targetTime = isLooping && cycle > 0 ? timeSeconds % cycle : (cycle > 0 ? Math.min(timeSeconds, cycle) : timeSeconds);

    // Only seek video if difference between video.currentTime and targetTime is substantial (> 0.04s)
    if (Math.abs(video.currentTime - targetTime) > 0.04) {
      video.currentTime = targetTime;
    }
  }, [timeSeconds, videoUrl, isLooping, animation]);

  // Handle atlas preloading and 2D frame drawing
  useCanvasAtlasDrawer({
    animation,
    resolvedFrame,
    canvasRef,
  });

  const frameWidth = resolvedFrame?.frame.width ?? 512;
  const frameHeight = resolvedFrame?.frame.height ?? 512;

  return (
    <div
      className={`manifest-frame-canvas-viewport theme-${canvasBackground}`}
      data-testid="manifest-frame-canvas"
      style={{
        position: "relative",
        width: "100%",
        minHeight: "420px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "var(--radius, 12px)",
        overflow: "hidden",
        border: "1px solid var(--line, rgba(255,255,255,0.08))",
      }}
    >
      <div
        className="canvas-content-wrapper"
        style={{
          transform: `scale(${canvasZoom}) scaleX(${flipHorizontal ? -1 : 1})`,
          transformOrigin: "center center",
          transition: "transform 0.15s ease",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CanvasContent
          videoUrl={videoUrl}
          videoRef={videoRef}
          animation={animation}
          isLooping={isLooping}
          canvasRef={canvasRef}
          frameWidth={frameWidth}
          frameHeight={frameHeight}
          resolvedFrame={resolvedFrame}
          validFallbackUrl={validFallbackUrl}
        />
      </div>

      <FramerateBadge animation={animation} />

      {resolvedFrame && <FrameReadoutBadge resolvedFrame={resolvedFrame} animation={animation} />}
    </div>
  );
}
