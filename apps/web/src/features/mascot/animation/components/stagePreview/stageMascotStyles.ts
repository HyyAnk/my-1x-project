import type { CSSProperties } from "react";
import {
  MASCOT_BASE_BOX_PX,
  resolveMascotAnimationRegistration,
  type MascotPlacementV2,
  type MascotPublishedAnimationAsset,
  type resolveAnimationFrameAtTime,
  type resolveMascotAnimationFrameGeometry,
} from "@studio/shared";

type FrameGeometry = ReturnType<typeof resolveMascotAnimationFrameGeometry> | null;
type AnimationFrame = ReturnType<typeof resolveAnimationFrameAtTime> | null;
const shadow = "drop-shadow(0 14px 24px rgba(0, 0, 0, 0.45))";

export function stageMascotContainerStyle(placement: MascotPlacementV2, aspectRatio: "16:9" | "9:16"): CSSProperties {
  const portrait = aspectRatio === "9:16";
  const right = placement.anchor === "bottom_right";
  return {
    position: "absolute",
    width: MASCOT_BASE_BOX_PX,
    height: MASCOT_BASE_BOX_PX,
    bottom: portrait ? 440 : 0,
    left: right ? "auto" : portrait ? 36 : 0,
    right: right ? (portrait ? 140 : 0) : "auto",
    transform: `translate(${placement.offset_x}px, ${placement.offset_y}px) scale(${placement.scale}) scaleX(${placement.flip_x ? -1 : 1})`,
    transformOrigin: "bottom center",
    pointerEvents: "none",
    zIndex: 20,
  };
}

export function stageMascotSpriteStyle(
  animation: MascotPublishedAnimationAsset | null | undefined,
  frame: AnimationFrame,
  geometry: FrameGeometry,
): CSSProperties {
  return {
    position: "absolute",
    left: geometry?.image_offset_x ?? 0,
    top: geometry?.image_offset_y ?? 0,
    width: frame?.frame.width ?? MASCOT_BASE_BOX_PX,
    height: frame?.frame.height ?? MASCOT_BASE_BOX_PX,
    backgroundImage: animation?.atlas_url ? `url("${animation.atlas_url}")` : undefined,
    backgroundPosition: frame?.atlasOffsets.cssBackgroundPosition ?? "center bottom",
    backgroundRepeat: "no-repeat",
    backgroundSize: "auto",
    transformOrigin: "0 0",
    transform: `translate(${geometry?.pivot_compensation_x ?? 0}px, ${geometry?.pivot_compensation_y ?? 0}px) scale(${geometry?.image_scale ?? 1})`,
    filter: shadow,
  };
}

export function stageMascotVideoStyle(
  animation: MascotPublishedAnimationAsset | null | undefined,
  geometry: FrameGeometry,
  placement: MascotPlacementV2,
): CSSProperties {
  const registration = animation ? resolveMascotAnimationRegistration(animation) : null;
  // Registration offsets are stage pixels, outside placement scale and mirroring.
  const offsetX = ((registration?.offset_x ?? 0) / placement.scale) * (placement.flip_x ? -1 : 1);
  const offsetY = (registration?.offset_y ?? 0) / placement.scale;
  return {
    width: MASCOT_BASE_BOX_PX,
    height: MASCOT_BASE_BOX_PX,
    objectFit: "contain",
    transformOrigin: "0 0",
    transform: `translate(${(geometry?.pivot_compensation_x ?? 0) + offsetX}px, ${(geometry?.pivot_compensation_y ?? 0) + offsetY}px)`,
    filter: shadow,
  };
}
