import type { AppConfig, MascotProfile } from "@studio/shared";
import type { RepositoryService } from "../../../repository.js";
import type { StudioLogger } from "../../../logger.js";
import { withMascotWriteLock } from "../../../repository/mascots.js";
import { buildMascotStyleConceptPrompt } from "../../mascotPromptContract.js";
import { generateProceduralMascotArt } from "../proceduralArt.js";
import { generateMascotArtWithFallback } from "../services/mascotAiImageClient.js";
import { loadMasterReferenceImageBase64 } from "../services/mascotAssetLoader.js";
import { hasMeaningfulPngTransparency } from "../../../utils/imageMatting.js";
import { deletePreviousMascotAsset } from "./artGeneratorHelpers.js";

export async function generateMascotStyleConcept(
  repository: RepositoryService,
  mascot: MascotProfile,
  styleId: string,
  imageConfig: AppConfig["image_generation"],
  options: { prompt: string; signal?: AbortSignal; imageFallbackConfig?: AppConfig["image_fallback"] },
  logger?: StudioLogger,
): Promise<{
  anchor_image_url: string;
  raw_anchor_image_url?: string;
  raw_image_url: string;
  prompt_used: string;
  placeholder: boolean;
}> {
  const style = mascot.styles?.find((s) => s.id === styleId);
  if (!style) throw new Error(`Style ${styleId} not found`);

  const referenceImageBase64 = await loadMasterReferenceImageBase64(repository, mascot, logger);
  const fullPrompt = buildMascotStyleConceptPrompt(mascot, options.prompt);

  const timestamp = Date.now();
  const mattedFilename = `style_${styleId}_anchor_${timestamp}.png`;
  const rawFilename = `style_${styleId}_anchor_raw_${timestamp}.png`;

  const { mattedBytes, rawBytes, placeholder } = await generateMascotArtWithFallback({
    prompt: fullPrompt,
    hasReferenceImage: Boolean(referenceImageBase64),
    imageConfig,
    imageFallbackConfig: options.imageFallbackConfig,
    options: {
      aspectRatio: "1:1",
      size: "1024x1024",
      referenceImageBase64,
      background: "opaque",
      cancellationSignal: options.signal,
      idempotencyKey: `mascot_${mascot.id}_${styleId}_anchor_${timestamp}`,
    },
    logger,
    logContext: { profileId: mascot.id, styleId, hasRefImage: Boolean(referenceImageBase64) },
    actionLabel: `mascot style concept for ${mascot.name} style ${style.name} (${styleId})`,
    fallbackArt: () => generateProceduralMascotArt(mascot.name, mascot.color_theme, `style_${styleId}`),
  });
  options.signal?.throwIfAborted();

  if (!hasMeaningfulPngTransparency(mattedBytes)) {
    throw new Error("Style concept background removal did not produce a transparent PNG cutout");
  }

  const { anchor_image_url, raw_image_url } = await withMascotWriteLock(mascot.id, async () => {
    options.signal?.throwIfAborted();
    deletePreviousMascotAsset(repository, mascot.id, style.anchor_image_url, mattedFilename);
    deletePreviousMascotAsset(repository, mascot.id, style.anchor_image_url?.replace("_anchor_", "_anchor_raw_"), rawFilename);

    const savedAnchorUrl = await repository.saveMascotAsset(mascot.id, mattedFilename, mattedBytes);
    options.signal?.throwIfAborted();
    const savedRawUrl = await repository.saveMascotAsset(mascot.id, rawFilename, rawBytes);
    options.signal?.throwIfAborted();

    if (typeof repository.getMascot === "function" && typeof repository.saveMascot === "function") {
      const latest = await repository.getMascot(mascot.id).catch(() => mascot);
      const updatedStyles = (latest.styles || []).map((s) =>
        s.id === styleId
          ? {
              ...s,
              keyword: options.prompt.trim(),
              anchor_image_url: savedAnchorUrl,
              raw_anchor_image_url: savedRawUrl,
              style_revision: (s.style_revision ?? 1) + 1,
              updated_at: new Date().toISOString(),
            }
          : s,
      );
      options.signal?.throwIfAborted();
      await repository.saveMascot({ ...latest, styles: updatedStyles, updated_at: new Date().toISOString() });
    }

    return { anchor_image_url: savedAnchorUrl, raw_image_url: savedRawUrl };
  });

  return {
    anchor_image_url,
    raw_anchor_image_url: raw_image_url,
    raw_image_url,
    prompt_used: fullPrompt,
    placeholder,
  };
}
