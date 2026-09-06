import { readFile } from "node:fs/promises";
import {
  MASCOT_ACTION_META,
  type AppConfig,
  type BatchGenerateStyleSlotsInput,
  type GenerateMascotSlotInput,
  type MascotActionType,
  type MascotProfile,
  type MascotSpriteAction,
  type MascotStateVariant,
} from "@studio/shared";
import { generateGpti2ImageBytes } from "../../providers/gpti2Image.js";
import { generateShopAiKeyImageBytes } from "../../providers/shopAiKeyImage.js";
import type { RepositoryService } from "../../repository.js";
import type { StudioLogger } from "../../logger.js";
import { removeImageBackground } from "../../utils/imageMatting.js";
import { retryWithBackoff } from "../../utils/retryWithBackoff.js";
import { withMascotWriteLock } from "../../repository/mascots.js";
import { buildMascotActionPrompt, buildMascotConceptPrompt, validateMascotPromptContract } from "../mascotPromptContract.js";
import { generateProceduralMascotArt, generateProceduralStateArt } from "./proceduralArt.js";

/**
 * Enforces the studio isolation prompt contract before spending an AI call.
 * A violated contract reliably produces matted-unfriendly or multi-character
 * output, so it is treated as a configuration bug rather than a soft warning.
 */
function assertMascotPromptContract(prompt: string, hasReferenceImage: boolean): void {
  if (!validateMascotPromptContract(prompt, hasReferenceImage)) {
    throw new Error(`Mascot prompt violates the studio isolation contract: "${prompt.slice(0, 120)}..."`);
  }
}

export async function generateMascotAiImageBytes(
  prompt: string,
  imageConfig: AppConfig["image_generation"],
  options: {
    aspectRatio?: "1:1" | "16:9";
    size?: string;
    referenceImageBase64?: string;
    background?: "transparent" | "opaque" | "auto";
    cancellationSignal?: AbortSignal;
    idempotencyKey?: string;
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
    idempotencyKey: options.idempotencyKey,
  });
  return result.bytes;
}

export async function generateMascotConceptArt(
  repository: RepositoryService,
  mascot: MascotProfile,
  imageConfig: AppConfig["image_generation"],
  overridePrompt?: string,
  logger?: StudioLogger,
): Promise<{ master_image_url: string; prompt_used: string; placeholder: boolean }> {
  const fullPrompt = buildMascotConceptPrompt(mascot, overridePrompt);
  assertMascotPromptContract(fullPrompt, false);

  let imageBytes: Uint8Array;
  let placeholder = false;
  const filename = `master_concept_${Date.now()}.png`;
  const hasApiKey = Boolean(
    imageConfig.api_key || process.env.SHOPAIKEY_API_KEY || process.env.GPTI2_API_KEY || process.env.CUSTOM_IMAGE_API_KEY,
  );

  if (imageConfig.enabled && hasApiKey) {
    try {
      logger?.info(`Generating mascot concept for ${mascot.name} (${mascot.id})`, { profileId: mascot.id });
      const rawBytes = await retryWithBackoff(() => generateMascotAiImageBytes(
        fullPrompt,
        imageConfig,
        {
          aspectRatio: "1:1",
          size: "1024x1024",
          background: "opaque",
          cancellationSignal: AbortSignal.timeout(90_000),
        },
        logger,
      ));
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
      placeholder = true;
    }
  } else {
    imageBytes = generateProceduralMascotArt(mascot.name, mascot.color_theme, "master");
    placeholder = true;
  }

  // Persist under the mascot write lock, re-reading the latest profile so
  // concurrent slot/style edits are not clobbered by the full-profile save.
  const { assetUrl, prompt_used: promptUsed } = await withMascotWriteLock(mascot.id, async () => {
    if (mascot.master_image_url) {
      const prevFilename = mascot.master_image_url.split("/").pop();
      if (prevFilename && prevFilename !== filename) {
        void repository.deleteMascotAssetFile(mascot.id, prevFilename);
      }
    }

    const savedUrl = await repository.saveMascotAsset(mascot.id, filename, imageBytes);
    const latest = await repository.getMascot(mascot.id).catch(() => mascot);
    await repository.saveMascot({
      ...latest,
      master_image_url: savedUrl,
      master_prompt: overridePrompt || latest.master_prompt || latest.description || "",
      updated_at: new Date().toISOString(),
    });
    return { assetUrl: savedUrl, prompt_used: fullPrompt };
  });

  return { master_image_url: assetUrl, prompt_used: promptUsed, placeholder };
}

