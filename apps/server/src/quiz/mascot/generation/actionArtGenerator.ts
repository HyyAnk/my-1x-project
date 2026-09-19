import {
  MASCOT_ACTION_META,
  MASCOT_RENDER_CONTRACT_VERSION,
  adaptMascotAssetsV1ToV2,
  adaptMascotConfigV1ToV2,
  adaptMascotV1ToV2,
  type AppConfig,
  type MascotActionAssetV2,
  type MascotActionType,
  type MascotProfile,
  type MascotRenderBundleV2,
  type MascotSpriteAction,
} from "@studio/shared";
import type { RepositoryService } from "../../../repository.js";
import type { StudioLogger } from "../../../logger.js";
import { withMascotWriteLock } from "../../../repository/mascots.js";
import { buildMascotActionPrompt } from "../../mascotPromptContract.js";
import { generateProceduralStateArt } from "../proceduralArt.js";
import { generateMascotArtWithFallback } from "../services/mascotAiImageClient.js";
import { loadMasterReferenceImageBase64 } from "../services/mascotAssetLoader.js";
import { deletePreviousMascotAsset } from "./artGeneratorHelpers.js";

/**
 * Modern V2 Mascot Action Art Generator.
 * Generates single-image action art, persists modern MascotActionAssetV2 directly into render_bundle,
 * and maintains backward-compatible MascotSpriteAction.
 */
export async function generateMascotActionArt(
  repository: RepositoryService,
  mascot: MascotProfile,
  action: MascotActionType,
  imageConfig: AppConfig["image_generation"],
  options: {
    prompt?: string;
    frames_count?: number;
    fps?: number;
    loop?: boolean;
    imageFallbackConfig?: AppConfig["image_fallback"];
  } = {},
  logger?: StudioLogger,
): Promise<{
  action_asset: MascotActionAssetV2;
  render_bundle: MascotRenderBundleV2;
  action_sprite: MascotSpriteAction;
  prompt_used: string;
  placeholder: boolean;
}> {
  const meta = MASCOT_ACTION_META[action] || MASCOT_ACTION_META.idle;
  const framesCount = options.frames_count !== undefined ? options.frames_count : meta.defaultFrames || 1;
  const fps = options.fps || meta.defaultFps || 8;
  const loop = options.loop !== undefined ? options.loop : true;

  const referenceImageBase64 = await loadMasterReferenceImageBase64(repository, mascot, logger);
  const fullPrompt = buildMascotActionPrompt(mascot, action, {
    prompt: options.prompt,
    hasReferenceImage: Boolean(referenceImageBase64),
  });

  const filename = `state_${action}_${Date.now()}.png`;
  const { mattedBytes, placeholder } = await generateMascotArtWithFallback({
    prompt: fullPrompt,
    hasReferenceImage: Boolean(referenceImageBase64),
    imageConfig,
    imageFallbackConfig: options.imageFallbackConfig,
    options: {
      aspectRatio: framesCount === 1 ? "1:1" : "16:9",
      size: framesCount === 1 ? "1024x1024" : "1280x720",
      referenceImageBase64,
      background: "opaque",
    },
    logger,
    logContext: { profileId: mascot.id },
    actionLabel: `mascot state for ${mascot.name} action ${action} (frames: ${framesCount}, hasRefImage: ${Boolean(referenceImageBase64)})`,
    fallbackArt: () => generateProceduralStateArt(mascot.name, mascot.color_theme, action, framesCount),
  });

  const { actionSprite, actionAsset, renderBundle } = await withMascotWriteLock(mascot.id, async () => {
    deletePreviousMascotAsset(repository, mascot.id, mascot.actions[action]?.sprite_url, filename);
    const assetUrl = await repository.saveMascotAsset(mascot.id, filename, mattedBytes);
    const latest = await repository.getMascot(mascot.id).catch(() => mascot);
    const frameDim = framesCount === 1 ? 512 : 256;

    const nextSprite: MascotSpriteAction = {
      action,
      sprite_url: assetUrl,
      frames_count: framesCount,
      fps,
      loop,
      frame_width: frameDim,
      frame_height: frameDim,
      offset_x: latest.actions[action]?.offset_x || 0,
      offset_y: latest.actions[action]?.offset_y || 0,
      preview_url: assetUrl,
      motion_preset: meta.motionPreset,
    };

    const existingAsset = latest.render_bundle?.assets.actions[action];
    const motionPreset = existingAsset?.motion.preset ?? meta.motionPreset ?? "breathe";
    const motionSpeed = existingAsset?.motion.speed ?? 1.0;
    const motionIntensity = existingAsset?.motion.intensity ?? "normal";
    const registration = existingAsset?.registration ?? {
      source_width: frameDim,
      source_height: frameDim,
      content_bounds: {
        x: 0,
        y: 0,
        width: frameDim,
        height: frameDim,
      },
      pivot: {
        x: frameDim / 2,
        y: frameDim,
      },
      offset_x: latest.actions[action]?.offset_x || 0,
      offset_y: latest.actions[action]?.offset_y || 0,
    };

    const nextActionAsset: MascotActionAssetV2 = {
      version: 2,
      action,
      image_url: assetUrl,
      registration,
      motion: {
        preset: motionPreset,
        speed: motionSpeed,
        intensity: motionIntensity,
      },
      ...(framesCount > 1
        ? {
            legacy_animation: {
              frames_count: framesCount,
              fps,
              loop,
              frame_width: frameDim,
              frame_height: frameDim,
            },
          }
        : {}),
    };

    const baseBundle: MascotRenderBundleV2 = latest.render_bundle
      ? (JSON.parse(JSON.stringify(latest.render_bundle)) as MascotRenderBundleV2)
      : (adaptMascotV1ToV2(latest) ?? {
          config: adaptMascotConfigV1ToV2(),
          assets: adaptMascotAssetsV1ToV2(latest),
        });

    const nextBundle: MascotRenderBundleV2 = {
      ...baseBundle,
      assets: {
        ...baseBundle.assets,
        actions: {
          ...baseBundle.assets.actions,
          [action]: nextActionAsset,
        },
      },
    };

    await repository.saveMascot({
      ...latest,
      schema_version: MASCOT_RENDER_CONTRACT_VERSION,
      render_bundle: nextBundle,
      actions: { ...latest.actions, [action]: nextSprite },
      updated_at: new Date().toISOString(),
    });

    return {
      actionSprite: nextSprite,
      actionAsset: nextActionAsset,
      renderBundle: nextBundle,
    };
  });

  return {
    action_asset: actionAsset,
    render_bundle: renderBundle,
    action_sprite: actionSprite,
    prompt_used: fullPrompt,
    placeholder,
  };
}

/**
 * @deprecated Use generateMascotActionArt instead. Kept as a compatibility adapter for existing clients.
 */
export async function generateMascotActionSprite(
  repository: RepositoryService,
  mascot: MascotProfile,
  action: MascotActionType,
  imageConfig: AppConfig["image_generation"],
  options: { prompt?: string; frames_count?: number; fps?: number; loop?: boolean } = {},
  logger?: StudioLogger,
): Promise<{
  action_asset: MascotActionAssetV2;
  render_bundle: MascotRenderBundleV2;
  action_sprite: MascotSpriteAction;
  prompt_used: string;
  placeholder: boolean;
}> {
  return generateMascotActionArt(repository, mascot, action, imageConfig, options, logger);
}
