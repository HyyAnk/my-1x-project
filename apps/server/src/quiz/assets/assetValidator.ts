import { readFile } from "node:fs/promises";
import sharp from "sharp";
import type { QuizAssetPlan, QuizAssetResolution, QuizImageStyle } from "@studio/shared";
import type { RepositoryService } from "../../repository.js";
import { Gpti2QuizImageProvider } from "../../providers/gpti2Image.js";
import { ShopAiKeyQuizImageProvider } from "../../providers/shopAiKeyImage.js";
import { assetFingerprint } from "./assetFingerprint.js";
import { compileQuizAssetPrompt } from "./promptCompiler.js";
import {
  getRecommendationForAssetRequirement,
  validateQuizImageBytes,
} from "./imageMetadataValidator.js";

export function resolveQuizImageProviderName(input: {
  imageConfig?: {
    api_key?: string;
    model?: string;
    provider?: "gpti2" | "shopaikey" | "custom" | "imgstudio";
    base_url?: string;
    quality?: string;
  };
  activeEngine?: "codex" | "antigravity";
}): string {
  const configuredProvider = input.imageConfig?.provider ?? "gpti2";
  const activeEngine = input.activeEngine ?? "codex";
  return configuredProvider === "gpti2" && Gpti2QuizImageProvider.isConfigured(input.imageConfig?.api_key)
    ? "gpti2"
    : configuredProvider === "imgstudio" && (input.imageConfig?.api_key || process.env.IMGSTUDIO_API_KEY)
    ? "imgstudio"
    : configuredProvider === "shopaikey" && (input.imageConfig?.api_key || ShopAiKeyQuizImageProvider.isConfigured())
    ? "shopaikey"
    : configuredProvider === "custom" && input.imageConfig?.api_key
    ? "custom"
    : activeEngine === "antigravity"
    ? "antigravity-chain"
    : ShopAiKeyQuizImageProvider.isConfigured(input.imageConfig?.api_key)
    ? "shopaikey"
    : "inline-fallback";
}

export async function isQuizAssetResolutionComplete(input: {
  repository: RepositoryService;
  channelId: string;
  episodeId: string;
  plan: QuizAssetPlan;
  resolution: QuizAssetResolution | null;
  activeEngine?: "codex" | "antigravity";
  visualStyle?: QuizImageStyle;
  imageConfig?: {
    api_key?: string;
    model?: string;
    provider?: "gpti2" | "shopaikey" | "custom";
    base_url?: string;
    quality?: string;
  };
}): Promise<boolean> {
  if (!input.resolution || input.resolution.episode_id !== input.episodeId) return false;
  if (input.resolution.assets.length < input.plan.assets.length) return false;
  const visualStyle = input.visualStyle ?? "pixar_3d";
  const providerName = resolveQuizImageProviderName({
    imageConfig: input.imageConfig,
    activeEngine: input.activeEngine,
  });
  const consistencyGroups = new Map(input.plan.consistency_groups.map((group) => [group.group_id, group]));
  const byId = new Map(input.resolution.assets.map((asset) => [asset.asset_id, asset]));
  for (const request of input.plan.assets) {
    const compiled = compileQuizAssetPrompt(
      request,
      request.consistency_group_id ? consistencyGroups.get(request.consistency_group_id) : undefined,
      visualStyle,
    );
    const fingerprint = assetFingerprint(request, providerName, compiled.cacheVersion);
    const resolved = byId.get(request.asset_id);
    if (!resolved) return false;
    const isExplicit = resolved.source === "explicit_episode";
    if (
      (!isExplicit && resolved.fingerprint !== fingerprint) ||
      resolved.semantic_key !== request.semantic_key ||
      !(await isValidQuizAsset(
        input.repository,
        input.channelId,
        input.episodeId,
        resolved.path,
        request,
        isExplicit ? "explicit" : "generated",
      ))
    ) {
      return false;
    }
  }
  return true;
}

export async function isValidQuizAsset(
  repository: RepositoryService,
  channelId: string,
  episodeId: string,
  assetPath: string,
  expectedRequirement?: QuizAssetPlan["assets"][number],
  provenanceOverride?: "generated" | "explicit",
): Promise<boolean> {
  try {
    const absolutePath = await repository.resolveQuizAssetPath(channelId, episodeId, assetPath);
    const data = new Uint8Array(await readFile(absolutePath));
    if (data.length === 0) return false;

    if (expectedRequirement?.sizing) {
      const rec = getRecommendationForAssetRequirement(expectedRequirement);
      const provenance = provenanceOverride ?? (expectedRequirement.sizing ? "generated" : "explicit");
      const validation = await validateQuizImageBytes({
        bytes: data,
        recommendation: rec,
        provenance,
        required: expectedRequirement.required,
      });
      return !validation.issues.some((i) => i.severity === "blocker");
    }

    const meta = await sharp(data, { failOn: "none" }).metadata();
    return Boolean(meta.width && meta.height && meta.width > 0 && meta.height > 0);
  } catch {
    return false;
  }
}
