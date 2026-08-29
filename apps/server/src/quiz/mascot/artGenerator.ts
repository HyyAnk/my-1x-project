import { readFile } from "node:fs/promises";
import { MASCOT_ACTION_META, type AppConfig, type MascotActionType, type MascotProfile, type MascotSpriteAction } from "@studio/shared";
import { generateGpti2ImageBytes } from "../../providers/gpti2Image.js";
import { generateShopAiKeyImageBytes } from "../../providers/shopAiKeyImage.js";
import type { RepositoryService } from "../../repository.js";
import type { StudioLogger } from "../../logger.js";
import { removeImageBackground } from "../../utils/imageMatting.js";
import { buildMascotActionPrompt, buildMascotConceptPrompt } from "../mascotPromptContract.js";
import { generateProceduralMascotArt, generateProceduralStateArt } from "./proceduralArt.js";

export async function generateMascotAiImageBytes(
  prompt: string,
  imageConfig: AppConfig["image_generation"],
  options: {
    aspectRatio?: "1:1" | "16:9";
    size?: string;
    referenceImageBase64?: string;
    background?: "transparent" | "opaque" | "auto";
    cancellationSignal?: AbortSignal;
  } = {},
  logger?: StudioLogger,
): Promise<Uint8Array> {
  const apiKey = (
    imageConfig.api_key ||
    process.env.SHOPAIKEY_API_KEY ||
    process.env.GPTI2_API_KEY ||
    process.env.CUSTOM_IMAGE_API_KEY ||
    ""
  ).trim();
  if (!apiKey) {
    throw new Error("No image generation API key configured in Settings or Environment.");
  }

  const provider =
    imageConfig.provider ||
    (imageConfig.base_url?.includes("shopaikey") ? "shopaikey" : process.env.SHOPAIKEY_API_KEY ? "shopaikey" : "gpti2");

  if (provider === "shopaikey" || provider === "custom" || (provider !== "gpti2" && Boolean(imageConfig.base_url))) {
    const baseUrl = imageConfig.base_url || (provider === "shopaikey" ? "https://direct.shopaikey.com/v1" : "https://api.openai.com/v1");
    logger?.info(`Calling ShopAiKey/OpenAI-compatible image generation (${baseUrl})`, { model: imageConfig.model });
    return await generateShopAiKeyImageBytes(prompt, options.cancellationSignal, {
      apiKey,
      baseUrl,
      model: imageConfig.model || "gpt-image-2",
      size: options.size || (options.aspectRatio === "1:1" ? "1024x1024" : "1536x1024"),
      quality: imageConfig.quality || "low",
    });
  }

  logger?.info("Calling gpti2.store image generation", { model: imageConfig.model, hasRef: Boolean(options.referenceImageBase64) });
  const result = await generateGpti2ImageBytes(prompt, {
    apiKey,
    aspect_ratio: options.aspectRatio || "1:1",
    size: options.size || (options.aspectRatio === "1:1" ? "1024x1024" : "1280x720"),
    model: imageConfig.model || "gpt-image-2",
    referenceImageBase64: options.referenceImageBase64,
    referenceStrength: 0.75,
    background: options.background || "transparent",
    cancellationSignal: options.cancellationSignal || AbortSignal.timeout(90_000),
  });
  return result.bytes;
}

export async function generateMascotConceptArt(
  repository: RepositoryService,
  mascot: MascotProfile,
  imageConfig: AppConfig["image_generation"],
  overridePrompt?: string,
  logger?: StudioLogger,
): Promise<{ master_image_url: string; prompt_used: string }> {
  const fullPrompt = buildMascotConceptPrompt(mascot, overridePrompt);

  let imageBytes: Uint8Array;
  const filename = `master_concept_${Date.now()}.png`;
  const hasApiKey = Boolean(
    imageConfig.api_key || process.env.SHOPAIKEY_API_KEY || process.env.GPTI2_API_KEY || process.env.CUSTOM_IMAGE_API_KEY,
  );

  if (imageConfig.enabled && hasApiKey) {
    try {
      logger?.info(`Generating mascot concept for ${mascot.name} (${mascot.id})`, { profileId: mascot.id });
      const rawBytes = await generateMascotAiImageBytes(
        fullPrompt,
        imageConfig,
        {
          aspectRatio: "1:1",
          size: "1024x1024",
          background: "opaque",
          cancellationSignal: AbortSignal.timeout(90_000),
        },
        logger,
      );
      try {
        imageBytes = await removeImageBackground(rawBytes);
      } catch (mattingErr) {
        logger?.warn(
          `Mascot concept background removal failed, using raw AI image: ${mattingErr instanceof Error ? mattingErr.message : String(mattingErr)}`,
          { profileId: mascot.id },
        );
        imageBytes = rawBytes;
      }
    } catch (err) {
      logger?.warn(`Mascot concept API failed, using procedural fallback: ${err instanceof Error ? err.message : String(err)}`, {
        profileId: mascot.id,
      });
      imageBytes = generateProceduralMascotArt(mascot.name, mascot.color_theme, "master");
    }
  } else {
    imageBytes = generateProceduralMascotArt(mascot.name, mascot.color_theme, "master");
  }

  if (mascot.master_image_url) {
    const prevFilename = mascot.master_image_url.split("/").pop();
    if (prevFilename && prevFilename !== filename) {
      void repository.deleteMascotAssetFile(mascot.id, prevFilename);
    }
  }

  const assetUrl = await repository.saveMascotAsset(mascot.id, filename, imageBytes);
  await repository.saveMascot({
    ...mascot,
    master_image_url: assetUrl,
    master_prompt: overridePrompt || mascot.master_prompt || mascot.description || "",
    updated_at: new Date().toISOString(),
  });

  return { master_image_url: assetUrl, prompt_used: fullPrompt };
}

