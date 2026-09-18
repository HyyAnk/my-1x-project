import React from "react";
import { Smiley } from "@phosphor-icons/react";
import type { MascotAnimationAssetV1, MascotPublishedAnimationAsset, ResolvedAnimationFrame } from "@studio/shared";
import { useTranslation } from "../../../../i18n";
import type { CanvasBackgroundMode } from "./MascotCanvasToolbar";

export interface MascotCanvasViewportProps {
  canvasBackground: CanvasBackgroundMode;
  canvasZoom: number;
  flipHorizontal: boolean;
  effectiveMotionSpeed: number;
  intensityMultiplier: number;
  videoUrl: string | null;
  resolvedFrame: ResolvedAnimationFrame | null;
  animation?: MascotAnimationAssetV1 | MascotPublishedAnimationAsset | null;
  spriteImageUrl: string | null;
  isPlaying: boolean;
  effectiveMotionPreset: string;
  genColor?: string;
  actionLabel: string;
}

export function MascotCanvasViewport({
  canvasBackground,
  canvasZoom,
  flipHorizontal,
  effectiveMotionSpeed,
  intensityMultiplier,
  videoUrl,
  resolvedFrame,
  animation,
  spriteImageUrl,
  isPlaying,
  effectiveMotionPreset,
  genColor,
  actionLabel,
}: MascotCanvasViewportProps) {
  const { t } = useTranslation();

  const motionClass = isPlaying && effectiveMotionPreset !== "none" ? `motion-${effectiveMotionPreset}` : "";
  const dropShadowFilter = `drop-shadow(0 12px 24px rgba(0,0,0,0.5)) drop-shadow(0 0 16px ${genColor || "var(--accent)"}26)`;

  return (
    <div className={`motion-canvas-viewport theme-${canvasBackground}`}>
      <div
        className="motion-mascot-wrapper"
        style={
          {
            transform: `scale(${canvasZoom}) ${flipHorizontal ? "scaleX(-1)" : ""}`,
            "--anim-speed": effectiveMotionSpeed,
            "--anim-intensity": intensityMultiplier,
          } as React.CSSProperties
        }
      >
        {videoUrl ? (
          <video
            src={videoUrl}
            autoPlay
            loop
            muted
            playsInline
            className={`motion-mascot-video ${motionClass}`}
            data-testid="motion-mascot-video"
            style={{
              maxWidth: "100%",
              maxHeight: "380px",
              objectFit: "contain",
              filter: dropShadowFilter,
            }}
            aria-label={actionLabel}
          />
        ) : resolvedFrame && animation?.atlas_url ? (
          <div
            className="motion-mascot-sprite"
            data-testid="motion-mascot-sprite"
            data-frame-index={resolvedFrame.frameIndex}
            style={{
              width: `${resolvedFrame.frame.width}px`,
              height: `${resolvedFrame.frame.height}px`,
              backgroundImage: `url('${animation.atlas_url}')`,
              backgroundPosition: resolvedFrame.atlasOffsets.cssBackgroundPosition,
              backgroundRepeat: "no-repeat",
              backgroundSize: "auto",
              filter: dropShadowFilter,
            }}
            role="img"
            aria-label={`Frame ${resolvedFrame.frameIndex + 1} of ${animation.frame_count}`}
          />
        ) : spriteImageUrl ? (
          <img
            src={spriteImageUrl}
            alt={actionLabel}
            className={`motion-mascot-img ${motionClass}`}
            style={{
              filter: dropShadowFilter,
            }}
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <div className="motion-mascot-placeholder">
            <Smiley size={48} style={{ color: genColor || "var(--accent)" }} />
            <span>{t("mascots.motionMissingBadge")}</span>
          </div>
        )}
      </div>
    </div>
  );
}
