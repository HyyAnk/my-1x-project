import { type MascotActionType, type MascotMotionIntensity, type MascotMotionPreset, type MascotSpriteAction } from "@studio/shared";

/**
 * Builds a legacy V1 mascot sprite action definition.
 * @deprecated Legacy V1 sprite actions are deprecated and retired in favor of Mascot Render Bundle V2. Use `buildBundleActionV2` instead.
 */
export function buildLegacySpriteAction(
  action: MascotActionType,
  imageUrl: string,
  motionPreset: MascotMotionPreset,
  motionSpeed = 1.0,
  motionIntensity: MascotMotionIntensity = "normal",
  existing?: MascotSpriteAction | null,
): MascotSpriteAction {
  return {
    action,
    sprite_url: imageUrl,
    preview_url: imageUrl,
    frames_count: existing?.frames_count ?? 1,
    fps: existing?.fps ?? 8,
    loop: existing?.loop ?? true,
    frame_width: existing?.frame_width ?? 512,
    frame_height: existing?.frame_height ?? 512,
    offset_x: existing?.offset_x ?? 0,
    offset_y: existing?.offset_y ?? 0,
    motion_preset: motionPreset,
    motion_speed: motionSpeed,
    motion_intensity: motionIntensity,
  };
}
