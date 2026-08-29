import { MASCOT_BASE_BOX_PX } from "./renderConstants.js";
import type { MascotBounds, MascotPoint, MascotRenderGeometry, MascotRenderSpecV2 } from "./renderTypes.js";

/**
 * Resolves the canonical canvas-space placement for a render spec. Scaling and
 * mirroring happen around the registered pivot; action offsets are applied
 * afterwards so a pose can be calibrated without changing channel placement.
 */
export function resolveMascotRenderGeometry(spec: MascotRenderSpecV2): MascotRenderGeometry {
  const baseBox = MASCOT_BASE_BOX_PX;
  const registration = spec.asset.registration;
  const frameWidth = spec.asset.legacy_animation?.frame_width ?? registration.source_width;
  const frameHeight = spec.asset.legacy_animation?.frame_height ?? registration.source_height;
  const imageScale = Math.min(baseBox / frameWidth, baseBox / frameHeight);
  const imageOffsetX = (baseBox - frameWidth * imageScale) / 2;
  const imageOffsetY = (baseBox - frameHeight * imageScale) / 2;
  const pivot = {
    x: imageOffsetX + clamp(registration.pivot.x, 0, frameWidth) * imageScale,
    y: imageOffsetY + clamp(registration.pivot.y, 0, frameHeight) * imageScale,
  };
  const anchorOrigin = {
    x: spec.placement.anchor === "bottom_left" ? 0 : spec.canvas.width - baseBox,
    y: spec.canvas.height - baseBox,
  };
  const origin = {
    x: anchorOrigin.x + spec.placement.offset_x,
    y: anchorOrigin.y + spec.placement.offset_y,
  };
  const transformPoint = (point: MascotPoint): MascotPoint => {
    const relativeX = (point.x - pivot.x) * spec.placement.scale * (spec.placement.flip_x ? -1 : 1);
    const relativeY = (point.y - pivot.y) * spec.placement.scale;
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
    transformPoint({ x: imageOffsetX + content.x * imageScale, y: imageOffsetY + content.y * imageScale }),
    transformPoint({ x: imageOffsetX + (content.x + content.width) * imageScale, y: imageOffsetY + content.y * imageScale }),
    transformPoint({ x: imageOffsetX + content.x * imageScale, y: imageOffsetY + (content.y + content.height) * imageScale }),
    transformPoint({
      x: imageOffsetX + (content.x + content.width) * imageScale,
      y: imageOffsetY + (content.y + content.height) * imageScale,
    }),
  ]);

  return {
    box_x: box.x,
    box_y: box.y,
    box_width: box.width,
    box_height: box.height,
    pivot_x: origin.x + pivot.x,
    pivot_y: origin.y + pivot.y,
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
