import path from "node:path";
import { mkdir, readFile, readdir } from "node:fs/promises";
import type { Episode, ShortReelRecord } from "@studio/shared";
import { RepositoryError, type RepositoryService } from "../../../repository.js";
import { TopicConfirmationReceiptSchema, type TopicConfirmationReceipt } from "../../../repository/topicConfirmationReceipts.js";
import {
  ProductLocalizationArtifactSchema,
  type ProductLocalizationArtifact,
  type RepositoryStorageAccessor,
  type SupportedBaseLanguage,
} from "./localization.types.js";
import { normalizeTargetLanguage } from "./productLocalization.js";

async function readAndValidateArtifact(filePath: string, entityName: string): Promise<ProductLocalizationArtifact | null> {
  try {
    const raw = await readFile(filePath, "utf8");
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      throw new RepositoryError(`LOCALIZATION_CORRUPTED: ${entityName} localization artifact is not valid JSON.`, "LOCALIZATION_CORRUPTED", {
        cause: error,
      });
    }
    try {
      return ProductLocalizationArtifactSchema.parse(parsed);
    } catch (error) {
      throw new RepositoryError(
        `LOCALIZATION_CORRUPTED: ${entityName} localization artifact failed schema validation.`,
        "LOCALIZATION_CORRUPTED",
        { cause: error },
      );
    }
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "ENOENT") return null;
    if (error instanceof RepositoryError) throw error;
    throw new RepositoryError(`LOCALIZATION_UNREADABLE: ${entityName} localization artifact could not be read.`, "LOCALIZATION_UNREADABLE", {
      cause: error,
    });
  }
}

export async function saveProductLocalizationArtifact(
  repo: RepositoryService,
  channelId: string,
  episodeSlug: string,
  artifact: ProductLocalizationArtifact,
): Promise<void> {
  const channel = await repo.getChannel(channelId);
  const validated = ProductLocalizationArtifactSchema.parse(artifact);
  const episodeDir = repo.resolvePath("channels", channel.slug, "episodes", episodeSlug);
  await mkdir(episodeDir, { recursive: true });
  await repo.writeJsonAtomic(path.join(episodeDir, "localization.json"), validated);
}

export async function loadProductLocalizationArtifact(
  repo: RepositoryService,
  channelId: string,
  episodeSlug: string,
): Promise<ProductLocalizationArtifact | null> {
  const channel = await repo.getChannel(channelId);
  const filePath = repo.resolvePath("channels", channel.slug, "episodes", episodeSlug, "localization.json");
  return readAndValidateArtifact(filePath, "Episode");
}

export async function saveShortReelLocalizationArtifact(
  repo: RepositoryStorageAccessor,
  channelId: string,
  reelId: string,
  artifact: ProductLocalizationArtifact,
): Promise<void> {
  const channel = await repo.getChannel(channelId);
  const validated = ProductLocalizationArtifactSchema.parse(artifact);
  const reelDir = repo.resolvePath("channels", channel.slug, "short_reels", reelId);
  await mkdir(reelDir, { recursive: true });
  if (repo.writeJsonAtomic) {
    await repo.writeJsonAtomic(path.join(reelDir, "localization.json"), validated);
  }
}

export async function loadShortReelLocalizationArtifact(
  repo: RepositoryStorageAccessor,
  channelId: string,
  reelId: string,
): Promise<ProductLocalizationArtifact | null> {
  const channel = await repo.getChannel(channelId);
  const filePath = repo.resolvePath("channels", channel.slug, "short_reels", reelId, "localization.json");
  return readAndValidateArtifact(filePath, "Short-Reel");
}

export async function findConfirmationReceiptForProduct(
  repo: { resolvePath(...segments: string[]): string; getChannel(channelId: string): Promise<{ slug: string }> },
  channelId: string,
  productId: string,
): Promise<TopicConfirmationReceipt | null> {
  const channel = await repo.getChannel(channelId);
  const receiptsDir = repo.resolvePath("channels", channel.slug, "receipts");
  let entries: string[];
  try {
    entries = await readdir(receiptsDir);
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "ENOENT") {
      return null;
    }
    throw error;
  }
  for (const name of entries) {
    if (!name.endsWith(".json")) continue;
    try {
      const raw = await readFile(path.join(receiptsDir, name), "utf8");
      const parsed = TopicConfirmationReceiptSchema.safeParse(JSON.parse(raw));
      if (parsed.success && parsed.data.product_id === productId) {
        return parsed.data;
      }
    } catch {
      // Ignore unreadable or corrupted sibling receipts during lookup
    }
  }
  return null;
}

export async function resolveEpisodeTargetLanguage(
  repo: RepositoryService,
  channelId: string,
  episode: Episode,
): Promise<{ targetLanguage: SupportedBaseLanguage; localization: ProductLocalizationArtifact | null }> {
  const localization = await loadProductLocalizationArtifact(repo, channelId, episode.slug);
  if (localization) {
    return { targetLanguage: localization.target_language, localization };
  }

  // If no localization artifact exists, check for confirmed receipt
  const receipt = await findConfirmationReceiptForProduct(repo, channelId, episode.episode_id);
  if (receipt && receipt.options.target_language) {
    const receiptLang = normalizeTargetLanguage(receipt.options.target_language);
    if (receiptLang !== "en") {
      throw new RepositoryError(
        `PRODUCT_LANGUAGE_UNRESOLVED: Missing localization artifact for non-English confirmed episode "${episode.episode_id}" (target: ${receiptLang}). Recovery required.`,
        "PRODUCT_LANGUAGE_UNRESOLVED",
      );
    }
    return { targetLanguage: "en", localization: null };
  }

  throw new RepositoryError(
    `PRODUCT_LANGUAGE_UNRESOLVED: Product language cannot be established from a validated receipt or localization artifact for episode "${episode.episode_id}".`,
    "PRODUCT_LANGUAGE_UNRESOLVED",
  );
}

export async function resolveShortReelTargetLanguage(
  repo: RepositoryStorageAccessor & RepositoryService,
  channelId: string,
  reel: ShortReelRecord,
): Promise<{ targetLanguage: SupportedBaseLanguage; localization: ProductLocalizationArtifact | null }> {
  const localization = await loadShortReelLocalizationArtifact(repo, channelId, reel.reel_id);
  if (localization) {
    return { targetLanguage: localization.target_language, localization };
  }

  const receipt = await findConfirmationReceiptForProduct(repo, channelId, reel.reel_id);
  if (receipt && receipt.options.target_language) {
    const receiptLang = normalizeTargetLanguage(receipt.options.target_language);
    if (receiptLang !== "en") {
      throw new RepositoryError(
        `PRODUCT_LANGUAGE_UNRESOLVED: Missing localization artifact for non-English confirmed Short-Reel "${reel.reel_id}" (target: ${receiptLang}). Recovery required.`,
        "PRODUCT_LANGUAGE_UNRESOLVED",
      );
    }
    return { targetLanguage: "en", localization: null };
  }

  throw new RepositoryError(
    `PRODUCT_LANGUAGE_UNRESOLVED: Product language cannot be established from a validated receipt or localization artifact for Short-Reel "${reel.reel_id}".`,
    "PRODUCT_LANGUAGE_UNRESOLVED",
  );
}
