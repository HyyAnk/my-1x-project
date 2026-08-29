import type { MascotActionType, MascotSpriteAction } from "@studio/shared";

export function buildCalibratedMascotAction(
  action: MascotActionType,
  current: MascotSpriteAction | null | undefined,
  calibration: Partial<MascotSpriteAction>,
): MascotSpriteAction {
  return {
    action,
    sprite_url: current?.sprite_url || "",
    frames_count: firstPresent(calibration.frames_count, current?.frames_count, 1),
    fps: firstPresent(calibration.fps, current?.fps, 8),
    loop: firstPresent(calibration.loop, current?.loop, true),
    frame_width: current?.frame_width || 512,
    frame_height: current?.frame_height || 512,
    offset_x: firstPresent(calibration.offset_x, current?.offset_x, 0),
    offset_y: firstPresent(calibration.offset_y, current?.offset_y, 0),
    preview_url: current?.preview_url,
    motion_preset: firstPresent(calibration.motion_preset, current?.motion_preset, "breathe"),
    motion_speed: firstPresent(calibration.motion_speed, current?.motion_speed, 1),
    motion_intensity: firstPresent(calibration.motion_intensity, current?.motion_intensity, "normal"),
  };
}

function firstPresent<T>(incoming: T | null | undefined, existing: T | null | undefined, fallback: T): T {
  return incoming ?? existing ?? fallback;
}
