import { createHash } from "node:crypto";
import {
  BUILT_IN_PRESETS,
  DEFAULT_QUIZ_SHORT_TITLE_CANVAS,
  nowIso,
  type QuizShortBookendCategorySummary,
  type QuizShortBookendPair,
} from "@studio/shared";
import { RepositoryError } from "../repository/errors.js";
import { storeBookendClip } from "./quizShortBookendMedia.js";
import type { CreateQuizShortBookendPairInput, UpdateQuizShortBookendPairInput } from "./quizShortBookendSchemas.js";
import type { QuizShortBookendStore } from "./quizShortBookendStore.js";

function decodeVideoPayload(data: string): Buffer {
  const base64 = data.startsWith("data:") ? data.slice(data.indexOf(",") + 1) : data;
  const buffer = Buffer.from(base64, "base64");
  if (buffer.length === 0) throw new RepositoryError("Uploaded video is empty", "INVALID_VIDEO_PAYLOAD");
  return buffer;
}

function requestFingerprint(input: CreateQuizShortBookendPairInput): string {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

function nextPairName(pairs: QuizShortBookendPair[], stylePresetId: string): string {
  const highest = pairs
    .filter((pair) => pair.style_preset_id === stylePresetId && /^\d+$/.test(pair.name))
    .reduce((max, pair) => Math.max(max, Number(pair.name)), 0);
  return String(highest + 1).padStart(3, "0");
}

/** Upload, categorize, update and delete Quiz Short intro/outro pairs. */
export class QuizShortBookendService {
  private readonly locks = new Map<string, Promise<unknown>>();

  constructor(private readonly store: QuizShortBookendStore) {}

  async isReady(pair: QuizShortBookendPair): Promise<boolean> {
    if (pair.status !== "active") return false;
    try {
      await Promise.all([
        this.store.clipPath(pair.channel_id, pair.pair_id, "intro"),
        this.store.clipPath(pair.channel_id, pair.pair_id, "outro"),
      ]);
      return true;
    } catch {
      return false;
    }
  }

  async listCategories(channelId: string): Promise<QuizShortBookendCategorySummary[]> {
    const pairs = await this.store.listPairs(channelId);
    const readiness = await Promise.all(pairs.map(async (pair) => ({ pair, ready: await this.isReady(pair) })));
    return BUILT_IN_PRESETS.map((preset) => {
      const inCategory = readiness.filter(({ pair }) => pair.style_preset_id === preset.id);
      return {
        style_preset_id: preset.id,
        name: preset.name,
        icon: preset.icon,
        total_count: inCategory.length,
        ready_count: inCategory.filter(({ ready }) => ready).length,
      };
    });
  }

  async create(channelId: string, input: CreateQuizShortBookendPairInput): Promise<QuizShortBookendPair> {
    return this.withChannelLock(channelId, () => this.createLocked(channelId, input));
  }

  async update(channelId: string, pairId: string, input: UpdateQuizShortBookendPairInput): Promise<QuizShortBookendPair> {
    const current = await this.store.getPair(channelId, pairId);
    if (!current) throw new RepositoryError(`Short Intro/Outro pair not found: ${pairId}`, "QUIZ_SHORT_BOOKEND_NOT_FOUND");
    const next: QuizShortBookendPair = { ...current, ...input, updated_at: nowIso() };
    await this.store.savePair(next);
    return next;
  }

  async delete(channelId: string, pairId: string): Promise<void> {
    await this.store.deletePair(channelId, pairId);
  }

  private async createLocked(channelId: string, input: CreateQuizShortBookendPairInput): Promise<QuizShortBookendPair> {
    const fingerprint = requestFingerprint(input);
    const existing = await this.store.getPair(channelId, input.pair_id);
    if (existing) {
      if (existing.upload_fingerprint === fingerprint) return existing;
      throw new RepositoryError("Upload request ID already belongs to another pair", "VERSION_CONFLICT");
    }
    const pairDirectory = await this.store.pairDirectory(channelId, input.pair_id);
    try {
      const intro = await storeBookendClip({ pairDirectory, kind: "intro", source: decodeVideoPayload(input.intro_data), muteAudio: true });
      const outro = await storeBookendClip({
        pairDirectory,
        kind: "outro",
        source: decodeVideoPayload(input.outro_data),
        muteAudio: !input.outro_keep_audio,
      });
      const pair: QuizShortBookendPair = {
        schema_version: 1,
        pair_id: input.pair_id,
        channel_id: channelId,
        style_preset_id: input.style_preset_id,
        name: nextPairName(await this.store.listPairs(channelId), input.style_preset_id),
        status: "active",
        intro,
        outro,
        title_canvas: input.title_canvas ?? DEFAULT_QUIZ_SHORT_TITLE_CANVAS,
        transition_type: "stinger_swipe",
        transition_duration_seconds: 0.5,
        upload_fingerprint: fingerprint,
        created_at: nowIso(),
        updated_at: nowIso(),
      };
      await this.store.savePair(pair);
      return pair;
    } catch (error) {
      await this.store.deletePair(channelId, input.pair_id);
      throw error;
    }
  }

  private async withChannelLock<T>(channelId: string, operation: () => Promise<T>): Promise<T> {
    const previous = this.locks.get(channelId) ?? Promise.resolve();
    const run = previous.catch(() => undefined).then(operation);
    const tail = run.catch(() => undefined);
    this.locks.set(channelId, tail);
    try {
      return await run;
    } finally {
      if (this.locks.get(channelId) === tail) this.locks.delete(channelId);
    }
  }
}
