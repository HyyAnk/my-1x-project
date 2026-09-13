import type { RepositoryService } from "../../../../repository.js";

export const VND_TO_USD_RATE = 25500;

/**
 * Converts VND price to USD formatted to 4 decimal places.
 */
export function convertVndToUsd(priceVnd: number): number {
  return Number((priceVnd / VND_TO_USD_RATE).toFixed(4));
}

export interface RecordImageUsageParams {
  repository: RepositoryService;
  channelId: string;
  episodeId: string;
  provider: string;
  model: string;
  costVnd: number;
  costUsd: number;
  count?: number;
  note?: string;
}

/**
 * Persists image generation usage and cost tracking in the repository without throwing on failure.
 */
export async function trackImageUsage(params: RecordImageUsageParams): Promise<void> {
  const { repository, channelId, episodeId, provider, model, costVnd, costUsd, count = 1, note } = params;
  await repository
    .recordImageUsage({
      channelId,
      episodeId,
      provider,
      model,
      count,
      costVnd,
      costUsd,
      note,
    })
    .catch(() => undefined);
}

export async function trackGpti2Usage(
  repository: RepositoryService,
  channelId: string,
  episodeId: string,
  assetId: string,
  purpose: string,
  model: string,
  priceVnd = 50,
): Promise<void> {
  const costUsd = convertVndToUsd(priceVnd);
  await trackImageUsage({
    repository,
    channelId,
    episodeId,
    provider: "gpti2",
    model,
    costVnd: priceVnd,
    costUsd,
    note: `Quiz asset ${assetId} (${purpose})`,
  });
}

export async function trackShopAiKeyUsage(
  repository: RepositoryService,
  channelId: string,
  episodeId: string,
  assetId: string,
  purpose: string,
  provider: string,
  model: string,
): Promise<void> {
  await trackImageUsage({
    repository,
    channelId,
    episodeId,
    provider: provider || "shopaikey",
    model,
    costVnd: 500,
    costUsd: 0.02,
    note: `Quiz asset ${assetId} (${purpose})`,
  });
}

export async function trackGoogleUsage(
  repository: RepositoryService,
  channelId: string,
  episodeId: string,
  assetId: string,
  purpose: string,
  model: string,
): Promise<void> {
  await trackImageUsage({
    repository,
    channelId,
    episodeId,
    provider: "google",
    model,
    costVnd: 750,
    costUsd: 0.03,
    note: `Quiz asset ${assetId} (${purpose})`,
  });
}

export async function trackAntigravityUsage(
  repository: RepositoryService,
  channelId: string,
  episodeId: string,
  assetId: string,
  purpose: string,
): Promise<void> {
  await trackImageUsage({
    repository,
    channelId,
    episodeId,
    provider: "antigravity",
    model: "antigravity-native-chain",
    costVnd: 0,
    costUsd: 0,
    note: `Quiz asset ${assetId} (${purpose})`,
  });
}
