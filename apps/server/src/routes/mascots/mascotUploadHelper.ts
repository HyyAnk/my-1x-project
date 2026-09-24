import { readFile } from "node:fs/promises";
import sharp, { type Metadata } from "sharp";
import {
  MascotProfileSchema,
  type MascotProfile,
  type MascotStyle,
  type UploadMascotConceptInput,
  type UploadMascotConceptResponse,
  type AnalyzeMascotConceptInput,
  type AnalyzeMascotConceptResponse,
  makeId,
  synthesizeLegacyCoreStyle,
} from "@studio/shared";
import type { RepositoryService } from "../../repository.js";
import type { StudioLogger } from "../../logger.js";
import { withMascotWriteLock } from "../../repository/mascots.js";
import { removeImageBackground } from "../../utils/imageMatting.js";
import { deletePreviousMascotAsset } from "../../quiz/mascot/generation/artGeneratorHelpers.js";
import {
  analyzeMascotConceptImage,
  extractOpaqueColorStats,
  type MascotVisionAiConfig,
} from "../../quiz/mascot/services/mascotVisionAnalyzer.js";

export interface MascotUploadContext {
  logger?: StudioLogger;
  aiConfig?: MascotVisionAiConfig;
}

export interface DecodedImageResult {
  rawPngBuffer: Buffer;
  extractedColor?: string;
}

function createHttpError(message: string, statusCode: number): Error {
  const error = new Error(message);
  Object.assign(error, { statusCode });
  return error;
}

export async function extractDominantColor(buffer: Buffer): Promise<string | undefined> {
  try {
    const stats = await extractOpaqueColorStats(buffer);
    return stats.dominantHex;
  } catch {
    // Dominant color extraction is best-effort
  }
  return undefined;
}

export function validateMagicBytes(buffer: Buffer): void {
  const isPng = buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;

  const isJpeg = buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;

  const isWebp =
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50;

  if (!isPng && !isJpeg && !isWebp) {
    throw createHttpError("Unsupported image format. Allowed formats: PNG, JPEG, WEBP", 400);
  }
}

export async function processAndValidateImagePayload(imageData: string, _declaredMimeType?: string): Promise<DecodedImageResult> {
  const dataUrlMatch = imageData.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.*)$/s);
  const base64Content = dataUrlMatch ? dataUrlMatch[2] : imageData;
  const sanitized = base64Content.replace(/\s+/g, "");

  if (!sanitized || !/^[A-Za-z0-9+/=]+$/.test(sanitized)) {
    throw createHttpError("Invalid base64 image data", 400);
  }

  const buffer = Buffer.from(sanitized, "base64");
  if (buffer.length < 8) {
    throw createHttpError("Corrupt or incomplete image payload", 400);
  }

  validateMagicBytes(buffer);

  let metadata: Metadata;
  try {
    metadata = await sharp(buffer, { failOn: "none" }).metadata();
  } catch {
    throw createHttpError("Corrupt image payload cannot be decoded", 400);
  }

  if (!metadata.width || !metadata.height || metadata.width <= 0 || metadata.height <= 0) {
    throw createHttpError("Invalid image dimensions", 400);
  }

  let sharpInstance = sharp(buffer);
  if (metadata.width > 2048 || metadata.height > 2048) {
    sharpInstance = sharpInstance.resize(2048, 2048, { fit: "inside", withoutEnlargement: true });
  }

  const rawPngBuffer = await sharpInstance.toFormat("png").toBuffer();
  const extractedColor = await extractDominantColor(rawPngBuffer);

  return { rawPngBuffer, extractedColor };
}

export function syncCoreStyleWithMasterConcept(mascot: MascotProfile, masterImageUrl: string, masterRawImageUrl: string): MascotStyle[] {
  const styles = mascot.styles && mascot.styles.length > 0 ? [...mascot.styles] : [];
  const coreIndex = styles.findIndex((s) => s.id === "core" || s.is_default === true);

  if (coreIndex >= 0) {
    const existingCore = styles[coreIndex];
    styles[coreIndex] = {
      ...existingCore,
      anchor_image_url: masterImageUrl,
      raw_anchor_image_url: masterRawImageUrl,
      style_revision: (existingCore.style_revision ?? 1) + 1,
      updated_at: new Date().toISOString(),
    };
  } else {
    const synthesized = synthesizeLegacyCoreStyle({
      ...mascot,
      master_image_url: masterImageUrl,
      master_raw_image_url: masterRawImageUrl,
    });
    styles.unshift(synthesized);
  }

  return styles;
}

