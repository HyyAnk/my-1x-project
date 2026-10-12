import { access, mkdir, readdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import {
  QuizShortBookendPairSchema,
  QuizShortBookendSnapshotSchema,
  type QuizShortBookendKind,
  type QuizShortBookendPair,
  type QuizShortBookendSnapshot,
} from "@studio/shared";
import type { RepositoryService } from "../repository.js";
import { RepositoryError } from "../repository/errors.js";

export type QuizShortBookendRepository = Pick<RepositoryService, "getChannel" | "resolvePath" | "writeJsonAtomic">;

const PAIRS_DIRECTORY = "quiz_short_bookends";
const SELECTIONS_DIRECTORY = "quiz_short_bookend_selections";
const SAFE_ID = /^[A-Za-z0-9_-]{1,80}$/;

function isMissingFile(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "ENOENT");
}

function assertSafeId(id: string, label: string): void {
  if (!SAFE_ID.test(id)) throw new RepositoryError(`Invalid ${label}: ${id}`, "INVALID_ID");
}

/** File-system storage of Quiz Short intro/outro pairs and the per-Short pinned selections. */
export class QuizShortBookendStore {
  constructor(private readonly repository: QuizShortBookendRepository) {}

  async channelPairsDirectory(channelId: string): Promise<string> {
    const channel = await this.repository.getChannel(channelId);
    return this.repository.resolvePath("channels", channel.slug, PAIRS_DIRECTORY);
  }

  async pairDirectory(channelId: string, pairId: string): Promise<string> {
    assertSafeId(pairId, "pair id");
    return path.join(await this.channelPairsDirectory(channelId), pairId);
  }

  async listPairs(channelId: string): Promise<QuizShortBookendPair[]> {
    const root = await this.channelPairsDirectory(channelId);
    let entries: import("node:fs").Dirent[];
    try {
      entries = await readdir(root, { withFileTypes: true });
    } catch (error) {
      if (isMissingFile(error)) return [];
      throw error;
    }
    const pairs = await Promise.all(entries.filter((entry) => entry.isDirectory()).map((entry) => this.readPairFile(root, entry.name)));
    return pairs.filter((pair): pair is QuizShortBookendPair => pair !== null).sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  async getPair(channelId: string, pairId: string): Promise<QuizShortBookendPair | null> {
    return this.readPairFile(await this.channelPairsDirectory(channelId), pairId, true);
  }

  async savePair(pair: QuizShortBookendPair): Promise<void> {
    const directory = await this.pairDirectory(pair.channel_id, pair.pair_id);
    await mkdir(directory, { recursive: true });
    await this.repository.writeJsonAtomic(path.join(directory, "meta.json"), QuizShortBookendPairSchema.parse(pair));
  }

  async deletePair(channelId: string, pairId: string): Promise<void> {
    await rm(await this.pairDirectory(channelId, pairId), { recursive: true, force: true });
  }

  async clipPath(channelId: string, pairId: string, kind: QuizShortBookendKind): Promise<string> {
    const clipPath = path.join(await this.pairDirectory(channelId, pairId), `${kind}.mp4`);
    try {
      await access(clipPath);
    } catch {
      throw new RepositoryError(`Short ${kind} clip not found for pair ${pairId}`, "QUIZ_SHORT_BOOKEND_CLIP_NOT_FOUND");
    }
    return clipPath;
  }

  async thumbPath(channelId: string, pairId: string, kind: QuizShortBookendKind): Promise<string | null> {
    const thumbPath = path.join(await this.pairDirectory(channelId, pairId), `${kind}_thumb.jpg`);
    try {
      await access(thumbPath);
      return thumbPath;
    } catch {
      return null;
    }
  }

  async readSnapshot(channelId: string, quizShortId: string): Promise<QuizShortBookendSnapshot | undefined> {
    try {
      const raw = await readFile(await this.snapshotPath(channelId, quizShortId), "utf8");
      return QuizShortBookendSnapshotSchema.parse(JSON.parse(raw));
    } catch (error) {
      if (isMissingFile(error)) return undefined;
      throw error;
    }
  }

  async writeSnapshot(channelId: string, quizShortId: string, snapshot: QuizShortBookendSnapshot): Promise<void> {
    await this.repository.writeJsonAtomic(await this.snapshotPath(channelId, quizShortId), snapshot);
  }

  private async snapshotPath(channelId: string, quizShortId: string): Promise<string> {
    assertSafeId(quizShortId, "Quiz Short id");
    const channel = await this.repository.getChannel(channelId);
    return this.repository.resolvePath("channels", channel.slug, SELECTIONS_DIRECTORY, `${quizShortId}.json`);
  }

  private async readPairFile(root: string, pairId: string, strict = false): Promise<QuizShortBookendPair | null> {
    if (!SAFE_ID.test(pairId)) return null;
    try {
      return QuizShortBookendPairSchema.parse(JSON.parse(await readFile(path.join(root, pairId, "meta.json"), "utf8")));
    } catch (error) {
      if (isMissingFile(error)) return null;
      if (strict) throw error;
      return null;
    }
  }
}
