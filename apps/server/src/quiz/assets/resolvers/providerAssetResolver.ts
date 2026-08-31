import type { QuizAssetPlan, QuizAssetResolution } from "@studio/shared";
import type { RepositoryService } from "../../../repository.js";
import { StudioLogger } from "../../../logger.js";
import { Gpti2QuizImageProvider } from "../../../providers/gpti2Image.js";
import { ShopAiKeyQuizImageProvider } from "../../../providers/shopAiKeyImage.js";
import { AntigravityImageChainProvider } from "../../../providers/antigravityImageChain.js";
import { isContentFilterError, extractFilterReason, sanitizeImagePromptWithLLM } from "../../../utils/promptSanitizer.js";
import type { AntigravityClient } from "../../../antigravity.js";

type ProviderAssetInput = {
  repository: RepositoryService;
  channelId: string;
  episodeId: string;
  request: QuizAssetPlan["assets"][number];
  fingerprint: string;
  compiledPrompt: string;
  configuredProvider: string;
  activeEngine: "codex" | "antigravity";
  antigravityClient?: AntigravityClient;
  imageConfig?: {
    api_key?: string;
    model?: string;
    provider?: "gpti2" | "shopaikey" | "custom";
    base_url?: string;
    quality?: string;
  };
  logger: StudioLogger;
};

export type ProviderAssetOutput = {
  entry: QuizAssetResolution["assets"][number];
  tier3Fallback: boolean;
};

async function generateGpti2Asset(input: ProviderAssetInput): Promise<ProviderAssetOutput> {
  const { repository, channelId, episodeId, request, fingerprint, compiledPrompt, imageConfig, antigravityClient, logger } = input;
  const provider = new Gpti2QuizImageProvider(
    repository,
    { channelId, episodeId },
    { apiKey: imageConfig?.api_key, model: imageConfig?.model },
  );
  let currentPrompt = compiledPrompt;
  let generated: { path: string } | null = null;
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      generated = await provider.generateAsset({
        assetId: request.asset_id,
        fingerprint,
        prompt: currentPrompt,
        aspect_ratio: request.aspect_ratio,
      });
      break;
    } catch (err) {
      if (isContentFilterError(err) && attempt < maxAttempts && antigravityClient) {
        const reason = extractFilterReason(err);
        logger.warn(`Quiz asset ${request.asset_id} rejected by content filter (${reason}). Auto-rephrasing...`, { profileId: channelId, workerId: episodeId });
        const rephrased = await sanitizeImagePromptWithLLM({
          client: antigravityClient,
          originalPrompt: currentPrompt,
          rejectionReason: reason,
          context: `Quiz visual asset for question ${request.asset_id}`,
        });
        if (rephrased && rephrased !== currentPrompt) {
          currentPrompt = rephrased;
          continue;
        }
      }
      if (attempt < maxAttempts) {
        logger.warn(`Quiz asset ${request.asset_id} generation attempt ${attempt} failed (${err instanceof Error ? err.message : String(err)}). Retrying in ${attempt * 500}ms...`, { profileId: channelId, workerId: episodeId });
        await new Promise((resolve) => setTimeout(resolve, attempt * 500));
        continue;
      }
      throw err;
    }
  }
  if (!generated) throw new Error(`Failed to generate asset ${request.asset_id}`);
  return {
    entry: { ...request, fingerprint, path: generated.path, source: "provider" },
    tier3Fallback: false,
  };
}

async function generateShopAiKeyAsset(input: ProviderAssetInput): Promise<ProviderAssetOutput> {
  const { repository, channelId, episodeId, request, fingerprint, compiledPrompt, configuredProvider, imageConfig, logger } = input;
  const provider = new ShopAiKeyQuizImageProvider(
    repository,
    { channelId, episodeId },
    {
      apiKey: imageConfig?.api_key || process.env.SHOPAIKEY_API_KEY,
      baseUrl: imageConfig?.base_url || (configuredProvider === "shopaikey" ? "https://direct.shopaikey.com/v1" : "https://api.openai.com/v1"),
      model: imageConfig?.model || "gpt-image-2",
      quality: imageConfig?.quality,
    },
  );
  let generated: Awaited<ReturnType<typeof provider.generateAsset>> | null = null;
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      generated = await provider.generateAsset({ assetId: request.asset_id, fingerprint, prompt: compiledPrompt });
      break;
    } catch (err) {
      if (attempt < maxAttempts) {
        logger.warn(`Quiz asset ${request.asset_id} ${configuredProvider} generation attempt ${attempt} failed (${err instanceof Error ? err.message : String(err)}). Retrying in ${attempt * 500}ms...`, { profileId: channelId, workerId: episodeId });
        await new Promise((resolve) => setTimeout(resolve, attempt * 500));
        continue;
      }
      throw err;
    }
  }
  if (!generated) throw new Error(`Failed to generate ${configuredProvider} asset ${request.asset_id}`);
  return {
    entry: { ...request, fingerprint, path: generated.path, source: "provider" },
    tier3Fallback: false,
  };
}

async function generateAntigravityAsset(input: ProviderAssetInput): Promise<ProviderAssetOutput> {
  const { repository, channelId, episodeId, request, fingerprint, compiledPrompt, antigravityClient, logger } = input;
  const episode = await repository.getEpisode(channelId, episodeId);
  const chainProvider = new AntigravityImageChainProvider(repository, {
    channelId,
    episodeId,
    assetId: request.asset_id,
    fingerprint,
    theme: episode.quiz_config.visual_theme,
  }, antigravityClient, { allowTier3Fallback: false });
  let result: Awaited<ReturnType<typeof chainProvider.generateReference>> | null = null;
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      result = await chainProvider.generateReference(compiledPrompt);
      break;
    } catch (err) {
      if (attempt < maxAttempts) {
        logger.warn(`Quiz asset ${request.asset_id} Antigravity generation attempt ${attempt} failed (${err instanceof Error ? err.message : String(err)}). Retrying in ${attempt * 500}ms...`, { profileId: channelId, workerId: episodeId });
        await new Promise((resolve) => setTimeout(resolve, attempt * 500));
        continue;
      }
      throw err;
    }
  }
  if (!result) throw new Error(`Failed to generate Antigravity asset ${request.asset_id}`);
  const isTier3 = Boolean(result.degraded || result.fallback_tier === 3);
  return {
    entry: {
      ...request,
      fingerprint,
      path: result.asset_path,
      source: result.fallback_tier === 3 ? "fallback" : "provider",
      fallback_tier: result.fallback_tier,
      degraded: result.degraded,
    },
    tier3Fallback: isTier3,
  };
}

export async function generateAssetWithProvider(input: ProviderAssetInput): Promise<ProviderAssetOutput> {
  const { configuredProvider, activeEngine, imageConfig } = input;

  if (configuredProvider === "gpti2" && Gpti2QuizImageProvider.isConfigured(imageConfig?.api_key)) {
    return generateGpti2Asset(input);
  }

  if ((configuredProvider === "shopaikey" || configuredProvider === "custom") && (imageConfig?.api_key || ShopAiKeyQuizImageProvider.isConfigured())) {
    return generateShopAiKeyAsset(input);
  }

  if (activeEngine === "antigravity") {
    return generateAntigravityAsset(input);
  }

  if (ShopAiKeyQuizImageProvider.isConfigured(imageConfig?.api_key)) {
    return generateShopAiKeyAsset(input);
  }

  throw new Error("PROVIDER_UNAVAILABLE");
}
