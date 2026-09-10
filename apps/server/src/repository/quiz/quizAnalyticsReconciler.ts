import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { nowIso, UsageLedgerSchema, type UsageLedger } from "@studio/shared";
import type { RepositoryRuntime } from "../runtime.js";
import { scanEpisodeImageMetrics, scanEpisodeVoiceMetrics, type ImageDiskMetrics } from "./quizAnalyticsDiskScanner.js";

const LEDGER_FILENAME = "usage-ledger.json";
const VOICE_SAVINGS_USD_PER_1000_CHARS = 0.1;

const DEFAULT_IMAGE_UNIT_COST_VND = 500;
const DEFAULT_IMAGE_UNIT_COST_USD = 0.02;
const GPTI2_IMAGE_UNIT_COST_VND = 50;
const GPTI2_IMAGE_UNIT_COST_USD = 0.002;

export function getLedgerDirectory(runtime: RepositoryRuntime): string {
  return path.join(runtime.roots.runtime, "analytics");
}

export function getLedgerPath(runtime: RepositoryRuntime): string {
  return path.join(getLedgerDirectory(runtime), LEDGER_FILENAME);
}

export interface VoiceDiskTotals {
  characters: number;
  durationSeconds: number;
  segments: number;
  renderedEpisodes: number;
}

export interface ImageUsageDelta {
  providerKey: string;
  count: number;
  addedCostVnd: number;
  addedCostUsd: number;
  costEstimated: boolean;
}

export function estimateVoiceSavingsUsd(characters: number): number {
  return (characters / 1000) * VOICE_SAVINGS_USD_PER_1000_CHARS;
}

/**
 * Derives the provider bucket and the normalized VND/USD cost delta for one
 * image generation batch, applying per-unit cost rules unless explicit costs are given.
 */
export function resolveImageUsageDelta(input: {
  provider: string;
  model?: string;
  count?: number;
  costVnd?: number;
  costUsd?: number;
}): ImageUsageDelta {
  const count = Math.max(1, input.count ?? 1);
  const providerKey = (input.provider || "unknown").toLowerCase();
  const isGpti2 = providerKey === "gpti2" || (input.model !== undefined && input.model.includes("gpt-image-2"));
  const unitCostVnd = isGpti2 ? GPTI2_IMAGE_UNIT_COST_VND : DEFAULT_IMAGE_UNIT_COST_VND;
  const unitCostUsd = isGpti2 ? GPTI2_IMAGE_UNIT_COST_USD : DEFAULT_IMAGE_UNIT_COST_USD;
  const addedCostVnd = input.costVnd !== undefined ? Math.max(0, input.costVnd) : count * unitCostVnd;
  const addedCostUsd = input.costUsd !== undefined ? Math.max(0, input.costUsd) : Number((count * unitCostUsd).toFixed(4));
  const costEstimated = input.costVnd === undefined && input.costUsd === undefined;
  return { providerKey, count, addedCostVnd, addedCostUsd, costEstimated };
}

/**
 * Merges existing persisted ledger totals with freshly scanned disk metrics,
 * never letting on-disk repairs lower historical cumulative values.
 */
export function buildConsolidatedLedger(
  existingLedger: UsageLedger | null,
  diskVoice: VoiceDiskTotals,
  diskImage: ImageDiskMetrics,
  now: string,
): UsageLedger {
  const characters = Math.max(existingLedger?.voice.rendered_characters ?? 0, diskVoice.characters);
  const durationSeconds = Math.max(existingLedger?.voice.rendered_duration_seconds ?? 0, diskVoice.durationSeconds);
  const segments = Math.max(existingLedger?.voice.rendered_segments_count ?? 0, diskVoice.segments);
  const episodesCount = Math.max(existingLedger?.voice.rendered_episodes_count ?? 0, diskVoice.renderedEpisodes);
  const savingsUsd = estimateVoiceSavingsUsd(characters);

  const totalImages = Math.max(existingLedger?.image.total_images_generated ?? 0, diskImage.count);
  const costVnd = Math.max(existingLedger?.image.estimated_cost_vnd ?? 0, diskImage.spendVnd);
  const costUsd = Number(Math.max(existingLedger?.image.estimated_cost_usd ?? 0, diskImage.spendUsd).toFixed(4));

  return {
    version: 1,
    created_at: existingLedger?.created_at ?? now,
    updated_at: now,
    voice: {
      rendered_characters: characters,
      rendered_duration_seconds: durationSeconds,
      rendered_segments_count: segments,
      rendered_episodes_count: episodesCount,
      estimated_savings_usd: Number(savingsUsd.toFixed(4)),
    },
    image: {
      total_images_generated: totalImages,
      estimated_cost_vnd: costVnd,
      estimated_cost_usd: costUsd,
      by_provider: mergeCountRecords(existingLedger?.image.by_provider, diskImage.byProvider),
      by_model: mergeCountRecords(existingLedger?.image.by_model, diskImage.byModel),
    },
    recent_events: existingLedger?.recent_events ?? [],
  };
}

