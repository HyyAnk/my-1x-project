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
import type { RepositoryService } from "../repository.js";
import type { StudioLogger } from "../logger.js";
import { createZipArchive, parseZipArchive } from "./zipHelper.js";
import { removeImageBackground } from "../utils/imageMatting.js";

const STYLE_PROMPTS: Record<QuizImageStyle, string> = {
  pixar_3d: "3D Pixar animation style, soft volumetric lighting, smooth stylized textures, cute rounded features, vibrant saturated colors, cinema 4D octane render, highly expressive",
  flat_vector: "2D flat vector art, clean bold outlines, solid color blocks, minimalist modern mascot, sticker style",
  kawaii_chibi: "Chibi kawaii anime style, oversized cute sparkling eyes, mini body, joyful expression, pastel accents, cute anime mascot",
  voxel_lowpoly: "Voxel art 3D low-poly style, isometric grid cubes, playful blocky character, vibrant lighting",
  plastic_toy: "Glossy vinyl designer toy style, smooth plastic reflections, pop mart blind box aesthetic, studio lighting",
};

export async function generateMascotConceptArt(
  repository: RepositoryService,
  mascot: MascotProfile,
  imageConfig: AppConfig["image_generation"],
  overridePrompt?: string,
  logger?: StudioLogger,
): Promise<{ master_image_url: string; prompt_used: string }> {
  const styleDesc = STYLE_PROMPTS[mascot.visual_style] || STYLE_PROMPTS.pixar_3d;
  const userPrompt = overridePrompt?.trim() || mascot.master_prompt?.trim() || mascot.description?.trim() || `${mascot.name} cute friendly animal companion`;
  const fullPrompt = `Full-body 3D character design concept art of ${userPrompt}. Single centered subject standing proudly facing camera, cute chibi proportions (1:2 head-to-body), large expressive sparkling eyes, friendly and joyful expression. Primary color theme ${mascot.color_theme || "#06b6d4"}. ${styleDesc}. Solid clean white seamless background, high contrast studio rim lighting, sharp clean silhouette, master character sheet.`;

  let imageBytes: Uint8Array;
  const filename = `master_concept_${Date.now()}.png`;

  if (imageConfig.enabled && imageConfig.api_key) {
    try {
      logger?.info(`Generating mascot concept for ${mascot.name} (${mascot.id})`, { profileId: mascot.id });
      const result = await generateGpti2ImageBytes(fullPrompt, {
        apiKey: imageConfig.api_key,
        aspect_ratio: "1:1",
        size: "1024x1024",
        model: imageConfig.model || "gpt-image-2",
        cancellationSignal: AbortSignal.timeout(60_000),
      });
      imageBytes = await removeImageBackground(result.bytes);
    } catch (err) {
      logger?.warn(`Mascot concept API failed, using procedural fallback: ${err instanceof Error ? err.message : String(err)}`, { profileId: mascot.id });
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
    master_prompt: userPrompt,
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
  const framesCount = options.frames_count || meta.defaultFrames || 6;
  const fps = options.fps || meta.defaultFps || 8;
  const loop = options.loop !== undefined ? options.loop : true;

  const styleDesc = STYLE_PROMPTS[mascot.visual_style] || STYLE_PROMPTS.pixar_3d;
  const baseDesc = mascot.master_prompt || mascot.description || mascot.name;
  const actionSpecific = options.prompt?.trim() || meta.description;

  const characterDna = [
    `Character Identity: "${mascot.name}"`,
    `Master Character Design: ${baseDesc}`,
    `Color Palette: Primary theme ${mascot.color_theme || "#06b6d4"}`,
    `Anatomy & Proportions: Chibi 1:2 head-to-body proportion, large expressive sparkling eyes, ${styleDesc}`,
    `STRICT CONTINUITY ANCHOR: Exactly the same character face, costume, colors, and accessories as master concept. Do not change character design.`,
  ].join(". ");

  const fullPrompt = framesCount === 1
    ? `Full-body hero action pose of character "${mascot.name}". ${characterDna}. Expressive pose: ${actionSpecific}. Single centered subject facing camera, dynamic energetic posture, sharp clean silhouette. Solid clean white background, uniform studio lighting.`
    : `Horizontal 2D sprite strip keyframe breakdown of character "${mascot.name}". ${characterDna}. Performing ${action} action: ${actionSpecific}. Exactly ${framesCount} sequential keyframe animation poses arranged horizontally in 1 row from left to right. Frame 1 to ${framesCount} smooth continuous loop motion animation. Solid clean white seamless background, uniform studio lighting, consistent character proportion across all frames.`;

  let spriteBytes: Uint8Array;
  const filename = `sprite_${action}_${Date.now()}.png`;
  const frameWidth = 256;
  const frameHeight = 256;

  if (imageConfig.enabled && imageConfig.api_key) {
    try {
      logger?.info(`Generating mascot sprite for ${mascot.name} action ${action}`, { profileId: mascot.id });
      const result = await generateGpti2ImageBytes(fullPrompt, {
        apiKey: imageConfig.api_key,
        aspect_ratio: framesCount === 1 ? "1:1" : "16:9",
        size: framesCount === 1 ? "1024x1024" : "1280x720",
        model: imageConfig.model || "gpt-image-2",
        cancellationSignal: AbortSignal.timeout(90_000),
      });
      spriteBytes = await removeImageBackground(result.bytes);
    } catch (err) {
      logger?.warn(`Mascot sprite API failed, using procedural fallback: ${err instanceof Error ? err.message : String(err)}`, { profileId: mascot.id });
      spriteBytes = generateProceduralSpriteStrip(mascot.name, mascot.color_theme, action, framesCount);
    }
  } else {
    spriteBytes = generateProceduralSpriteStrip(mascot.name, mascot.color_theme, action, framesCount);
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
        } catch {
          // Ignore if file read fails
        }
      }
    }
  }

  const actionsToProcess = target === "all"
    ? ALL_MASCOT_ACTIONS
    : target !== "master"
    ? [target as MascotActionType]
    : [];

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
        } catch {
          // Ignore if file read fails
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
export async function importMascotPackage(
  repository: RepositoryService,
  zipBuffer: Buffer,
): Promise<MascotProfile> {
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
    const newUrl = await repository.saveMascotAsset(newMascot.id, cleanFilename, asset.data);
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
    actions: importedActions as any,
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
 * Generates a multi-frame horizontal sprite strip SVG for testing / fallback
 */
export function generateProceduralSpriteStrip(
  name: string,
  color: string,
  action: MascotActionType,
  framesCount: number,
): Uint8Array {
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
