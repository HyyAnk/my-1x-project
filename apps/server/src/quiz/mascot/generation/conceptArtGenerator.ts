import type { AppConfig, MascotProfile } from "@studio/shared";
import type { RepositoryService } from "../../../repository.js";
import type { StudioLogger } from "../../../logger.js";
import { withMascotWriteLock } from "../../../repository/mascots.js";
import { buildMascotConceptPrompt } from "../../mascotPromptContract.js";
import { generateProceduralMascotArt } from "../proceduralArt.js";
import { generateMascotArtWithFallback } from "../services/mascotAiImageClient.js";
import { deletePreviousMascotAsset } from "./artGeneratorHelpers.js";

export async function generateMascotConceptArt(
  repository: RepositoryService,
  mascot: MascotProfile,
  imageConfig: AppConfig["image_generation"],
  overridePrompt?: string,
  logger?: StudioLogger,
  imageFallbackConfig?: AppConfig["image_fallback"],
): Promise<{ master_image_url: string; master_raw_image_url?: string; prompt_used: string; placeholder: boolean }> {
  const fullPrompt = buildMascotConceptPrompt(mascot, overridePrompt);
  const timestamp = Date.now();
  const filename = `master_concept_${timestamp}.png`;
  const rawFilename = `master_concept_raw_${timestamp}.png`;

  const { mattedBytes, rawBytes, placeholder } = await generateMascotArtWithFallback({
    prompt: fullPrompt,
    imageConfig,
    imageFallbackConfig,
    options: {
      aspectRatio: "1:1",
      size: "1024x1024",
      background: "opaque",
    },
    logger,
    logContext: { profileId: mascot.id },
    actionLabel: `mascot concept for ${mascot.name} (${mascot.id})`,
    fallbackArt: () => generateProceduralMascotArt(mascot.name, mascot.color_theme, "master"),
  });

  const {
    assetUrl,
    rawAssetUrl,
    prompt_used: promptUsed,
  } = await withMascotWriteLock(mascot.id, async () => {
    deletePreviousMascotAsset(repository, mascot.id, mascot.master_image_url, filename);
    deletePreviousMascotAsset(
      repository,
      mascot.id,
      mascot.master_raw_image_url || mascot.master_image_url?.replace("master_concept_", "master_concept_raw_"),
      rawFilename,
    );
    const savedUrl = await repository.saveMascotAsset(mascot.id, filename, mattedBytes);
    const savedRawUrl = await repository.saveMascotAsset(mascot.id, rawFilename, rawBytes);
    const latest = await repository.getMascot(mascot.id).catch(() => mascot);
    await repository.saveMascot({
      ...latest,
      master_image_url: savedUrl,
      master_raw_image_url: savedRawUrl,
      master_prompt: overridePrompt || latest.master_prompt || latest.description || "",
      updated_at: new Date().toISOString(),
    });
    return { assetUrl: savedUrl, rawAssetUrl: savedRawUrl, prompt_used: fullPrompt };
  });

  return { master_image_url: assetUrl, master_raw_image_url: rawAssetUrl, prompt_used: promptUsed, placeholder };
}