async function loadMasterReferenceImageBase64(
  repository: RepositoryService,
  mascot: MascotProfile,
  logger?: StudioLogger,
): Promise<string | undefined> {
  if (!mascot.master_image_url) {
    return undefined;
  }
  const masterFilename = mascot.master_image_url.split("/").pop();
  if (!masterFilename) {
    return undefined;
  }
  try {
    const fileInfo = await repository.getMascotAssetFile(mascot.id, masterFilename);
    const rawMasterBytes = await readFile(fileInfo.absolutePath);
    if (rawMasterBytes && rawMasterBytes.length > 0) {
      return `data:image/png;base64,${Buffer.from(rawMasterBytes).toString("base64")}`;
    }
  } catch (err) {
    logger?.warn(`Could not load master concept image for reference: ${err instanceof Error ? err.message : String(err)}`, {
      profileId: mascot.id,
    });
  }
  return undefined;
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
): Promise<{ action_sprite: MascotSpriteAction; prompt_used: string; placeholder: boolean }> {
  const meta = MASCOT_ACTION_META[action] || MASCOT_ACTION_META.idle;
  const framesCount = options.frames_count !== undefined ? options.frames_count : meta.defaultFrames || 1;
  const fps = options.fps || meta.defaultFps || 8;
  const loop = options.loop !== undefined ? options.loop : true;

  const referenceImageBase64 = await loadMasterReferenceImageBase64(repository, mascot, logger);

  const fullPrompt = buildMascotActionPrompt(mascot, action, {
    prompt: options.prompt,
    hasReferenceImage: Boolean(referenceImageBase64),
  });
  assertMascotPromptContract(fullPrompt, Boolean(referenceImageBase64));

  let spriteBytes: Uint8Array;
  let placeholder = false;
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
      const rawBytes = await retryWithBackoff(() => generateMascotAiImageBytes(
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
      ));
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
      placeholder = true;
    }
  } else {
    spriteBytes = generateProceduralStateArt(mascot.name, mascot.color_theme, action, framesCount);
    placeholder = true;
  }

  // Persist under the mascot write lock, re-reading the latest profile so
  // concurrent slot/style edits are not clobbered by the full-profile save.
  const actionSprite = await withMascotWriteLock(mascot.id, async () => {
    const prevSpriteUrl = mascot.actions[action]?.sprite_url;
    if (prevSpriteUrl) {
      const prevFilename = prevSpriteUrl.split("/").pop();
      if (prevFilename && prevFilename !== filename) {
        void repository.deleteMascotAssetFile(mascot.id, prevFilename);
      }
    }

    const assetUrl = await repository.saveMascotAsset(mascot.id, filename, spriteBytes);
    const latest = await repository.getMascot(mascot.id).catch(() => mascot);
    const nextSprite: MascotSpriteAction = {
      action,
      sprite_url: assetUrl,
      frames_count: framesCount,
      fps,
      loop,
      frame_width: frameWidth,
      frame_height: frameHeight,
      offset_x: latest.actions[action]?.offset_x || 0,
      offset_y: latest.actions[action]?.offset_y || 0,
      preview_url: assetUrl,
      motion_preset: meta.motionPreset,
    };

    await repository.saveMascot({
      ...latest,
      actions: {
        ...latest.actions,
        [action]: nextSprite,
      },
      updated_at: new Date().toISOString(),
    });
    return nextSprite;
  });

  return { action_sprite: actionSprite, prompt_used: fullPrompt, placeholder };
}

