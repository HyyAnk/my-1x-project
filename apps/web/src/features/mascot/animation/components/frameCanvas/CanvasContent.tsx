import { Smiley } from "@phosphor-icons/react";
import type { MascotPublishedAnimationAsset, resolveAnimationFrameAtTime } from "@studio/shared";

export interface CanvasContentProps {
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

export function CanvasContent({
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
