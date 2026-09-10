import { mkdir, readFile } from "node:fs/promises";
import { makeId, nowIso, UsageLedgerSchema, type UsageLedger, type UsageLedgerEvent } from "@studio/shared";
import type { RepositoryRuntime } from "../runtime.js";
import {
  estimateVoiceSavingsUsd,
  getLedgerDirectory,
  getLedgerPath,
  reconcileUsageLedgerFromDisk,
  resolveImageUsageDelta,
} from "./quizAnalyticsReconciler.js";

const MAX_RECENT_EVENTS = 200;

export async function readUsageLedger(this: RepositoryRuntime): Promise<UsageLedger> {
  try {
    const raw = JSON.parse(await readFile(getLedgerPath(this), "utf8")) as unknown;
    return UsageLedgerSchema.parse(raw);
  } catch {
    // If ledger is missing or unparseable, auto-bootstrap from existing on-disk channels
    return reconcileUsageLedgerFromDisk.call(this);
  }
}

/**
 * Serializes ledger mutations through a per-runtime promise queue so concurrent
 * read-modify-write cycles never lose events or corrupt the ledger file.
 */
export async function queueLedgerWrite<T>(runtime: RepositoryRuntime, operation: () => Promise<T>): Promise<T> {
  const writes = runtime?.usageLedgerWrites;
  const previous = writes ? (writes.get("global") ?? Promise.resolve()) : Promise.resolve();
  let result!: T;
  const current = previous
    .catch(() => undefined)
    .then(async () => {
      result = await operation();
    });
  if (writes) {
    writes.set(
      "global",
      current.then(
        () => undefined,
        () => undefined,
      ),
    );
  }
  try {
    await current;
    return result;
  } finally {
    if (writes && writes.get("global") === current) {
      writes.delete("global");
    }
  }
}

/** Appends a voice render batch to the ledger, accumulating cumulative voice usage metrics and events. */
export async function recordVoiceUsage(
  this: RepositoryRuntime,
  input: {
    channelId?: string;
    episodeId?: string;
    characters: number;
    durationSeconds: number;
    segmentsCount?: number;
    note?: string;
  },
): Promise<UsageLedger> {
  return queueLedgerWrite(this, async () => {
    const current = await this.readUsageLedger();
    const characters = current.voice.rendered_characters + Math.max(0, input.characters);
    const durationSeconds = current.voice.rendered_duration_seconds + Math.max(0, input.durationSeconds);
    const segmentsCount = current.voice.rendered_segments_count + Math.max(0, input.segmentsCount ?? 1);
    const episodesCount = input.episodeId ? current.voice.rendered_episodes_count + 1 : current.voice.rendered_episodes_count;
    const now = nowIso();

    const updated: UsageLedger = {
      ...current,
      updated_at: now,
      voice: {
        rendered_characters: characters,
        rendered_duration_seconds: durationSeconds,
        rendered_segments_count: segmentsCount,
        rendered_episodes_count: episodesCount,
        estimated_savings_usd: Number(estimateVoiceSavingsUsd(characters).toFixed(4)),
      },
      recent_events: appendRecentEvent(current, createVoiceRenderEvent(input, now)),
    };

    await persistUsageLedger(this, updated);
    return updated;
  });
}

/** Appends an image generation batch to the ledger, accumulating cumulative image usage costs and events. */
export async function recordImageUsage(
  this: RepositoryRuntime,
  input: {
    channelId?: string;
    episodeId?: string;
    reelId?: string;
    provider: string;
    model?: string;
    count?: number;
    costVnd?: number;
    costUsd?: number;
    note?: string;
  },
): Promise<UsageLedger> {
  return queueLedgerWrite(this, async () => {
    const current = await this.readUsageLedger();
    const delta = resolveImageUsageDelta(input);
    const costVnd = current.image.estimated_cost_vnd + delta.addedCostVnd;
    const costUsd = Number((current.image.estimated_cost_usd + delta.addedCostUsd).toFixed(4));
    const totalImages = current.image.total_images_generated + delta.count;

    const byProvider = { ...current.image.by_provider };
    byProvider[delta.providerKey] = (byProvider[delta.providerKey] || 0) + delta.count;

    const byModel = { ...current.image.by_model };
    if (input.model) {
      byModel[input.model] = (byModel[input.model] || 0) + delta.count;
    }

    const now = nowIso();
    const updated: UsageLedger = {
      ...current,
      updated_at: now,
      image: {
        total_images_generated: totalImages,
        estimated_cost_vnd: costVnd,
        estimated_cost_usd: costUsd,
        by_provider: byProvider,
        by_model: byModel,
      },
      recent_events: appendRecentEvent(current, createImageGenerationEvent(input, delta, now)),
    };

    await persistUsageLedger(this, updated);
    return updated;
  });
}

/** Persists a ledger snapshot atomically, creating the analytics directory on demand. */
async function persistUsageLedger(runtime: RepositoryRuntime, ledger: UsageLedger): Promise<void> {
  await mkdir(getLedgerDirectory(runtime), { recursive: true });
  await runtime.writeJsonAtomic(getLedgerPath(runtime), ledger);
}

function appendRecentEvent(ledger: UsageLedger, event: UsageLedgerEvent): UsageLedgerEvent[] {
  return [event, ...ledger.recent_events].slice(0, MAX_RECENT_EVENTS);
}

function createVoiceRenderEvent(
  input: {
    channelId?: string;
    episodeId?: string;
    characters: number;
    durationSeconds: number;
    segmentsCount?: number;
    note?: string;
  },
  now: string,
): UsageLedgerEvent {
  return {
    id: makeId("evt"),
    timestamp: now,
    type: "voice_render",
    channel_id: input.channelId,
    episode_id: input.episodeId,
    details: {
      characters: input.characters,
      duration_seconds: input.durationSeconds,
      segments_count: input.segmentsCount ?? 1,
      cost_usd: (input.characters / 1000) * 0.1,
      note: input.note,
    },
  };
}

function createImageGenerationEvent(
  input: {
    channelId?: string;
    episodeId?: string;
    reelId?: string;
    provider: string;
    model?: string;
    note?: string;
    costVnd?: number;
    costUsd?: number;
  },
  delta: { count: number; addedCostVnd: number; addedCostUsd: number; costEstimated: boolean },
  now: string,
): UsageLedgerEvent {
  return {
    id: makeId("evt"),
    timestamp: now,
    type: "image_generation",
    channel_id: input.channelId,
    episode_id: input.episodeId,
    reel_id: input.reelId,
    details: {
      provider: input.provider,
      model: input.model,
      image_count: delta.count,
      cost_vnd: delta.addedCostVnd,
      cost_usd: delta.addedCostUsd,
      cost_estimated: delta.costEstimated,
      measured_cost: delta.costEstimated ? undefined : (input.costVnd ?? input.costUsd),
      note: input.note,
    },
  };
}
