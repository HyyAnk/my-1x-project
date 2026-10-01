import { MASCOT_BASE_BOX_PX } from "./renderConstants.js";
import type { MascotAssetRegistration, MascotBounds, MascotPoint, MascotRenderGeometry, MascotRenderSpecV2 } from "./renderTypes.js";
import type { MascotPublishedAnimationAsset } from "./animation/animationTypes.js";

/** Video placement follows the uploaded canvas, never the detected subject bounds. */
export function resolveMascotAnimationRegistration(animation: MascotPublishedAnimationAsset): MascotAssetRegistration {
  if (!animation.transparent_video_url) return animation.registration;
  // Older video assets stored full-canvas registration directly on the asset.
  const registration = animation.video_registration ?? animation.registration;
  return {
    ...registration,
    pivot: { x: registration.source_width / 2, y: registration.source_height },
  };
}

export function resolveMascotAnimationFrameGeometry(animation: MascotPublishedAnimationAsset) {
  const registration = resolveMascotAnimationRegistration(animation);
  const frame = animation.transparent_video_url ? undefined : animation.frames?.[0];
  const geometry = resolveMascotFrameGeometry(
    registration,
    frame?.width ?? registration.source_width,
    frame?.height ?? registration.source_height,
  );
  if (!animation.transparent_video_url) return geometry;
  // Transform the common contain box, including its padding. Do not translate
  // the source bottom edge onto the box bottom: that changes saved placement.
  return {
    ...geometry,
    asset_pivot_x: geometry.canonical_pivot_x,
    asset_pivot_y: geometry.canonical_pivot_y,
    pivot_compensation_x: 0,
    pivot_compensation_y: 0,
  };
}

/**
 * Resolves the canonical canvas-space placement for a render spec. Every asset
 * is first aligned to the shared bottom-center pivot, then placement scaling
 * and mirroring are applied; action offsets remain independent calibration.
 */
export function resolveMascotRenderGeometry(spec: MascotRenderSpecV2): MascotRenderGeometry {
  const baseBox = MASCOT_BASE_BOX_PX;
  const animation = spec.asset.animation;
  const registration = animation ? resolveMascotAnimationRegistration(animation) : spec.asset.registration;
  const frame = animation
    ? resolveMascotAnimationFrameGeometry(animation)
    : resolveMascotFrameGeometry(
        registration,
        spec.asset.legacy_animation?.frame_width ?? registration.source_width,
        spec.asset.legacy_animation?.frame_height ?? registration.source_height,
      );
  const pivot = { x: frame.canonical_pivot_x, y: frame.canonical_pivot_y };
  const anchorOrigin = {
    x: spec.placement.anchor === "bottom_left" ? 0 : spec.canvas.width - baseBox,
    y: spec.canvas.height - baseBox,
  };
  const origin = {
    x: anchorOrigin.x + spec.placement.offset_x,
    y: anchorOrigin.y + spec.placement.offset_y,
  };
  const transformPoint = (point: MascotPoint): MascotPoint => {
    const canonicalizedPoint = {
      x: point.x + frame.pivot_compensation_x,
      y: point.y + frame.pivot_compensation_y,
    };
    const relativeX = (canonicalizedPoint.x - pivot.x) * spec.placement.scale * (spec.placement.flip_x ? -1 : 1);
    const relativeY = (canonicalizedPoint.y - pivot.y) * spec.placement.scale;
    return { x: origin.x + pivot.x + relativeX, y: origin.y + pivot.y + relativeY };
  };
  const box = boundsFromPoints([
    transformPoint({ x: 0, y: 0 }),
    transformPoint({ x: baseBox, y: 0 }),
    transformPoint({ x: 0, y: baseBox }),
    transformPoint({ x: baseBox, y: baseBox }),
  ]);
  const content = registration.content_bounds;
  const contentBounds = boundsFromPoints([
    transformPoint({ x: frame.image_offset_x + content.x * frame.image_scale, y: frame.image_offset_y + content.y * frame.image_scale }),
    transformPoint({
      x: frame.image_offset_x + (content.x + content.width) * frame.image_scale,
      y: frame.image_offset_y + content.y * frame.image_scale,
    }),
    transformPoint({
      x: frame.image_offset_x + content.x * frame.image_scale,
      y: frame.image_offset_y + (content.y + content.height) * frame.image_scale,
    }),
    transformPoint({
      x: frame.image_offset_x + (content.x + content.width) * frame.image_scale,
      y: frame.image_offset_y + (content.y + content.height) * frame.image_scale,
    }),
  ]);

  return {
    box_x: box.x,
    box_y: box.y,
    box_width: box.width,
    box_height: box.height,
    pivot_x: origin.x + pivot.x,
    pivot_y: origin.y + pivot.y,
    asset_pivot_x: origin.x + frame.asset_pivot_x,
    asset_pivot_y: origin.y + frame.asset_pivot_y,
    pivot_compensation_x: frame.pivot_compensation_x,
    pivot_compensation_y: frame.pivot_compensation_y,
    visible_content: {
      ...contentBounds,
      x: contentBounds.x + registration.offset_x,
      y: contentBounds.y + registration.offset_y,
    },
    registration_offset_x: registration.offset_x,
    registration_offset_y: registration.offset_y,
    flip_x: spec.placement.flip_x,
  };
}

/**
 * Resolves a frame's local coordinates inside the canonical mascot box.
 * Every asset is aligned to the same bottom-center pivot regardless of the
 * source canvas' aspect ratio or the per-upload registration metadata.
 */
export function resolveMascotFrameGeometry(
  registration: MascotAssetRegistration,
  frameWidth: number,
  frameHeight: number,
): {
  image_scale: number;
  image_offset_x: number;
  image_offset_y: number;
  asset_pivot_x: number;
  asset_pivot_y: number;
  canonical_pivot_x: number;
  canonical_pivot_y: number;
  pivot_compensation_x: number;
  pivot_compensation_y: number;
} {
  const safeFrameWidth = Math.max(1, Number.isFinite(frameWidth) ? frameWidth : registration.source_width);
  const safeFrameHeight = Math.max(1, Number.isFinite(frameHeight) ? frameHeight : registration.source_height);
  const imageScale = Math.min(MASCOT_BASE_BOX_PX / safeFrameWidth, MASCOT_BASE_BOX_PX / safeFrameHeight);
  const imageOffsetX = (MASCOT_BASE_BOX_PX - safeFrameWidth * imageScale) / 2;
  const imageOffsetY = (MASCOT_BASE_BOX_PX - safeFrameHeight * imageScale) / 2;
  const assetPivotX = imageOffsetX + clamp(registration.pivot.x, 0, safeFrameWidth) * imageScale;
  const assetPivotY = imageOffsetY + clamp(registration.pivot.y, 0, safeFrameHeight) * imageScale;
  const canonicalPivotX = MASCOT_BASE_BOX_PX / 2;
  const canonicalPivotY = MASCOT_BASE_BOX_PX;

  return {
    image_scale: imageScale,
    image_offset_x: imageOffsetX,
    image_offset_y: imageOffsetY,
    asset_pivot_x: assetPivotX,
    asset_pivot_y: assetPivotY,
    canonical_pivot_x: canonicalPivotX,
    canonical_pivot_y: canonicalPivotY,
    pivot_compensation_x: canonicalPivotX - assetPivotX,
    pivot_compensation_y: canonicalPivotY - assetPivotY,
  };
}

function boundsFromPoints(points: MascotPoint[]): MascotBounds {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