/** Rebuilds the usage ledger by scanning every channel/episode on disk and repairing missing cumulative data. */
export async function reconcileUsageLedgerFromDisk(this: RepositoryRuntime): Promise<UsageLedger> {
  await mkdir(getLedgerDirectory(this), { recursive: true });
  const existingLedger = await loadExistingLedger(this);
  const diskVoice = await collectVoiceDiskTotals(this);
  const diskImage = await collectImageDiskMetrics(this);

  const consolidated = buildConsolidatedLedger(existingLedger, diskVoice, diskImage, nowIso());
  await this.writeJsonAtomic(getLedgerPath(this), consolidated);
  return consolidated;
}

async function loadExistingLedger(runtime: RepositoryRuntime): Promise<UsageLedger | null> {
  try {
    const raw = JSON.parse(await readFile(getLedgerPath(runtime), "utf8")) as unknown;
    return UsageLedgerSchema.parse(raw);
  } catch {
    return null;
  }
}

async function collectVoiceDiskTotals(runtime: RepositoryRuntime): Promise<VoiceDiskTotals> {
  const channels = await runtime.listChannels(true).catch(() => []);
  let characters = 0;
  let durationSeconds = 0;
  let segments = 0;
  let renderedEpisodes = 0;

  for (const channel of channels) {
    const episodes = await runtime.listEpisodes(channel.channel_id).catch(() => []);
    for (const episode of episodes) {
      const metrics = await scanEpisodeVoiceMetrics(runtime, channel.channel_id, episode.episode_id);
      characters += metrics.characters;
      durationSeconds += metrics.durationSeconds;
      segments += metrics.segments;
      if (metrics.hasRenderedVoice) {
        renderedEpisodes += 1;
      }
    }
  }

  return { characters, durationSeconds, segments, renderedEpisodes };
}

async function collectImageDiskMetrics(runtime: RepositoryRuntime): Promise<ImageDiskMetrics> {
  const channels = await runtime.listChannels(true).catch(() => []);
  let count = 0;
  let spendVnd = 0;
  let spendUsd = 0;
  const byProvider: Record<string, number> = {};
  const byModel: Record<string, number> = {};

  for (const channel of channels) {
    const episodes = await runtime.listEpisodes(channel.channel_id).catch(() => []);
    for (const episode of episodes) {
      const metrics = await scanEpisodeImageMetrics(runtime, channel.slug, episode.slug);
      count += metrics.count;
      spendVnd += metrics.spendVnd;
      spendUsd += metrics.spendUsd;
      mergeAdditive(byProvider, metrics.byProvider);
      mergeAdditive(byModel, metrics.byModel);
    }
  }

  return { count, spendVnd, spendUsd, byProvider, byModel };
}

function mergeCountRecords(existing: Record<string, number> | undefined, scanned: Record<string, number>): Record<string, number> {
  const merged = { ...(existing ?? {}) };
  for (const [key, count] of Object.entries(scanned)) {
    merged[key] = Math.max(merged[key] ?? 0, count);
  }
  return merged;
}

function mergeAdditive(target: Record<string, number>, source: Record<string, number>): void {
  for (const [key, value] of Object.entries(source)) {
    target[key] = (target[key] || 0) + value;
  }
}
