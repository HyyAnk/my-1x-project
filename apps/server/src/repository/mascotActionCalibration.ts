import {
  MASCOT_DEFAULT_ACTION_MOTIONS,
  MASCOT_DEFAULT_MOTION_SPEED,
  MASCOT_MOTION_SPEED_MAX,
  MASCOT_MOTION_SPEED_MIN,
  MASCOT_OFFSET_MAX,
  MASCOT_OFFSET_MIN,
  MASCOT_RENDER_CONTRACT_VERSION,
  adaptActionAsset,
  adaptMascotAssetsV1ToV2,
  adaptMascotConfigV1ToV2,
  type MascotActionAssetV2,
  type MascotActionType,
  type MascotAssetRegistration,
  type MascotMotionConfig,
  type MascotMotionIntensity,
  type MascotMotionPreset,
  type MascotProfile,
  type MascotRenderBundleV2,
  type MascotSpriteAction,
} from "@studio/shared";

export type MascotActionCalibrationInput = Partial<MascotSpriteAction> & {
  pivot?: { x: number; y: number };
  pivot_x?: number;
  pivot_y?: number;
  registration_offset?: { x?: number; y?: number; offset_x?: number; offset_y?: number };
  motion?: {
    preset?: MascotMotionPreset;
    speed?: number;
    intensity?: MascotMotionIntensity;
  };
};

function clamp(value: number | undefined, fallback: number, min: number, max: number): number {
  const candidate = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return Math.min(max, Math.max(min, candidate));
}

function firstPresent<T>(incoming: T | null | undefined, existing: T | null | undefined, fallback: T): T {
  return incoming ?? existing ?? fallback;
}

/**
 * Calibrates registration offset, pivot, and motion directly on a V2 MascotActionAsset.
 */
export function buildCalibratedActionAsset(
  action: MascotActionType,
  currentAsset: MascotActionAssetV2,
  calibration: MascotActionCalibrationInput,
): MascotActionAssetV2 {
  const sourceWidth = currentAsset.registration.source_width;
  const sourceHeight = currentAsset.registration.source_height;

  const rawOffsetX = firstPresent(
    calibration.registration_offset?.offset_x ?? calibration.registration_offset?.x ?? calibration.offset_x,
    currentAsset.registration.offset_x,
    0,
  );
  const rawOffsetY = firstPresent(
    calibration.registration_offset?.offset_y ?? calibration.registration_offset?.y ?? calibration.offset_y,
    currentAsset.registration.offset_y,
    0,
  );

  const rawPivotX = firstPresent(calibration.pivot?.x ?? calibration.pivot_x, currentAsset.registration.pivot.x, sourceWidth / 2);
  const rawPivotY = firstPresent(calibration.pivot?.y ?? calibration.pivot_y, currentAsset.registration.pivot.y, sourceHeight);

  const rawPreset = firstPresent(
    calibration.motion?.preset ?? calibration.motion_preset,
    currentAsset.motion.preset,
    MASCOT_DEFAULT_ACTION_MOTIONS[action] ?? "breathe",
  );
  const rawSpeed = firstPresent(
    calibration.motion?.speed ?? calibration.motion_speed,
    currentAsset.motion.speed,
    MASCOT_DEFAULT_MOTION_SPEED,
  );
  const rawIntensity = firstPresent(calibration.motion?.intensity ?? calibration.motion_intensity, currentAsset.motion.intensity, "normal");

  const updatedRegistration: MascotAssetRegistration = {
    ...currentAsset.registration,
    offset_x: clamp(rawOffsetX, 0, MASCOT_OFFSET_MIN, MASCOT_OFFSET_MAX),
    offset_y: clamp(rawOffsetY, 0, MASCOT_OFFSET_MIN, MASCOT_OFFSET_MAX),
    pivot: {
      x: clamp(rawPivotX, sourceWidth / 2, 0, sourceWidth),
      y: clamp(rawPivotY, sourceHeight, 0, sourceHeight),
    },
  };

  const updatedMotion: MascotMotionConfig = {
    preset: rawPreset,
    speed: clamp(rawSpeed, MASCOT_DEFAULT_MOTION_SPEED, MASCOT_MOTION_SPEED_MIN, MASCOT_MOTION_SPEED_MAX),
    intensity: rawIntensity,
  };

  const updatedAsset: MascotActionAssetV2 = {
    ...currentAsset,
    action,
    registration: updatedRegistration,
    motion: updatedMotion,
  };

  if (currentAsset.legacy_animation) {
    updatedAsset.legacy_animation = {
      ...currentAsset.legacy_animation,
      frames_count: firstPresent(calibration.frames_count, currentAsset.legacy_animation.frames_count, 1),
      fps: clamp(firstPresent(calibration.fps, currentAsset.legacy_animation.fps, 8), 8, 0.1, 120),
      loop: firstPresent(calibration.loop, currentAsset.legacy_animation.loop, true),
    };
  }

  return updatedAsset;
}

