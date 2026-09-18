import {
  MASCOT_ACTION_META,
  MASCOT_RENDER_CONTRACT_VERSION,
  UploadMascotSpriteInputSchema,
  adaptMascotAssetsV1ToV2,
  adaptMascotConfigV1ToV2,
  adaptMascotV1ToV2,
  type MascotActionAssetV2,
  type MascotActionType,
  type MascotMotionPreset,
  type MascotProfile,
  type MascotRenderBundleV2,
  type MascotSpriteAction,
} from "@studio/shared";
import { removeImageBackground } from "../../../utils/imageMatting.js";
import type { RepositoryService } from "../../../repository.js";

export interface MascotActionUploadResult {
  mascot: MascotProfile;
  action_asset: MascotActionAssetV2;
  render_bundle: MascotRenderBundleV2;
  action_sprite: MascotSpriteAction;
}

export function buildActionSprite(
  action: MascotActionType,
  assetUrl: string,
  framesCount: number,
  input: {
    fps?: number;
    loop?: boolean;
    frame_width?: number;
    frame_height?: number;
    motion_preset?: MascotMotionPreset;
  },
  existingActionOffset?: { offset_x?: number; offset_y?: number } | null,
): MascotSpriteAction {
  const meta = MASCOT_ACTION_META[action];
  const dimension = framesCount === 1 ? 512 : 256;
  const motionPreset = input.motion_preset ?? meta?.motionPreset ?? "breathe";
  return {
    action,
    sprite_url: assetUrl,
    frames_count: framesCount,
    fps: input.fps ?? 8,
    loop: input.loop ?? true,
    frame_width: input.frame_width ?? dimension,
    frame_height: input.frame_height ?? dimension,
    offset_x: existingActionOffset?.offset_x ?? 0,
    offset_y: existingActionOffset?.offset_y ?? 0,
    motion_preset: motionPreset,
    preview_url: assetUrl,
  };
}

export function buildActionAsset(
  action: MascotActionType,
  assetUrl: string,
  framesCount: number,
  input: {
    frame_width?: number;
    frame_height?: number;
    fps?: number;
    loop?: boolean;
    motion_preset?: MascotMotionPreset;
  },
  existingAsset?: MascotActionAssetV2 | null,
): MascotActionAssetV2 {
  const meta = MASCOT_ACTION_META[action];
  const dimension = framesCount === 1 ? 512 : 256;
  const width = input.frame_width ?? dimension;
  const height = input.frame_height ?? dimension;

  const registration = existingAsset?.registration ?? {
    source_width: width,
    source_height: height,
    content_bounds: { x: 0, y: 0, width, height },
    pivot: { x: width / 2, y: height },
    offset_x: 0,
    offset_y: 0,
  };

  const motionPreset = input.motion_preset ?? existingAsset?.motion.preset ?? meta?.motionPreset ?? "breathe";

  return {
    version: 2,
    action,
    image_url: assetUrl,
    registration,
    motion: {
      preset: motionPreset,
      speed: existingAsset?.motion.speed ?? 1.0,
      intensity: existingAsset?.motion.intensity ?? "normal",
    },
    ...(framesCount > 1
      ? {
          legacy_animation: {
            frames_count: framesCount,
            fps: input.fps ?? 8,
            loop: input.loop ?? true,
            frame_width: input.frame_width ?? 256,
            frame_height: input.frame_height ?? 256,
          },
        }
      : {}),
  };
}

export function buildNextRenderBundle(
  mascot: MascotProfile,
  action: MascotActionType,
  actionAsset: MascotActionAssetV2,
): MascotRenderBundleV2 {
  const baseBundle: MascotRenderBundleV2 = mascot.render_bundle
    ? structuredClone(mascot.render_bundle)
    : (adaptMascotV1ToV2(mascot) ?? {
        config: adaptMascotConfigV1ToV2(),
        assets: adaptMascotAssetsV1ToV2(mascot),
      });

  return {
    ...baseBundle,
    assets: {
      ...baseBundle.assets,
      actions: {
        ...baseBundle.assets.actions,
        [action]: actionAsset,
      },
    },
  };
}

/**
 * Handles action sprite image decoding, background removal, asset persistence, and V2 bundle synchronization.
 */
export async function handleActionUpload(
  repository: RepositoryService,
  mascotId: string,
  action: MascotActionType,
  rawBody: unknown,
): Promise<MascotActionUploadResult> {
  const bodyObj = typeof rawBody === "object" && rawBody !== null ? (rawBody as Record<string, unknown>) : {};
  const input = UploadMascotSpriteInputSchema.parse({ ...bodyObj, action });
  const mascot = await repository.getMascot(mascotId);
  const base64Data = input.data.replace(/^data:image\/[^;]+;base64,/i, "");
  let buffer = Buffer.from(base64Data, "base64");
  buffer = Buffer.from(await removeImageBackground(buffer));

  const filename = `sprite_${action}_${Date.now()}.png`;
  const assetUrl = await repository.saveMascotAsset(mascotId, filename, buffer);
  const framesCount = input.frames_count ?? 1;

  const actionSprite = buildActionSprite(action, assetUrl, framesCount, input, mascot.actions?.[action]);
  const existingAsset = mascot.render_bundle?.assets.actions[action];
  const actionAsset = buildActionAsset(action, assetUrl, framesCount, input, existingAsset);
  const nextBundle = buildNextRenderBundle(mascot, action, actionAsset);

  const updated = await repository.saveMascot({
    ...mascot,
    schema_version: MASCOT_RENDER_CONTRACT_VERSION,
    render_bundle: nextBundle,
    actions: { ...mascot.actions, [action]: actionSprite },
    updated_at: new Date().toISOString(),
  });

  return {
    mascot: updated,
    action_asset: actionAsset,
    render_bundle: updated.render_bundle ?? nextBundle,
    action_sprite: actionSprite,
  };
}