/**
 * @deprecated Kept as a compatibility adapter for existing clients. New mascot
 * authoring writes one action image (frames_count=1) and uses V2 CSS motion;
 * legacy multi-frame strips are read-only compatibility assets.
 */
export async function generateMascotActionSprite(
  repository: RepositoryService,
  mascot: MascotProfile,
  action: MascotActionType,
  imageConfig: AppConfig["image_generation"],
  options: { prompt?: string; frames_count?: number; fps?: number; loop?: boolean } = {},
  logger?: StudioLogger,
): Promise<{ action_sprite: MascotSpriteAction; prompt_used: string }> {
  const meta = MASCOT_ACTION_META[action] || MASCOT_ACTION_META.idle;
  const framesCount = options.frames_count !== undefined ? options.frames_count : meta.defaultFrames || 1;
  const fps = options.fps || meta.defaultFps || 8;
  const loop = options.loop !== undefined ? options.loop : true;

  let referenceImageBase64: string | undefined;
  if (mascot.master_image_url) {
    const masterFilename = mascot.master_image_url.split("/").pop();
    if (masterFilename) {
      try {
        const fileInfo = await repository.getMascotAssetFile(mascot.id, masterFilename);
        const rawMasterBytes = await readFile(fileInfo.absolutePath);
        if (rawMasterBytes && rawMasterBytes.length > 0) {
          referenceImageBase64 = `data:image/png;base64,${Buffer.from(rawMasterBytes).toString("base64")}`;
        }
      } catch (err) {
        logger?.warn(`Could not load master concept image for reference: ${err instanceof Error ? err.message : String(err)}`, {
          profileId: mascot.id,
        });
      }
    }
  }

  const fullPrompt = buildMascotActionPrompt(mascot, action, {
    prompt: options.prompt,
    framesCount,
    hasReferenceImage: Boolean(referenceImageBase64),
  });

  let spriteBytes: Uint8Array;
  const filename = `state_${action}_${Date.now()}.png`;
  const frameWidth = framesCount === 1 ? 512 : 256;
  const frameHeight = framesCount === 1 ? 512 : 256;
  const hasApiKey = Boolean(
    imageConfig.api_key || process.env.SHOPAIKEY_API_KEY || process.env.GPTI2_API_KEY || process.env.CUSTOM_IMAGE_API_KEY,
  );

  if (imageConfig.enabled && hasApiKey) {
    try {
      logger?.info(
        `Generating mascot state for ${mascot.name} action ${action} (frames: ${framesCount}, hasRefImage: ${Boolean(referenceImageBase64)})`,
        { profileId: mascot.id },
      );
      const rawBytes = await generateMascotAiImageBytes(
        fullPrompt,
        imageConfig,
        {
          aspectRatio: framesCount === 1 ? "1:1" : "16:9",
          size: framesCount === 1 ? "1024x1024" : "1280x720",
          referenceImageBase64,
          background: "opaque",
          cancellationSignal: AbortSignal.timeout(90_000),
        },
        logger,
      );
      try {
        spriteBytes = await removeImageBackground(rawBytes);
      } catch (mattingErr) {
        logger?.warn(
          `Mascot state background removal failed, using raw AI image: ${mattingErr instanceof Error ? mattingErr.message : String(mattingErr)}`,
          { profileId: mascot.id },
        );
        spriteBytes = rawBytes;
      }
    } catch (err) {
      logger?.warn(`Mascot state API failed, using procedural fallback: ${err instanceof Error ? err.message : String(err)}`, {
        profileId: mascot.id,
      });
      spriteBytes = generateProceduralStateArt(mascot.name, mascot.color_theme, action, framesCount);
    }
  } else {
    spriteBytes = generateProceduralStateArt(mascot.name, mascot.color_theme, action, framesCount);
  }

  const prevSpriteUrl = mascot.actions[action]?.sprite_url;
  if (prevSpriteUrl) {
    const prevFilename = prevSpriteUrl.split("/").pop();
    if (prevFilename && prevFilename !== filename) {
      void repository.deleteMascotAssetFile(mascot.id, prevFilename);
    }
  }

  const assetUrl = await repository.saveMascotAsset(mascot.id, filename, spriteBytes);
  const actionSprite: MascotSpriteAction = {
    action,
    sprite_url: assetUrl,
    frames_count: framesCount,
    fps,
    loop,
    frame_width: frameWidth,
    frame_height: frameHeight,
    offset_x: mascot.actions[action]?.offset_x || 0,
    offset_y: mascot.actions[action]?.offset_y || 0,
    preview_url: assetUrl,
    motion_preset: meta.motionPreset,
  };

  const updatedActions = {
    ...mascot.actions,
    [action]: actionSprite,
  };

  await repository.saveMascot({
    ...mascot,
    actions: updatedActions,
    updated_at: new Date().toISOString(),
  });

  return { action_sprite: actionSprite, prompt_used: fullPrompt };
}
