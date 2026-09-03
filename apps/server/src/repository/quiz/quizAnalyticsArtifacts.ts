import { mkdir, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import {
  makeId,
  nowIso,
  UsageLedgerSchema,
  type UsageLedger,
  type UsageLedgerEvent,
} from "@studio/shared";
import type { RepositoryRuntime } from "../runtime.js";

const LEDGER_FILENAME = "usage-ledger.json";
const MAX_RECENT_EVENTS = 200;

function getLedgerDirectory(runtime: RepositoryRuntime): string {
  return path.join(runtime.roots.runtime, "analytics");
}

function getLedgerPath(runtime: RepositoryRuntime): string {
  return path.join(getLedgerDirectory(runtime), LEDGER_FILENAME);
}

export async function readUsageLedger(this: RepositoryRuntime): Promise<UsageLedger> {
  const ledgerPath = getLedgerPath(this);
  try {
    const raw = JSON.parse(await readFile(ledgerPath, "utf8")) as unknown;
    return UsageLedgerSchema.parse(raw);
  } catch {
    // If ledger is missing or unparseable, auto-bootstrap from existing on-disk channels
    return reconcileUsageLedgerFromDisk.call(this);
  }
}

export async function reconcileUsageLedgerFromDisk(this: RepositoryRuntime): Promise<UsageLedger> {
  const ledgerDirectory = getLedgerDirectory(this);
  const ledgerPath = getLedgerPath(this);
  await mkdir(ledgerDirectory, { recursive: true });

  let existingLedger: UsageLedger | null = null;
  try {
    const raw = JSON.parse(await readFile(ledgerPath, "utf8")) as unknown;
    existingLedger = UsageLedgerSchema.parse(raw);
  } catch {
    existingLedger = null;
  }

  // Scan disk for on-disk rendered voice metrics & image metrics
  const channels = await this.listChannels(true).catch(() => []);
  let diskCharacters = 0;
  let diskDurationSeconds = 0;
  let diskSegments = 0;
  let diskRenderedEpisodes = 0;

  let diskImagesCount = 0;
  let diskImageSpendVnd = 0;
  let diskImageSpendUsd = 0;
  const diskByProvider: Record<string, number> = {};
  const diskByModel: Record<string, number> = {};

  for (const channel of channels) {
    const episodes = await this.listEpisodes(channel.channel_id).catch(() => []);
    for (const episode of episodes) {
      let episodeHasRenderedVoice = false;

      // Check Quiz voice plan
      const voicePlan = await this.readVoicePlan(channel.channel_id, episode.episode_id).catch(() => null);
      if (voicePlan && voicePlan.segments?.length) {
        for (const segment of voicePlan.segments) {
          if (segment.duration_seconds && segment.duration_seconds > 0) {
            diskCharacters += (segment.text || "").length;
            diskDurationSeconds += segment.duration_seconds;
            diskSegments += 1;
            episodeHasRenderedVoice = true;
          }
        }
      }

      // Check legacy scenes
      const scenes = await this.readScenes(channel.channel_id, episode.episode_id).catch(() => []);
      if (scenes && scenes.length) {
        for (const scene of scenes) {
          if (scene.audio_asset_path && scene.audio_duration_seconds && scene.audio_duration_seconds > 0) {
            diskCharacters += (scene.dialogue || "").length;
            diskDurationSeconds += scene.audio_duration_seconds;
            diskSegments += 1;
            episodeHasRenderedVoice = true;
          }
        }
      }

      if (episodeHasRenderedVoice) {
        diskRenderedEpisodes += 1;
      }

      // Scan Quiz Images
      try {
        const quizImagesDir = this.resolvePath("channels", channel.slug, "episodes", episode.slug, "assets", "quiz-images");
        const entries = await readdir(quizImagesDir, { withFileTypes: true }).catch(() => []);
        const imageFiles = entries.filter((e) => e.isFile() && /\.(png|jpe?g|webp)$/i.test(e.name));

        for (const file of imageFiles) {
          const metaFilename = file.name.replace(/\.(png|jpe?g|webp)$/i, ".meta.json");
          const metaPath = path.join(quizImagesDir, metaFilename);
          let priceVnd = 50;
          let model = "gpt-image-2";

          try {
            const rawMeta = JSON.parse(await readFile(metaPath, "utf8")) as { price_vnd?: number; model?: string };
            if (typeof rawMeta.price_vnd === "number") priceVnd = rawMeta.price_vnd;
            if (typeof rawMeta.model === "string" && rawMeta.model) model = rawMeta.model;
          } catch {
            // fallback defaults
          }

          const costUsd = Number((priceVnd / 25500).toFixed(4));
          diskImagesCount += 1;
          diskImageSpendVnd += priceVnd;
          diskImageSpendUsd += costUsd;

          const providerKey = model.startsWith("gemini") ? "google" : "gpti2";
          diskByProvider[providerKey] = (diskByProvider[providerKey] || 0) + 1;
          diskByModel[model] = (diskByModel[model] || 0) + 1;
        }
      } catch {
        // directory may not exist
      }

      // Scan Thumbnails
      try {
        const thumbDir = this.resolvePath("channels", channel.slug, "episodes", episode.slug, "assets", "thumbnails");
        const thumbEntries = await readdir(thumbDir, { withFileTypes: true }).catch(() => []);
        const thumbFiles = thumbEntries.filter((e) => e.isFile() && /\.(png|jpe?g|webp)$/i.test(e.name));

        for (const _file of thumbFiles) {
          const priceVnd = 50;
          const costUsd = Number((priceVnd / 25500).toFixed(4));
          diskImagesCount += 1;
          diskImageSpendVnd += priceVnd;
          diskImageSpendUsd += costUsd;
          diskByProvider["gpti2"] = (diskByProvider["gpti2"] || 0) + 1;
          diskByModel["gpt-image-2"] = (diskByModel["gpt-image-2"] || 0) + 1;
        }
      } catch {
        // directory may not exist
      }

      // Scan Bundles (legacy storyboards)
      try {
        const bundleDir = this.resolvePath("channels", channel.slug, "episodes", episode.slug, "assets", "bundles");
        const bundleEntries = await readdir(bundleDir, { withFileTypes: true }).catch(() => []);
        const bundleFiles = bundleEntries.filter((e) => e.isFile() && /\.(png|jpe?g|webp)$/i.test(e.name));

        for (const _file of bundleFiles) {
          const priceVnd = 50;
          const costUsd = Number((priceVnd / 25500).toFixed(4));
          diskImagesCount += 1;
          diskImageSpendVnd += priceVnd;
          diskImageSpendUsd += costUsd;
          diskByProvider["gpti2"] = (diskByProvider["gpti2"] || 0) + 1;
          diskByModel["gpt-image-2"] = (diskByModel["gpt-image-2"] || 0) + 1;
        }
      } catch {
        // directory may not exist
      }
    }
  }

  const now = nowIso();
  const characters = Math.max(existingLedger?.voice.rendered_characters || 0, diskCharacters);
  const durationSeconds = Math.max(existingLedger?.voice.rendered_duration_seconds || 0, diskDurationSeconds);
  const segments = Math.max(existingLedger?.voice.rendered_segments_count || 0, diskSegments);
  const episodesCount = Math.max(existingLedger?.voice.rendered_episodes_count || 0, diskRenderedEpisodes);
  const savingsUsd = (characters / 1000) * 0.1;

  const totalImages = Math.max(existingLedger?.image.total_images_generated || 0, diskImagesCount);
  const costVnd = Math.max(existingLedger?.image.estimated_cost_vnd || 0, diskImageSpendVnd);
  const costUsd = Number(Math.max(existingLedger?.image.estimated_cost_usd || 0, diskImageSpendUsd).toFixed(4));

  const byProvider = { ...(existingLedger?.image.by_provider || {}) };
  for (const [provider, count] of Object.entries(diskByProvider)) {
    byProvider[provider] = Math.max(byProvider[provider] || 0, count);
  }

  const byModel = { ...(existingLedger?.image.by_model || {}) };
  for (const [model, count] of Object.entries(diskByModel)) {
    byModel[model] = Math.max(byModel[model] || 0, count);
  }

  const consolidated: UsageLedger = {
    version: 1,
    created_at: existingLedger?.created_at || now,
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
      by_provider: byProvider,
      by_model: byModel,
    },
    recent_events: existingLedger?.recent_events || [],
  };

  await this.writeJsonAtomic(ledgerPath, consolidated);
  return consolidated;
}

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
    const savingsUsd = (characters / 1000) * 0.1;
    const now = nowIso();

    const event: UsageLedgerEvent = {
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

    const updated: UsageLedger = {
      ...current,
      updated_at: now,
      voice: {
        rendered_characters: characters,
        rendered_duration_seconds: durationSeconds,
        rendered_segments_count: segmentsCount,
        rendered_episodes_count: episodesCount,
        estimated_savings_usd: Number(savingsUsd.toFixed(4)),
      },
      recent_events: [event, ...current.recent_events].slice(0, MAX_RECENT_EVENTS),
    };

    const ledgerPath = getLedgerPath(this);
    await mkdir(getLedgerDirectory(this), { recursive: true });
    await this.writeJsonAtomic(ledgerPath, updated);
    return updated;
  });
}