export async function generateMascotStyleSlot(
  repository: RepositoryService,
  mascot: MascotProfile,
  styleId: string,
  input: GenerateMascotSlotInput,
  imageConfig: AppConfig["image_generation"],
  logger?: StudioLogger,
  options: { signal?: AbortSignal } = {},
): Promise<{ mascot: MascotProfile; slot: MascotStateVariant; prompt_used: string; placeholder: boolean }> {
  const style = mascot.styles?.find((s) => s.id === styleId);
  if (!style) {
    throw new Error(`Style ${styleId} not found`);
  }

  const referenceImageBase64 = await loadMasterReferenceImageBase64(repository, mascot, logger);

  const fullPrompt = buildMascotActionPrompt(mascot, input.state, {
    prompt: input.prompt_modifier,
    keyword: style.keyword,
    hasReferenceImage: Boolean(referenceImageBase64),
    slotIndex: input.slot_index,
  });
  assertMascotPromptContract(fullPrompt, Boolean(referenceImageBase64));

  let imageBytes: Uint8Array;
  let placeholder = false;
  const filename = `style_${styleId}_${input.state}_slot${input.slot_index}_${Date.now()}.png`;
  const slotIdempotencyKey = `mascot_${mascot.id}_${styleId}_${input.state}_s${input.slot_index}_${Date.now()}`;
  const hasApiKey = Boolean(
    imageConfig.api_key || process.env.SHOPAIKEY_API_KEY || process.env.GPTI2_API_KEY || process.env.CUSTOM_IMAGE_API_KEY,
  );

  if (imageConfig.enabled && hasApiKey) {
    try {
      logger?.info(
        `Generating mascot style slot for ${mascot.name} style ${styleId} (${input.state} slot ${input.slot_index})`,
        { profileId: mascot.id, styleId, state: input.state, slotIndex: input.slot_index },
      );
      const rawBytes = await retryWithBackoff(() => generateMascotAiImageBytes(
        fullPrompt,
        imageConfig,
        {
          aspectRatio: "1:1",
          size: "1024x1024",
          referenceImageBase64,
          background: "opaque",
          cancellationSignal: options.signal ?? AbortSignal.timeout(90_000),
          idempotencyKey: slotIdempotencyKey,
        },
        logger,
      ));
      try {
        imageBytes = await removeImageBackground(rawBytes);
      } catch (mattingErr) {
        logger?.warn(
          `Mascot slot background removal failed, using raw AI image: ${mattingErr instanceof Error ? mattingErr.message : String(mattingErr)}`,
          { profileId: mascot.id, styleId, slotIndex: input.slot_index },
        );
        imageBytes = rawBytes;
      }
    } catch (err) {
      logger?.warn(
        `Mascot slot AI generation failed, using procedural fallback: ${err instanceof Error ? err.message : String(err)}`,
        { profileId: mascot.id, styleId, slotIndex: input.slot_index },
      );
      imageBytes = generateProceduralStateArt(mascot.name, mascot.color_theme, input.state, 1);
      placeholder = true;
    }
  } else {
    imageBytes = generateProceduralStateArt(mascot.name, mascot.color_theme, input.state, 1);
    placeholder = true;
  }

  const existingSlot = style.states[input.state]?.find((s) => s.slot_index === input.slot_index);
  if (existingSlot?.image_url) {
    const prevFilename = existingSlot.image_url.split("/").pop();
    if (prevFilename && prevFilename !== filename) {
      void repository.deleteMascotAssetFile(mascot.id, prevFilename);
    }
  }

  const assetUrl = await repository.saveMascotAsset(mascot.id, filename, imageBytes);
  const updatedMascot = await repository.updateMascotSlot(mascot.id, {
    style_id: styleId,
    state: input.state,
    slot_index: input.slot_index,
    image_url: assetUrl,
    prompt_modifier: input.prompt_modifier,
  });

  const updatedStyle = updatedMascot.styles?.find((s) => s.id === styleId);
  const updatedSlot = updatedStyle?.states[input.state]?.find((s) => s.slot_index === input.slot_index);
  if (!updatedSlot) {
    throw new Error(`Updated slot not found for style ${styleId}, state ${input.state}, slot ${input.slot_index}`);
  }

  return { mascot: updatedMascot, slot: updatedSlot, prompt_used: fullPrompt, placeholder };
}

export async function generateMascotStyleBatch(
  repository: RepositoryService,
  mascot: MascotProfile,
  styleId: string,
  input: BatchGenerateStyleSlotsInput,
  imageConfig: AppConfig["image_generation"],
  logger?: StudioLogger,
  options: { signal?: AbortSignal } = {},
): Promise<{ mascot: MascotProfile; generated_count: number; cancelled: boolean }> {
  const style = mascot.styles?.find((s) => s.id === styleId);
  if (!style) {
    throw new Error(`Style ${styleId} not found`);
  }

  const stateFilter = input.state || "all";
  const statesToProcess: Array<"thinking" | "celebrate"> =
    stateFilter === "all" ? ["thinking", "celebrate"] : [stateFilter];

  const emptySlots: Array<{ state: "thinking" | "celebrate"; slot_index: number; prompt_modifier?: string }> = [];

  for (const state of statesToProcess) {
    const slots = style.states[state] || [];
    for (let i = 1; i <= 10; i++) {
      const slot = slots.find((s) => s.slot_index === i);
      if (!slot || !slot.image_url || slot.image_url.trim() === "") {
        emptySlots.push({
          state,
          slot_index: i,
          prompt_modifier: slot?.prompt_modifier,
        });
      }
    }
  }

  const CONCURRENCY = 3;
  let queueIndex = 0;
  let generatedCount = 0;

  const runWorker = async () => {
    while (queueIndex < emptySlots.length) {
      if (options.signal?.aborted) break;
      const itemIndex = queueIndex++;
      if (itemIndex >= emptySlots.length) break;
      const item = emptySlots[itemIndex]!;
      const latestMascot = await repository.getMascot(mascot.id);
      await generateMascotStyleSlot(
        repository,
        latestMascot,
        styleId,
        {
          style_id: styleId,
          state: item.state,
          slot_index: item.slot_index,
          prompt_modifier: item.prompt_modifier,
        },
        imageConfig,
        logger,
        { signal: options.signal },
      );
      generatedCount++;
    }
  };

  const workerCount = Math.min(CONCURRENCY, emptySlots.length);
  const workers = Array.from({ length: workerCount }, () => runWorker());
  await Promise.all(workers);

  const finalMascot = await repository.getMascot(mascot.id);
  return { mascot: finalMascot, generated_count: generatedCount, cancelled: Boolean(options.signal?.aborted) };
}

