import { useMemo } from "react";
import {
  isMockFixtureIdentifier,
  resolveAnimationFrameAtTime,
  type MascotPublishedAnimationAsset,
  type MascotPlacementV2,
} from "@studio/shared";

export interface StageMascotOverlayProps {
  animation?: MascotPublishedAnimationAsset | null;
  fallbackImageUrl?: string;
  timeSeconds: number;
  placement: MascotPlacementV2;
  canvasZoom?: number;
}

export function StageMascotOverlay({ animation, fallbackImageUrl, timeSeconds, placement, canvasZoom = 1.0 }: StageMascotOverlayProps) {
  const rawVideoUrl = animation?.transparent_video_url;
  const videoUrl = rawVideoUrl && !isMockFixtureIdentifier(rawVideoUrl) ? rawVideoUrl : null;
  const validFallbackUrl = fallbackImageUrl && !isMockFixtureIdentifier(fallbackImageUrl) ? fallbackImageUrl : null;

  const resolvedFrame = useMemo(() => {
    if (!animation) return null;
    return resolveAnimationFrameAtTime(animation, timeSeconds);
  }, [animation, timeSeconds]);

  const anchorClass = placement.anchor === "bottom_right" ? "anchor-bottom_right" : "anchor-bottom_left";

  const containerStyle: React.CSSProperties = {
    position: "absolute",
    bottom: "24px",
    left: placement.anchor === "bottom_right" ? "auto" : "36px",
    right: placement.anchor === "bottom_right" ? "36px" : "auto",
    transform: `translate(${placement.offset_x}px, ${placement.offset_y}px) scale(${placement.scale * canvasZoom}) scaleX(${placement.flip_x ? -1 : 1})`,
    transformOrigin: "bottom center",
    pointerEvents: "none",
    zIndex: 20,
    transition: "transform 0.1s ease-out",
  };

  const spriteStyle: React.CSSProperties = {
    width: `${resolvedFrame?.frame.width ?? 220}px`,
    height: `${resolvedFrame?.frame.height ?? 220}px`,
    backgroundImage: animation?.atlas_url ? `url("${animation.atlas_url}")` : undefined,
    backgroundPosition: resolvedFrame?.atlasOffsets.cssBackgroundPosition ?? "center bottom",
    backgroundRepeat: "no-repeat",
    backgroundSize: "auto",
    filter: "drop-shadow(0 14px 24px rgba(0, 0, 0, 0.45))",
  };

  return (
    <div
      className={`candy-mascot-container ${anchorClass}`}
      data-testid="mascot-placement-container"
      data-anchor={placement.anchor}
      data-scale={placement.scale}
      data-offset-x={placement.offset_x}
      data-offset-y={placement.offset_y}
      data-flip-x={placement.flip_x}
      style={containerStyle}
    >
      {videoUrl ? (
        <video
          src={videoUrl}
          autoPlay
          loop={animation?.loop ?? animation?.state === "thinking"}
          muted
          playsInline
          data-testid="mascot-transparent-video"
          style={{ maxHeight: "220px", maxWidth: "100%", filter: "drop-shadow(0 14px 24px rgba(0, 0, 0, 0.45))" }}
          aria-label="Transparent WebM Mascot Animation"
        />
      ) : animation?.atlas_url && resolvedFrame ? (
        <div
          className="candy-mascot-sprite"
          data-testid="mascot-sprite-frame"
          data-frame-index={resolvedFrame.frameIndex}
          style={spriteStyle}
          role="img"
          aria-label={`Frame ${resolvedFrame.frameIndex + 1} of ${animation?.frame_count ?? 0}`}
        />
      ) : validFallbackUrl ? (
        <img
          src={validFallbackUrl}
          alt="Mascot preview"
          style={{ maxHeight: "220px", filter: "drop-shadow(0 14px 24px rgba(0, 0, 0, 0.45))" }}
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      ) : (
        <div
          style={{
            width: "160px",
            height: "160px",
            display: "grid",
            placeItems: "center",
            background: "rgba(0,0,0,0.4)",
            borderRadius: "12px",
            color: "rgba(255,255,255,0.6)",
            fontSize: "12px",
          }}
        >
          No variant generated
        </div>
      )}
    </div>
  );
}
