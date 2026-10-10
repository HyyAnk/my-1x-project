import type { resolveMascotRenderSpec } from "@studio/shared";

export type MascotMarkerRenderSpec = NonNullable<ReturnType<typeof resolveMascotRenderSpec>>;

export function hasSamePlacement(previous: MascotMarkerRenderSpec, current: MascotMarkerRenderSpec): boolean {
  return (
    previous.placement.anchor === current.placement.anchor &&
    previous.placement.offset_x === current.placement.offset_x &&
    previous.placement.offset_y === current.placement.offset_y &&
    previous.placement.scale === current.placement.scale &&
    previous.placement.flip_x === current.placement.flip_x
  );
}

/** Same action and the same animation slot, video and atlas: the clip can keep playing without restarting. */
export function hasSameAnimationIdentity(previous: MascotMarkerRenderSpec, current: MascotMarkerRenderSpec): boolean {
  const previousAnimation = previous.asset.animation;
  const currentAnimation = current.asset.animation;
  return (
    previous.asset.action === current.asset.action &&
    previousAnimation?.slot_index === currentAnimation?.slot_index &&
    previousAnimation?.transparent_video_url === currentAnimation?.transparent_video_url &&
    previousAnimation?.atlas_url === currentAnimation?.atlas_url
  );
}

export function isAnimatableSpec(spec: MascotMarkerRenderSpec | null): spec is MascotMarkerRenderSpec {
  const animation = spec?.asset.animation;
  return Boolean(animation && (animation.transparent_video_url || animation.atlas_url));
}

export function hasSameStaticImage(previous: MascotMarkerRenderSpec, current: MascotMarkerRenderSpec): boolean {
  return Boolean(previous.asset.image_url) && previous.asset.image_url === current.asset.image_url;
}