export function syncRenderBundleMasterAsset(
  renderBundle: MascotProfile["render_bundle"],
  masterImageUrl: string,
): MascotProfile["render_bundle"] {
  if (!renderBundle) return undefined;
  const cloned = structuredClone(renderBundle);
  cloned.assets = {
    ...cloned.assets,
    master: {
      ...(cloned.assets.master ?? {
        version: 2,
        image_url: masterImageUrl,
        registration: {
          source_width: 512,
          source_height: 512,
          content_bounds: { x: 0, y: 0, width: 512, height: 512 },
          pivot: { x: 256, y: 512 },
          offset_x: 0,
          offset_y: 0,
        },
      }),
      image_url: masterImageUrl,
    },
  };
  return cloned;
}

async function resolveMattedBuffer(rawBuffer: Buffer, autoMatting?: boolean): Promise<Buffer> {
  if (autoMatting === false) return rawBuffer;
  try {
    const mattedBytes = await removeImageBackground(rawBuffer);
    return Buffer.from(mattedBytes);
  } catch {
    return rawBuffer;
  }
}

export async function handleExistingMascotConceptUpload(
  repository: RepositoryService,
  mascotId: string,
  input: UploadMascotConceptInput,
  context?: MascotUploadContext,
): Promise<UploadMascotConceptResponse> {
  const existingMascot = await repository.getMascot(mascotId);
  const { rawPngBuffer, extractedColor: localColor } = await processAndValidateImagePayload(input.image_data, input.mime_type);

  const visionAnalysis = await analyzeMascotConceptImage(rawPngBuffer, {
    logger: context?.logger,
    aiConfig: context?.aiConfig,
    mimeType: "image/png",
    name: input.name || existingMascot.name,
  });

  const dominantColor = input.color_theme || visionAnalysis.dominant_color || localColor || existingMascot.color_theme;
  const visualStyle =
    input.visual_style || (existingMascot.visual_style ? existingMascot.visual_style : visionAnalysis.suggested_visual_style);

  return withMascotWriteLock(mascotId, async () => {
    const current = await repository.getMascot(mascotId).catch(() => existingMascot);
    const timestamp = Date.now();
    const rawFilename = `master_concept_raw_${timestamp}.png`;
    const mattedFilename = `master_concept_${timestamp}.png`;

    deletePreviousMascotAsset(repository, mascotId, current.master_image_url, mattedFilename);
    deletePreviousMascotAsset(
      repository,
      mascotId,
      current.master_raw_image_url || current.master_image_url?.replace("master_concept_", "master_concept_raw_"),
      rawFilename,
    );

    const masterRawImageUrl = await repository.saveMascotAsset(mascotId, rawFilename, rawPngBuffer);
    const mattedPngBuffer = await resolveMattedBuffer(rawPngBuffer, input.auto_matting);
    const masterImageUrl = await repository.saveMascotAsset(mascotId, mattedFilename, mattedPngBuffer);

    const updatedStyles = syncCoreStyleWithMasterConcept(current, masterImageUrl, masterRawImageUrl);
    const updatedRenderBundle = syncRenderBundleMasterAsset(current.render_bundle, masterImageUrl);

    const updatedProfile: MascotProfile = {
      ...current,
      id: mascotId,
      name: input.name?.trim() ? input.name.trim() : current.name,
      description: input.description !== undefined ? input.description : current.description,
      color_theme: dominantColor,
      visual_style: visualStyle,
      master_prompt: current.master_prompt || visionAnalysis.suggested_master_prompt || "",
      master_image_url: masterImageUrl,
      master_raw_image_url: masterRawImageUrl,
      concept_origin: "user_uploaded",
      styles: updatedStyles,
      ...(updatedRenderBundle ? { render_bundle: updatedRenderBundle } : {}),
      updated_at: new Date().toISOString(),
    };

    const savedMascot = await repository.saveMascot(updatedProfile);

    return {
      mascot: MascotProfileSchema.parse(savedMascot),
      master_image_url: masterImageUrl,
      master_raw_image_url: masterRawImageUrl,
      extracted_color: visionAnalysis.dominant_color || localColor,
      extracted_tags: visionAnalysis.tags,
    };
  });
}