/**
 * Calibrates action registration offset, pivot, and motion directly on profile.render_bundle.
 * Updates legacy actions only as a harmless fallback when legacy actions are present.
 */
export function calibrateProfileRenderAction(
  profile: MascotProfile,
  action: MascotActionType,
  calibration: MascotActionCalibrationInput,
): MascotProfile {
  const baseBundle: MascotRenderBundleV2 = profile.render_bundle
    ? (JSON.parse(JSON.stringify(profile.render_bundle)) as MascotRenderBundleV2)
    : {
        config: adaptMascotConfigV1ToV2(),
        assets: adaptMascotAssetsV1ToV2(profile),
      };

  const existingAsset = baseBundle.assets.actions[action] ?? null;
  const legacyAction = profile.actions?.[action];
  const baseAsset = existingAsset ?? (legacyAction?.sprite_url ? adaptActionAsset(action, legacyAction) : null);

  let calibratedAsset: MascotActionAssetV2 | null = null;
  if (baseAsset) {
    calibratedAsset = buildCalibratedActionAsset(action, baseAsset, calibration);
  } else if (profile.master_image_url?.trim()) {
    const fallbackAsset: MascotActionAssetV2 = {
      version: 2,
      action,
      image_url: profile.master_image_url,
      registration: {
        source_width: 512,
        source_height: 512,
        content_bounds: { x: 0, y: 0, width: 512, height: 512 },
        pivot: { x: 256, y: 512 },
        offset_x: 0,
        offset_y: 0,
      },
      motion: {
        preset: MASCOT_DEFAULT_ACTION_MOTIONS[action] ?? "breathe",
        speed: 1,
        intensity: "normal",
      },
    };
    calibratedAsset = buildCalibratedActionAsset(action, fallbackAsset, calibration);
  }

  const updatedRenderBundle: MascotRenderBundleV2 = {
    ...baseBundle,
    assets: {
      ...baseBundle.assets,
      actions: {
        ...baseBundle.assets.actions,
        ...(calibratedAsset ? { [action]: calibratedAsset } : {}),
      },
    },
  };

  // Harmless fallback for legacy action
  const updatedActions = { ...profile.actions };
  updatedActions[action] = buildCalibratedMascotAction(action, legacyAction, calibration);

  return {
    ...profile,
    schema_version: MASCOT_RENDER_CONTRACT_VERSION,
    render_bundle: updatedRenderBundle,
    actions: updatedActions,
  };
}

/**
 * @deprecated Use calibrateProfileRenderAction or buildCalibratedActionAsset to calibrate directly on render_bundle.
 * Retained for harmless fallback and backwards compatibility.
 */
export function buildCalibratedMascotAction(
  action: MascotActionType,
  current: MascotSpriteAction | null | undefined,
  calibration: MascotActionCalibrationInput,
): MascotSpriteAction {
  return {
    action,
    sprite_url: current?.sprite_url || "",
    frames_count: firstPresent(calibration.frames_count, current?.frames_count, 1),
    fps: firstPresent(calibration.fps, current?.fps, 8),
    loop: firstPresent(calibration.loop, current?.loop, true),
    frame_width: current?.frame_width || 512,
    frame_height: current?.frame_height || 512,
    offset_x: firstPresent(
      calibration.registration_offset?.offset_x ?? calibration.registration_offset?.x ?? calibration.offset_x,
      current?.offset_x,
      0,
    ),
    offset_y: firstPresent(
      calibration.registration_offset?.offset_y ?? calibration.registration_offset?.y ?? calibration.offset_y,
      current?.offset_y,
      0,
    ),
    preview_url: current?.preview_url,
    motion_preset: firstPresent(calibration.motion?.preset ?? calibration.motion_preset, current?.motion_preset, "breathe"),
    motion_speed: firstPresent(calibration.motion?.speed ?? calibration.motion_speed, current?.motion_speed, 1),
    motion_intensity: firstPresent(calibration.motion?.intensity ?? calibration.motion_intensity, current?.motion_intensity, "normal"),
  };
}
