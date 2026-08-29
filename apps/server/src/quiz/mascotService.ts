import { readFile } from "node:fs/promises";
import {
  ALL_MASCOT_ACTIONS,
  MASCOT_ACTION_META,
  type AppConfig,
  type MascotActionType,
  type MascotProfile,
  type MascotSpriteAction,
  type QuizImageStyle,
} from "@studio/shared";
import { generateGpti2ImageBytes } from "../providers/gpti2Image.js";
import { generateShopAiKeyImageBytes } from "../providers/shopAiKeyImage.js";
import type { RepositoryService } from "../repository.js";
import type { StudioLogger } from "../logger.js";
import { createZipArchive, parseZipArchive } from "./zipHelper.js";
import { removeImageBackground } from "../utils/imageMatting.js";
import { buildMascotActionPrompt, buildMascotConceptPrompt } from "./mascotPromptContract.js";

const STYLE_PROMPTS: Record<QuizImageStyle, string> = {
  pixar_3d:
    "3D Pixar animation style, soft volumetric lighting, smooth stylized textures, cute rounded features, vibrant saturated colors, cinema 4D octane render, highly expressive",
  flat_vector: "2D flat vector art, clean bold outlines, solid color blocks, minimalist modern mascot, sticker style",
  kawaii_chibi: "Chibi kawaii anime style, oversized cute sparkling eyes, mini body, joyful expression, pastel accents, cute anime mascot",
  voxel_lowpoly: "Voxel art 3D low-poly style, isometric grid cubes, playful blocky character, vibrant lighting",
  plastic_toy: "Glossy vinyl designer toy style, smooth plastic reflections, pop mart blind box aesthetic, studio lighting",
};