const DEFAULT_IMAGE_UNIT_COST_VND = 500;
const DEFAULT_IMAGE_UNIT_COST_USD = 0.02;

export async function recordImageUsage(
  this: RepositoryRuntime,
  input: {
    channelId?: string;
    episodeId?: string;
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
    const count = Math.max(1, input.count ?? 1);
    const providerKey = (input.provider || "unknown").toLowerCase();
    const isGpti2 = providerKey === "gpti2" || (Boolean(input.model) && input.model!.includes("gpt-image-2"));
    const unitCostVnd = isGpti2 ? 50 : DEFAULT_IMAGE_UNIT_COST_VND;
    const unitCostUsd = isGpti2 ? 0.002 : DEFAULT_IMAGE_UNIT_COST_USD;
    const addedCostVnd = input.costVnd !== undefined ? Math.max(0, input.costVnd) : count * unitCostVnd;
    const addedCostUsd = input.costUsd !== undefined ? Math.max(0, input.costUsd) : Number((count * unitCostUsd).toFixed(4));

    const costVnd = current.image.estimated_cost_vnd + addedCostVnd;
    const costUsd = Number((current.image.estimated_cost_usd + addedCostUsd).toFixed(4));
    const totalImages = current.image.total_images_generated + count;

    const byProvider = { ...current.image.by_provider };
    byProvider[providerKey] = (byProvider[providerKey] || 0) + count;

    const byModel = { ...current.image.by_model };
    if (input.model) {
      byModel[input.model] = (byModel[input.model] || 0) + count;
    }

    const now = nowIso();
    const event: UsageLedgerEvent = {
      id: makeId("evt"),
      timestamp: now,
      type: "image_generation",
      channel_id: input.channelId,
      episode_id: input.episodeId,
      details: {
        provider: input.provider,
        model: input.model,
        image_count: count,
        cost_vnd: addedCostVnd,
        cost_usd: addedCostUsd,
        note: input.note,
      },
    };

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
      recent_events: [event, ...current.recent_events].slice(0, MAX_RECENT_EVENTS),
    };

    const ledgerPath = getLedgerPath(this);
    await mkdir(getLedgerDirectory(this), { recursive: true });
    await this.writeJsonAtomic(ledgerPath, updated);
    return updated;
  });
}

async function queueLedgerWrite<T>(runtime: RepositoryRuntime, operation: () => Promise<T>): Promise<T> {
  const writes = runtime?.usageLedgerWrites;
  const previous = writes ? writes.get("global") ?? Promise.resolve() : Promise.resolve();
  let result!: T;
  const current = previous
    .catch(() => undefined)
    .then(async () => {
      result = await operation();
    });
  if (writes) {
    writes.set("global", current.then(() => undefined, () => undefined));
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
