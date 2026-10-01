import { useMemo } from "react";
import {
  MASCOT_BASE_BOX_PX,
  isMockFixtureIdentifier,
  resolveAnimationFrameAtTime,
  type MascotPublishedAnimationAsset,
  type MascotPlacementV2,
} from "@studio/shared";
import { resolveStageMascotFrameGeometry } from "./stageMascotGeometry";
import { stageMascotContainerStyle, stageMascotSpriteStyle, stageMascotVideoStyle } from "./stageMascotStyles";

export interface StageMascotOverlayProps {
  animation?: MascotPublishedAnimationAsset | null;
  fallbackImageUrl?: string;
  timeSeconds: number;
  placement: MascotPlacementV2;
  aspectRatio?: "16:9" | "9:16";
}

export function StageMascotOverlay({ animation, fallbackImageUrl, timeSeconds, placement, aspectRatio = "16:9" }: StageMascotOverlayProps) {
  const rawVideoUrl = animation?.transparent_video_url;
  const videoUrl = rawVideoUrl && !isMockFixtureIdentifier(rawVideoUrl) ? rawVideoUrl : null;
  const validFallbackUrl = fallbackImageUrl && !isMockFixtureIdentifier(fallbackImageUrl) ? fallbackImageUrl : null;

  const resolvedFrame = useMemo(() => {
    if (!animation) return null;
    return resolveAnimationFrameAtTime(animation, timeSeconds);
  }, [animation, timeSeconds]);

  const frameGeometry = useMemo(() => {
    if (!animation) return null;
    return resolveStageMascotFrameGeometry(animation);
  }, [animation]);

  const anchorClass = placement.anchor === "bottom_right" ? "anchor-bottom_right" : "anchor-bottom_left";

  return (
    <div
      className={`candy-mascot-container ${anchorClass}`}
      data-testid="mascot-placement-container"
      data-anchor={placement.anchor}
      data-scale={placement.scale}
      data-offset-x={placement.offset_x}
      data-offset-y={placement.offset_y}
      data-flip-x={placement.flip_x}
      data-pivot-compensation-x={frameGeometry?.pivot_compensation_x ?? 0}
      data-pivot-compensation-y={frameGeometry?.pivot_compensation_y ?? 0}
      style={stageMascotContainerStyle(placement, aspectRatio)}
    >
      {videoUrl ? (
        <video
          src={videoUrl}
          autoPlay
          loop={animation?.loop ?? animation?.state === "thinking"}
          muted
          playsInline
          data-testid="mascot-transparent-video"
          style={stageMascotVideoStyle(animation, frameGeometry, placement)}
          aria-label="Transparent WebM Mascot Animation"
        />
      ) : animation?.atlas_url && resolvedFrame ? (
        <div
          className="candy-mascot-sprite"
          data-testid="mascot-sprite-frame"
          data-frame-index={resolvedFrame.frameIndex}
          style={stageMascotSpriteStyle(animation, resolvedFrame, frameGeometry)}
          role="img"
          aria-label={`Frame ${resolvedFrame.frameIndex + 1} of ${animation?.frame_count ?? 0}`}
        />
      ) : validFallbackUrl ? (
        <img
          src={validFallbackUrl}
          alt="Mascot preview"
          style={{
            maxHeight: `${MASCOT_BASE_BOX_PX}px`,
            maxWidth: `${MASCOT_BASE_BOX_PX}px`,
            filter: "drop-shadow(0 14px 24px rgba(0, 0, 0, 0.45))",
          }}
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