async function generateMascotAiImageBytes(
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

  // Cleanup previous master concept if it exists and differs
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

  // Load master concept image bytes if available for reference conditioning
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

  // Cleanup previous action sprite if it exists and differs
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

/**
 * Removes background from an existing mascot master image or action sprites
 */
export async function removeMascotAssetBackground(
  repository: RepositoryService,
  mascotId: string,
  target: "master" | "all" | MascotActionType = "all",
  logger?: StudioLogger,
): Promise<MascotProfile> {
  const mascot = await repository.getMascot(mascotId);
  const updatedActions = { ...mascot.actions };
  const updatedMaster = mascot.master_image_url;

  if (target === "master" || target === "all") {
    if (mascot.master_image_url) {
      const filename = mascot.master_image_url.split("/").pop();
      if (filename) {
        try {
          const file = await repository.getMascotAssetFile(mascotId, filename);
          const rawBytes = await readFile(file.absolutePath);
          const transparentBytes = await removeImageBackground(rawBytes);
          await repository.saveMascotAsset(mascotId, filename, transparentBytes);
        } catch (error) {
          logger?.warn(
            `Failed to remove background for mascot master image (${mascotId}/${filename}): ${error instanceof Error ? error.message : String(error)}`,
            { step: "mascot" },
          );
        }
      }
    }
  }

  const actionsToProcess = target === "all" ? ALL_MASCOT_ACTIONS : target !== "master" ? [target] : [];

  for (const action of actionsToProcess) {
    const sprite = mascot.actions[action];
    if (sprite?.sprite_url) {
      const filename = sprite.sprite_url.split("/").pop();
      if (filename) {
        try {
          const file = await repository.getMascotAssetFile(mascotId, filename);
          const rawBytes = await readFile(file.absolutePath);
          const transparentBytes = await removeImageBackground(rawBytes);
          await repository.saveMascotAsset(mascotId, filename, transparentBytes);
        } catch (error) {
          logger?.warn(
            `Failed to remove background for mascot sprite ${action} (${mascotId}/${filename}): ${error instanceof Error ? error.message : String(error)}`,
            { step: "mascot" },
          );
        }
      }
    }
  }

  return repository.saveMascot({
    ...mascot,
    master_image_url: updatedMaster,
    actions: updatedActions,
    updated_at: new Date().toISOString(),
  });
}

/**
 * Packages full mascot manifest and all sprite assets into a standard ZIP archive
 */
export async function exportMascotPackage(
  repository: RepositoryService,
  mascotId: string,
): Promise<{ zipBuffer: Buffer; filename: string }> {
  const mascot = await repository.getMascot(mascotId);
  const assetFilenames = await repository.listMascotAssets(mascotId);
  const files: { filename: string; data: Uint8Array }[] = [];

  // Add manifest JSON
  const manifestJson = JSON.stringify(mascot, null, 2);
  files.push({ filename: "mascot.json", data: Buffer.from(manifestJson, "utf8") });

  // Add all asset files
  for (const filename of assetFilenames) {
    try {
      const fileInfo = await repository.getMascotAssetFile(mascotId, filename);
      const content = await readFile(fileInfo.absolutePath);
      files.push({ filename: `assets/${filename}`, data: content });
    } catch {
      // Ignore missing or unreadable asset
    }
  }

  const safeName = mascot.name.toLowerCase().replace(/[^a-z0-9_-]/g, "_");
  const zipBuffer = createZipArchive(files);
  return { zipBuffer, filename: `mascot_${safeName}_${mascot.id}.zip` };
}

/**
 * Imports a mascot from a standard ZIP archive package
 */
export async function importMascotPackage(repository: RepositoryService, zipBuffer: Buffer): Promise<MascotProfile> {
  const entries = parseZipArchive(zipBuffer);
  const manifestEntry = entries.find((e) => e.filename === "mascot.json" || e.filename.endsWith("/mascot.json"));
  if (!manifestEntry) {
    throw new Error("Invalid Mascot ZIP package: missing mascot.json manifest");
  }

  const raw = JSON.parse(Buffer.from(manifestEntry.data).toString("utf8")) as Record<string, unknown>;
  const name = (raw.name as string) || "Imported Mascot";
  const newMascot = await repository.saveMascot({
    name: `${name} (Imported)`,
    description: (raw.description as string) || "",
    visual_style: (raw.visual_style as QuizImageStyle) || "pixar_3d",
    master_prompt: (raw.master_prompt as string) || "",
    color_theme: (raw.color_theme as string) || "#06b6d4",
  });

  const assetEntries = entries.filter((e) => e.filename.startsWith("assets/") || e.filename.includes("/assets/"));
  const urlMap = new Map<string, string>();

  for (const asset of assetEntries) {
    const cleanFilename = asset.filename.split("/").pop() || "asset.png";
    const transparentData = await removeImageBackground(asset.data);
    const newUrl = await repository.saveMascotAsset(newMascot.id, cleanFilename, transparentData);
    urlMap.set(cleanFilename, newUrl);
  }

  // Map updated master image URL
  let masterUrl: string | null = null;
  if (typeof raw.master_image_url === "string") {
    const oldFile = raw.master_image_url.split("/").pop();
    if (oldFile && urlMap.has(oldFile)) {
      masterUrl = urlMap.get(oldFile)!;
    }
  }

  // Map updated action URLs
  const importedActions: Record<string, MascotSpriteAction | null> = {};
  if (raw.actions && typeof raw.actions === "object") {
    for (const [actionKey, act] of Object.entries(raw.actions as Record<string, any>)) {
      if (act && typeof act === "object" && typeof act.sprite_url === "string") {
        const oldSpriteFile = act.sprite_url.split("/").pop();
        const newSpriteUrl = oldSpriteFile && urlMap.has(oldSpriteFile) ? urlMap.get(oldSpriteFile)! : "";
        importedActions[actionKey] = {
          ...act,
          action: actionKey as MascotActionType,
          sprite_url: newSpriteUrl,
          preview_url: newSpriteUrl,
          offset_x: act.offset_x || 0,
          offset_y: act.offset_y || 0,
        };
      }
    }
  }

  return repository.saveMascot({
    ...newMascot,
    master_image_url: masterUrl,
    actions: importedActions,
    updated_at: new Date().toISOString(),
  });
}

/**
 * Generates an ultra-crisp procedural SVG fallback converted to PNG-like SVG data
 */
export function generateProceduralMascotArt(name: string, color: string, state: string): Uint8Array {
  const primaryColor = color || "#06b6d4";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${primaryColor}"/>
      <stop offset="100%" stop-color="#0284c7"/>
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="rgba(0,0,0,0.3)"/>
    </filter>
  </defs>
  <rect width="512" height="512" rx="64" fill="none"/>
  <ellipse cx="256" cy="460" rx="140" ry="24" fill="rgba(0,0,0,0.15)"/>
  <g filter="url(#shadow)">
    <!-- Ears -->
    <circle cx="160" cy="140" r="48" fill="${primaryColor}"/>
    <circle cx="160" cy="140" r="28" fill="#fbcfe8"/>
    <circle cx="352" cy="140" r="48" fill="${primaryColor}"/>
    <circle cx="352" cy="140" r="28" fill="#fbcfe8"/>
    
    <!-- Body -->
    <ellipse cx="256" cy="330" rx="130" ry="115" fill="url(#bodyGrad)"/>
    <ellipse cx="256" cy="345" rx="80" ry="70" fill="#ffffff" opacity="0.9"/>
    
    <!-- Head -->
    <circle cx="256" cy="220" r="115" fill="url(#bodyGrad)"/>
    
    <!-- Cheeks -->
    <circle cx="185" cy="250" r="16" fill="#f43f5e" opacity="0.5"/>
    <circle cx="327" cy="250" r="16" fill="#f43f5e" opacity="0.5"/>
    
    <!-- Eyes -->
    <ellipse cx="205" cy="210" rx="16" ry="22" fill="#0f172a"/>
    <circle cx="211" cy="202" r="7" fill="#ffffff"/>
    <circle cx="202" cy="218" r="3" fill="#ffffff"/>
    
    <ellipse cx="307" cy="210" rx="16" ry="22" fill="#0f172a"/>
    <circle cx="313" cy="202" r="7" fill="#ffffff"/>
    <circle cx="304" cy="218" r="3" fill="#ffffff"/>
    
    <!-- Nose & Mouth -->
    <ellipse cx="256" cy="238" rx="10" ry="7" fill="#0f172a"/>
    <path d="M 244 248 Q 256 262 268 248" fill="none" stroke="#0f172a" stroke-width="5" stroke-linecap="round"/>
    
    <!-- Star Badge / Charm -->
    <path d="M 256 310 L 264 326 L 282 328 L 268 340 L 272 358 L 256 348 L 240 358 L 244 340 L 230 328 L 248 326 Z" fill="#fbbf24"/>
  </g>
  <text x="256" y="475" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-weight="900" font-size="24" fill="#334155">${name.slice(0, 16)}</text>
</svg>`;
  return Buffer.from(svg, "utf8");
}

/**
 * Generates an expressive procedural SVG state artwork for quiz stages
 */
export function generateProceduralStateArt(name: string, color: string, action: MascotActionType, framesCount: number = 1): Uint8Array {
  if (framesCount > 1) {
    return generateProceduralSpriteStrip(name, color, action, framesCount);
  }

  const primaryColor = color || "#06b6d4";
  let armLeft = `<ellipse cx="140" cy="330" rx="26" ry="18" fill="${primaryColor}"/>`;
  let armRight = `<ellipse cx="372" cy="330" rx="26" ry="18" fill="${primaryColor}"/>`;
  let mouth = `<path d="M 238 250 Q 256 266 274 250" fill="none" stroke="#0f172a" stroke-width="5" stroke-linecap="round"/>`;
  let eyeLeft = `<ellipse cx="205" cy="210" rx="16" ry="22" fill="#0f172a"/><circle cx="211" cy="202" r="7" fill="#ffffff"/><circle cx="202" cy="218" r="3" fill="#ffffff"/>`;
  let eyeRight = `<ellipse cx="307" cy="210" rx="16" ry="22" fill="#0f172a"/><circle cx="313" cy="202" r="7" fill="#ffffff"/><circle cx="304" cy="218" r="3" fill="#ffffff"/>`;
  let extraDecor = "";

  if (action === "wave" || action === "outro") {
    // Waving right hand up
    armRight = `<g transform="translate(372, 230) rotate(-45)"><ellipse cx="0" cy="0" rx="34" ry="18" fill="${primaryColor}"/><circle cx="24" cy="0" r="10" fill="#fbcfe8"/></g>`;
    mouth = `<path d="M 234 246 Q 256 274 278 246 Z" fill="#f43f5e" stroke="#0f172a" stroke-width="4"/>`;
    extraDecor = `<text x="420" y="190" font-size="36" fill="#fbbf24">✨</text>`;
  } else if (action === "thinking") {
    // Pondering with hand on chin & tilted eyes
    armRight = `<g transform="translate(310, 260) rotate(-75)"><ellipse cx="0" cy="0" rx="36" ry="18" fill="${primaryColor}"/></g>`;
    eyeLeft = `<ellipse cx="205" cy="204" rx="16" ry="18" fill="#0f172a"/><circle cx="209" cy="198" r="6" fill="#ffffff"/>`;
    eyeRight = `<ellipse cx="307" cy="204" rx="16" ry="18" fill="#0f172a"/><circle cx="311" cy="198" r="6" fill="#ffffff"/>`;
    mouth = `<path d="M 242 254 Q 256 248 270 254" fill="none" stroke="#0f172a" stroke-width="5" stroke-linecap="round"/>`;
    extraDecor = `<text x="360" y="140" font-size="44" font-weight="bold" fill="#fbbf24">❓</text>`;
  } else if (action === "celebrate") {
    // Both hands raised in victory, joyful jumping eyes
    armLeft = `<g transform="translate(130, 220) rotate(50)"><ellipse cx="0" cy="0" rx="36" ry="18" fill="${primaryColor}"/></g>`;
    armRight = `<g transform="translate(382, 220) rotate(-50)"><ellipse cx="0" cy="0" rx="36" ry="18" fill="${primaryColor}"/></g>`;
    eyeLeft = `<path d="M 190 216 Q 206 194 222 216" fill="none" stroke="#0f172a" stroke-width="7" stroke-linecap="round"/>`;
    eyeRight = `<path d="M 292 216 Q 308 194 324 216" fill="none" stroke="#0f172a" stroke-width="7" stroke-linecap="round"/>`;
    mouth = `<path d="M 230 244 Q 256 280 282 244 Z" fill="#f43f5e" stroke="#0f172a" stroke-width="4"/>`;
    extraDecor = `<text x="100" y="160" font-size="36">🎉</text><text x="380" y="160" font-size="36">⭐</text>`;
  } else if (action === "oops") {
    // Hand scratching head, comical sweatdrop
    armLeft = `<g transform="translate(170, 160) rotate(110)"><ellipse cx="0" cy="0" rx="36" ry="18" fill="${primaryColor}"/></g>`;
    mouth = `<path d="M 240 258 Q 256 242 272 258" fill="none" stroke="#0f172a" stroke-width="5" stroke-linecap="round"/>`;
    extraDecor = `<text x="350" y="150" font-size="40">💧</text>`;
  } else if (action === "point") {
    // Pointing right towards question
    armRight = `<g transform="translate(380, 270) rotate(-10)"><ellipse cx="20" cy="0" rx="42" ry="16" fill="${primaryColor}"/><rect x="54" y="-4" width="28" height="8" rx="4" fill="#fbbf24"/></g>`;
    mouth = `<path d="M 240 248 Q 256 268 272 248" fill="none" stroke="#0f172a" stroke-width="5" stroke-linecap="round"/>`;
    extraDecor = `<text x="430" y="275" font-size="32">👉</text>`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bodyGrad_${action}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${primaryColor}"/>
      <stop offset="100%" stop-color="#0284c7"/>
    </linearGradient>
    <filter id="shadow_${action}" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="rgba(0,0,0,0.3)"/>
    </filter>
  </defs>
  <rect width="512" height="512" rx="64" fill="none"/>
  <ellipse cx="256" cy="460" rx="140" ry="24" fill="rgba(0,0,0,0.15)"/>
  <g filter="url(#shadow_${action})">
    <!-- Ears -->
    <circle cx="160" cy="140" r="48" fill="${primaryColor}"/>
    <circle cx="160" cy="140" r="28" fill="#fbcfe8"/>
    <circle cx="352" cy="140" r="48" fill="${primaryColor}"/>
    <circle cx="352" cy="140" r="28" fill="#fbcfe8"/>
    
    <!-- Body -->
    <ellipse cx="256" cy="330" rx="130" ry="115" fill="url(#bodyGrad_${action})"/>
    <ellipse cx="256" cy="345" rx="80" ry="70" fill="#ffffff" opacity="0.9"/>
    
    <!-- Arms -->
    ${armLeft}
    ${armRight}
    
    <!-- Head -->
    <circle cx="256" cy="220" r="115" fill="url(#bodyGrad_${action})"/>
    
    <!-- Cheeks -->
    <circle cx="185" cy="250" r="16" fill="#f43f5e" opacity="0.5"/>
    <circle cx="327" cy="250" r="16" fill="#f43f5e" opacity="0.5"/>
    
    <!-- Eyes -->
    ${eyeLeft}
    ${eyeRight}
    
    <!-- Nose & Mouth -->
    <ellipse cx="256" cy="238" rx="10" ry="7" fill="#0f172a"/>
    ${mouth}
    
    <!-- Star Badge / Charm -->
    <path d="M 256 310 L 264 326 L 282 328 L 268 340 L 272 358 L 256 348 L 240 358 L 244 340 L 230 328 L 248 326 Z" fill="#fbbf24"/>
    ${extraDecor}
  </g>
</svg>`;
  return Buffer.from(svg, "utf8");
}

/**
 * Generates a multi-frame horizontal sprite strip SVG for testing / legacy fallback
 */
export function generateProceduralSpriteStrip(name: string, color: string, action: MascotActionType, framesCount: number): Uint8Array {
  const frameWidth = 256;
  const frameHeight = 256;
  const totalWidth = frameWidth * framesCount;
  const primaryColor = color || "#06b6d4";

  const framesSvg: string[] = [];

  for (let i = 0; i < framesCount; i++) {
    const offsetX = i * frameWidth;
    const progress = i / (framesCount - 1 || 1);

    // Dynamic offsets based on action
    let bounceY = 0;
    let armAngle = 0;
    let eyeScale = 1;

    if (action === "wave") {
      armAngle = Math.sin(progress * Math.PI * 2) * 35;
      bounceY = Math.abs(Math.sin(progress * Math.PI)) * -10;
    } else if (action === "thinking") {
      armAngle = -20 + progress * 10;
      bounceY = Math.sin(progress * Math.PI) * 4;
    } else if (action === "celebrate") {
      bounceY = -Math.abs(Math.sin(progress * Math.PI * 2)) * 25;
      armAngle = 45;
      eyeScale = 1.2;
    } else if (action === "idle") {
      bounceY = Math.sin(progress * Math.PI * 2) * 4;
    }

    framesSvg.push(`
      <g transform="translate(${offsetX}, ${bounceY})">
        <!-- Frame background guide for testing -->
        <rect x="0" y="0" width="${frameWidth}" height="${frameHeight}" fill="none"/>
        <ellipse cx="128" cy="225" rx="60" ry="10" fill="rgba(0,0,0,0.12)"/>
        
        <!-- Ears -->
        <circle cx="85" cy="75" r="24" fill="${primaryColor}"/>
        <circle cx="171" cy="75" r="24" fill="${primaryColor}"/>
        
        <!-- Body -->
        <ellipse cx="128" cy="170" rx="65" ry="55" fill="${primaryColor}"/>
        <ellipse cx="128" cy="180" rx="40" ry="35" fill="#ffffff" opacity="0.9"/>
        
        <!-- Head -->
        <circle cx="128" cy="115" r="58" fill="${primaryColor}"/>
        <circle cx="95" cy="128" r="8" fill="#f43f5e" opacity="0.5"/>
        <circle cx="161" cy="128" r="8" fill="#f43f5e" opacity="0.5"/>
        
        <!-- Eyes -->
        <ellipse cx="105" cy="110" rx="8" ry="${11 * eyeScale}" fill="#0f172a"/>
        <circle cx="108" cy="106" r="3.5" fill="#ffffff"/>
        <ellipse cx="151" cy="110" rx="8" ry="${11 * eyeScale}" fill="#0f172a"/>
        <circle cx="154" cy="106" r="3.5" fill="#ffffff"/>
        
        <!-- Animated Arm / Paw -->
        <g transform="translate(180, 160) rotate(${armAngle})">
          <ellipse cx="15" cy="0" rx="18" ry="10" fill="${primaryColor}"/>
        </g>
        <g transform="translate(76, 160) rotate(${-armAngle / 2})">
          <ellipse cx="-15" cy="0" rx="18" ry="10" fill="${primaryColor}"/>
        </g>
        
        <!-- Nose/Mouth -->
        <circle cx="128" cy="124" r="4" fill="#0f172a"/>
        <path d="M 122 130 Q 128 136 134 130" fill="none" stroke="#0f172a" stroke-width="2.5" stroke-linecap="round"/>
        
        <text x="128" y="248" text-anchor="middle" font-family="monospace" font-size="11" font-weight="bold" fill="#64748b">F${i + 1}</text>
      </g>
    `);
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${frameHeight}" width="${totalWidth}" height="${frameHeight}">
    <rect width="${totalWidth}" height="${frameHeight}" fill="none"/>
    ${framesSvg.join("")}
  </svg>`;

  return Buffer.from(svg, "utf8");
}
