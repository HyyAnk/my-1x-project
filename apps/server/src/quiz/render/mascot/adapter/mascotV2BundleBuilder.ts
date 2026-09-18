import {
  type MascotActionAssetV2,
  type MascotActionType,
  type MascotMotionIntensity,
  type MascotMotionPreset,
  type MascotPublishedAnimationAsset,
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
    registration: animation?.registration ?? existing?.registration ?? DEFAULT_ACTION_REGISTRATION,
    ...(existing?.legacy_animation ? { legacy_animation: existing.legacy_animation } : {}),
    ...(animation ? { animation } : existing?.animation ? { animation: existing.animation } : {}),
  };
}