export async function handleNewMascotConceptUpload(
  repository: RepositoryService,
  input: UploadMascotConceptInput,
  context?: MascotUploadContext,
): Promise<UploadMascotConceptResponse> {
  const { rawPngBuffer, extractedColor: localColor } = await processAndValidateImagePayload(input.image_data, input.mime_type);
  const mascotId = makeId("mascot");

  const visionAnalysis = await analyzeMascotConceptImage(rawPngBuffer, {
    logger: context?.logger,
    aiConfig: context?.aiConfig,
    mimeType: "image/png",
    name: input.name,
  });

  return withMascotWriteLock(mascotId, async () => {
    const timestamp = Date.now();
    const rawFilename = `master_concept_raw_${timestamp}.png`;
    const mattedFilename = `master_concept_${timestamp}.png`;

    const masterRawImageUrl = await repository.saveMascotAsset(mascotId, rawFilename, rawPngBuffer);
    const mattedPngBuffer = await resolveMattedBuffer(rawPngBuffer, input.auto_matting);
    const masterImageUrl = await repository.saveMascotAsset(mascotId, mattedFilename, mattedPngBuffer);

    const colorTheme = input.color_theme || visionAnalysis.dominant_color || localColor || "#06b6d4";
    const visualStyle = input.visual_style ?? visionAnalysis.suggested_visual_style ?? "pixar_3d";
    const newProfile: Partial<MascotProfile> & { name: string } = {
      id: mascotId,
      name: input.name?.trim() ? input.name.trim() : "Custom Mascot",
      description: input.description ?? "",
      color_theme: colorTheme,
      visual_style: visualStyle,
      master_image_url: masterImageUrl,
      master_raw_image_url: masterRawImageUrl,
      concept_origin: "user_uploaded",
      master_prompt: visionAnalysis.suggested_master_prompt || "",
    };

    const coreStyle = synthesizeLegacyCoreStyle({
      ...newProfile,
      master_image_url: masterImageUrl,
      master_raw_image_url: masterRawImageUrl,
    });
    newProfile.styles = [coreStyle];
    newProfile.active_style_id = "core";

    const savedMascot = await repository.saveMascot(newProfile);

    return {
      mascot: MascotProfileSchema.parse(savedMascot),
      master_image_url: masterImageUrl,
      master_raw_image_url: masterRawImageUrl,
      extracted_color: visionAnalysis.dominant_color || localColor,
      extracted_tags: visionAnalysis.tags,
    };
  });
}

export async function handleAnalyzeExistingMascotConcept(
  repository: RepositoryService,
  mascotId: string,
  input?: AnalyzeMascotConceptInput,
  context?: MascotUploadContext,
): Promise<AnalyzeMascotConceptResponse> {
  const mascot = await repository.getMascot(mascotId);
  const targetUrl = mascot.master_raw_image_url || mascot.master_image_url;
  if (!targetUrl) {
    throw createHttpError("Mascot has no master concept image to analyze", 400);
  }

  const filename = targetUrl.split("/").pop();
  if (!filename) {
    throw createHttpError("Invalid master concept asset filename", 400);
  }

  const assetFile = await repository.getMascotAssetFile(mascotId, filename);
  const imageBuffer = await readFile(assetFile.absolutePath);

  const aiConfig = input?.force_ai ? { ...context?.aiConfig, enabled: true } : context?.aiConfig;

  const analysis = await analyzeMascotConceptImage(imageBuffer, {
    logger: context?.logger,
    aiConfig,
    name: mascot.name,
  });

  if (input?.save) {
    await withMascotWriteLock(mascotId, async () => {
      const current = await repository.getMascot(mascotId);
      const updated: MascotProfile = {
        ...current,
        color_theme: current.color_theme || analysis.dominant_color,
        master_prompt: current.master_prompt || analysis.suggested_master_prompt,
        updated_at: new Date().toISOString(),
      };
      await repository.saveMascot(updated);
    });
  }

  return {
    mascot_id: mascot.id,
    analysis,
    extracted_color: analysis.dominant_color,
    extracted_tags: analysis.tags,
  };
}
