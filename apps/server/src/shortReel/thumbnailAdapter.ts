import path from "node:path";
import sharp from "sharp";
import { ReelCoverPayloadSchema, type ReelCoverPayload, type ReelKey, type ShortReelRecord } from "@studio/shared";
import type { RepositoryService } from "../repository/service.js";
import { storePackageAsset, readBoundedAsset } from "./packageAssets.js";
import { validateImageBuffer } from "./packageImage.js";
import { runBoundedPackageProvider } from "./packageProvider.js";
import { ScriptGenerationError } from "./scriptProvider.js";
import { requireCompleteShortReelSource } from "../repository/shortReelSourcePolicy.js";
import type { ImageProvider } from "../providers/index.js";
import { loadShortReelLocalizationArtifact, type ProductLocalizationArtifact } from "../quiz/bank/localization/productLocalization.js";

export type CoverErrorCode = "INVALID_COVER_SOURCE" | "COVER_GENERATION_FAILED" | "INVALID_DIMENSIONS" | "PROVIDER_ERROR";

export class CoverGenerationError extends Error {
  constructor(
    public readonly code: CoverErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "CoverGenerationError";
  }
}

export interface CoverGenerationOptions {
  imageProvider?: ImageProvider;
  signal?: AbortSignal;
  timeoutMs?: number;
  localization?: ProductLocalizationArtifact | null;
}

/**
 * Compiles a 9:16 portrait prompt suitable for Short-Reel cover generation.
 */
export function compileCoverPrompt(record: ShortReelRecord, localizedThumbnailText?: string): string {
  const inSceneQuestion = localizedThumbnailText || record.source.question_text;
  return [
    "9:16 portrait cover art, high resolution 1080x1920, vertical composition.",
    `Title: ${record.topic.title}`,
    `Premise: ${record.topic.premise}`,
    `In-Scene Question: "${inSceneQuestion}"`,
    `Canonical answer: ${JSON.stringify(record.source.selected_answer_text)}`,
    ...(record.units.references.last_accepted_payload?.references ?? []).map(
      (reference) =>
        `Selected ${reference.role} reference: ${reference.path} (SHA-256 ${reference.checksum}). Preserve this selected identity and visual direction.`,
    ),
    "Style: Stylized 3D cinematic lighting, sharp focus, vibrant contrast, eye-catching thumbnail design.",
    "Do not render landscape frames; full frame must fit 1080x1920 vertical canvas.",
  ].join(" ");
}

/**
 * Produces a true 1080x1920 cover image for the given Short-Reel.
 * If an external image provider is supplied, resizes with fit: 'cover' without stretching.
 * Preserves original reference assets without modification.
 */
export async function generateReelCoverImage(
  repository: RepositoryService,
  key: ReelKey,
  options?: CoverGenerationOptions,
  snapshot?: ShortReelRecord,
): Promise<ReelCoverPayload> {
  const reel = snapshot ?? (await repository.getShortReel(key));
  const storageRoot = repository.storageRoot;
  requireCompleteShortReelSource(reel.source);

  let coverBuffer: Buffer;
  const mimeType = "image/png";

  if (options?.imageProvider) {
    try {
      const localization = options?.localization ?? (await loadShortReelLocalizationArtifact(repository, key.channel_id, key.reel_id));
      const prompt = compileCoverPrompt(reel, localization?.thumbnail_text);
      const provider = options.imageProvider;
      const generated = await runBoundedPackageProvider(
        (signal) => provider.generateReference(prompt, signal),
        options.signal,
        options.timeoutMs,
      );
      if (repository.storageRoot !== storageRoot)
        throw new CoverGenerationError("INVALID_COVER_SOURCE", "Storage changed during generation.");
      if (generated.degraded) throw new CoverGenerationError("COVER_GENERATION_FAILED", "Provider returned degraded placeholder content.");
      const sourceFile = path.isAbsolute(generated.asset_path)
        ? generated.asset_path
        : path.resolve(repository.storageRoot, generated.asset_path);
      await repository.assertRealPathInside(repository.storageRoot, sourceFile);
      const raw = await readBoundedAsset(repository, repository.storageRoot, sourceFile);
      await validateImageBuffer(raw, "mascot");

      // Ensure exact 1080x1920 dimensions without stretching (crop/cover fit)
      coverBuffer = await sharp(raw).resize({ width: 1080, height: 1920, fit: "cover", position: "center" }).png().toBuffer();
    } catch (error) {
      if (error instanceof ScriptGenerationError || error instanceof CoverGenerationError) throw error;
      throw new CoverGenerationError("PROVIDER_ERROR", "Image provider failed to generate a valid cover. Retry generation.");
    }
  } else {
    throw new CoverGenerationError("PROVIDER_ERROR", "A configured image provider is required. No substitute cover was generated.");
  }

  // Verify dimensions
  const meta = await sharp(coverBuffer).metadata();
  if (meta.width !== 1080 || meta.height !== 1920) {
    throw new CoverGenerationError("INVALID_DIMENSIONS", `Cover dimensions must be exactly 1080x1920; got ${meta.width}x${meta.height}.`);
  }

  if (options?.signal?.aborted) throw new ScriptGenerationError("ABORTED", "Cover generation was cancelled.");
  if (repository.storageRoot !== storageRoot) throw new CoverGenerationError("INVALID_COVER_SOURCE", "Storage changed during generation.");
  const stored = await storePackageAsset(repository, key, "cover", "png", coverBuffer);

  return ReelCoverPayloadSchema.parse({
    ...stored,
    mime_type: mimeType,
    width: 1080,
    height: 1920,
  });
}
