import {
  resolveMascotAnimationRegistration,
  type MascotActionAssetV2,
  type MascotActionType,
  type MascotAssetRegistration,
  type MascotMotionIntensity,
  type MascotMotionPreset,
  type MascotPublishedAnimationAsset,
  type MascotStateVariant,
} from "@studio/shared";

export const DEFAULT_ACTION_REGISTRATION = {
  source_width: 512,
  source_height: 512,
  content_bounds: { x: 0, y: 0, width: 512, height: 512 },
  pivot: { x: 256, y: 512 },
  offset_x: 0,
  offset_y: 0,
} as const;

/**
 * Registration derived from a measured style variant: its canvas is the source frame, the opaque
 * pixel box is the visible content and the pivot defaults to the bottom center of the canvas.
 */
export function variantRegistration(
  variant: MascotStateVariant,
  existing?: MascotActionAssetV2 | null,
): MascotAssetRegistration | undefined {
  if (!variant.canvas || !variant.content_bounds) return undefined;
  return {
    source_width: variant.canvas.width,
    source_height: variant.canvas.height,
    content_bounds: variant.content_bounds,
    pivot: variant.pivot ?? { x: variant.canvas.width / 2, y: variant.canvas.height },
    offset_x: existing?.registration.offset_x ?? 0,
    offset_y: existing?.registration.offset_y ?? 0,
  };
}

/**
 * Builds a modern V2 render bundle mascot action definition.
 */
export function buildBundleActionV2(
  action: MascotActionType,
  imageUrl: string,
  motionPreset: MascotMotionPreset,
  motionSpeed = 1.0,
  motionIntensity: MascotMotionIntensity = "normal",
  existing?: MascotActionAssetV2 | null,
  animation?: MascotPublishedAnimationAsset,
  registrationOverride?: MascotAssetRegistration,
): MascotActionAssetV2 {
  return {
    version: 2,
    action,
    image_url: imageUrl,
    motion: {
      preset: motionPreset,
      speed: motionSpeed,
      intensity: motionIntensity,
    },
    registration: animation?.registration
      ? resolveMascotAnimationRegistration(animation)
      : (registrationOverride ?? existing?.registration ?? DEFAULT_ACTION_REGISTRATION),
    ...(existing?.legacy_animation ? { legacy_animation: existing.legacy_animation } : {}),
    ...(animation ? { animation } : existing?.animation ? { animation: existing.animation } : {}),
  };
}
