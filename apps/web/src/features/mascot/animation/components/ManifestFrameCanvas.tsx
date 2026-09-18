import { useEffect, useMemo, useRef } from "react";
import { isMockFixtureIdentifier, resolveAnimationFrameAtTime, type MascotPublishedAnimationAsset } from "@studio/shared";
import { Smiley } from "@phosphor-icons/react";

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
  const atlasImageRef = useRef<HTMLImageElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const rawVideoUrl = animation?.transparent_video_url;
  const videoUrl = rawVideoUrl && !isMockFixtureIdentifier(rawVideoUrl) ? rawVideoUrl : null;
  const validFallbackUrl = fallbackImageUrl && !isMockFixtureIdentifier(fallbackImageUrl) ? fallbackImageUrl : null;

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

    // Only seek video if difference between video.currentTime and timeSeconds is substantial (> 0.08s)
    if (Math.abs(video.currentTime - timeSeconds) > 0.08) {
      const maxTime = video.duration && Number.isFinite(video.duration) ? video.duration : timeSeconds;
      video.currentTime = Math.min(timeSeconds, maxTime);
    }
  }, [timeSeconds, videoUrl]);

  // Preload atlas image
  useEffect(() => {
    if (!animation?.atlas_url) {
      atlasImageRef.current = null;
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = animation.atlas_url;
    img.onload = () => {
      atlasImageRef.current = img;
      drawCanvas();
    };
  }, [animation?.atlas_url]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const img = atlasImageRef.current;
    const frameRect = resolvedFrame?.frame;

    if (img && frameRect) {
      ctx.drawImage(img, frameRect.x, frameRect.y, frameRect.width, frameRect.height, 0, 0, canvas.width, canvas.height);
    }
  };

  useEffect(() => {
    drawCanvas();
  }, [resolvedFrame]);

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

interface CanvasContentProps {
  videoUrl: string | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  animation?: MascotPublishedAnimationAsset | null;
  isLooping?: boolean;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  frameWidth: number;
  frameHeight: number;
  resolvedFrame: ReturnType<typeof resolveAnimationFrameAtTime> | null;
  validFallbackUrl: string | null;
}

function CanvasContent({
  videoUrl,
  videoRef,
  animation,
  isLooping,
  canvasRef,
  frameWidth,
  frameHeight,
  resolvedFrame,
  validFallbackUrl,
}: CanvasContentProps) {
  if (videoUrl) {
    const isVideoLooping = isLooping ?? animation?.loop ?? animation?.state === "thinking";
    return (
      <video
        ref={videoRef}
        src={videoUrl}
        autoPlay
        loop={isVideoLooping}
        muted
        playsInline
        className="manifest-render-video"
        data-testid="manifest-video-element"
        style={{
          maxWidth: "100%",
          maxHeight: "380px",
          objectFit: "contain",
          filter: "drop-shadow(0 16px 32px rgba(0,0,0,0.45))",
        }}
        aria-label={`Transparent WebM Animation (${animation?.frame_count ?? 0} frames, ${animation?.fps ?? 24} FPS)`}
      />
    );
  }

  if (animation?.atlas_url) {
    return (
      <canvas
        ref={canvasRef}
        width={frameWidth}
        height={frameHeight}
        className="manifest-render-canvas"
        data-testid="manifest-canvas-element"
        data-frame-index={resolvedFrame?.frameIndex ?? 0}
        style={{
          maxWidth: "100%",
          maxHeight: "380px",
          objectFit: "contain",
          filter: "drop-shadow(0 16px 32px rgba(0,0,0,0.45))",
        }}
        aria-label={`Frame ${(resolvedFrame?.frameIndex ?? 0) + 1} of ${animation?.frame_count ?? 0}`}
      />
    );
  }

  if (validFallbackUrl) {
    return (
      <img
        src={validFallbackUrl}
        alt="Mascot preview"
        style={{
          maxWidth: "100%",
          maxHeight: "380px",
          objectFit: "contain",
          filter: "drop-shadow(0 16px 32px rgba(0,0,0,0.45))",
        }}
        onError={(e) => {
          e.currentTarget.style.display = "none";
        }}
      />
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "8px",
        color: "var(--muted)",
      }}
    >
      <Smiley size={40} />
      <span style={{ fontSize: "12px" }}>No variant generated</span>
    </div>
  );
}

function FramerateBadge({ animation }: { animation?: MascotPublishedAnimationAsset | null }) {
  const fps = animation?.fps ?? 8;
  return (
    <div
      style={{
        position: "absolute",
        top: "12px",
        right: "12px",
        background: "rgba(15, 23, 42, 0.8)",
        backdropFilter: "blur(6px)",
        padding: "4px 10px",
        borderRadius: "6px",
        fontSize: "11px",
        fontWeight: 700,
        color: "var(--accent, #38bdf8)",
        fontFamily: "monospace",
        border: "1px solid rgba(255,255,255,0.1)",
      }}
      aria-label={`Framerate: ${fps} FPS`}
    >
      {animation?.transparent_video_url ? "WebM Alpha • " : ""}
      {fps} FPS ({Math.round(1000 / fps)}ms/f)
    </div>
  );
}

function FrameReadoutBadge({
  resolvedFrame,
  animation,
}: {
  resolvedFrame: NonNullable<ReturnType<typeof resolveAnimationFrameAtTime>>;
  animation?: MascotPublishedAnimationAsset | null;
}) {
  return (
    <div
      style={{
        position: "absolute",
        bottom: "12px",
        left: "12px",
        background: "rgba(15, 23, 42, 0.8)",
        backdropFilter: "blur(6px)",
        padding: "4px 10px",
        borderRadius: "6px",
        fontSize: "11px",
        fontWeight: 700,
        color: "#cbd5e1",
        fontFamily: "monospace",
        border: "1px solid rgba(255,255,255,0.1)",
      }}
    >
      Frame {resolvedFrame.frameIndex + 1} / {animation?.frame_count ?? 12}
      {resolvedFrame.isClamped ? " (Clamped)" : ""}
      {animation?.duration_ms ? ` • ${(animation.duration_ms / 1000).toFixed(1)}s` : ""}
    </div>
  );
}
