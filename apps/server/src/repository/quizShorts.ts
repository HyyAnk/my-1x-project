import { mkdir, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { QUIZ_SHORT_ID_PREFIX, QuizShortSchema, makeId, nowIso, type QuizShort } from "@studio/shared";
import { RepositoryError } from "./errors.js";
import { quizProductRecordFilename, resolveQuizProductCollectionDirectory, resolveQuizProductDirectory } from "./quizProductPaths.js";
import type { RepositoryRuntime } from "./runtime.js";

const RECORD_FILENAME = quizProductRecordFilename("quiz_short");

/** Ids follow the shared `qshort_` prefix so string product ids resolve to the Quiz Short kind. */
export function createQuizShortId(): string {
  return makeId(QUIZ_SHORT_ID_PREFIX.replace(/_$/, ""));
}

async function readQuizShortRecord(directory: string): Promise<QuizShort> {
  return QuizShortSchema.parse(JSON.parse(await readFile(path.join(directory, RECORD_FILENAME), "utf8")));
}

function rememberQuizShort(runtime: RepositoryRuntime, quizShort: QuizShort): void {
  runtime.quizShortSlugCache.set(quizShort.channel_id, quizShort.quiz_short_id, quizShort.slug);
  runtime.entityIdResolver.setEpisodeTitle(quizShort.quiz_short_id, quizShort.topic?.title || "");
}

export async function listQuizShorts(this: RepositoryRuntime, channelId: string): Promise<QuizShort[]> {
  const channel = await this.getChannel(channelId);
  const collection = resolveQuizProductCollectionDirectory(this.roots, "quiz_short", channel.slug);
  await mkdir(collection, { recursive: true });
  const entries = await readdir(collection, { withFileTypes: true });
  const quizShorts: QuizShort[] = [];
  for (const entry of entries.filter((item) => item.isDirectory())) {
    try {
      const directory = resolveQuizProductDirectory(this.roots, "quiz_short", channel.slug, entry.name);
      await this.assertRealPathInside(collection, directory);
      const quizShort = await readQuizShortRecord(directory);
      quizShorts.push(quizShort);
      rememberQuizShort(this, quizShort);
    } catch {
      // Ignore incomplete directories and keep the rest visible, mirroring listEpisodes.
    }
  }
  return quizShorts.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

async function readCachedQuizShort(runtime: RepositoryRuntime, channelId: string, quizShortId: string): Promise<QuizShort | null> {
  const cachedSlug = runtime.quizShortSlugCache.get(channelId, quizShortId);
  if (!cachedSlug) return null;
  try {
    const channel = await runtime.getChannel(channelId);
    const collection = resolveQuizProductCollectionDirectory(runtime.roots, "quiz_short", channel.slug);
    const directory = resolveQuizProductDirectory(runtime.roots, "quiz_short", channel.slug, cachedSlug);
    await runtime.assertRealPathInside(collection, directory);
    const quizShort = await readQuizShortRecord(directory);
    if (quizShort.quiz_short_id === quizShortId && quizShort.channel_id === channelId) return quizShort;
  } catch {
    // Fall through to the directory scan below.
  }
  runtime.quizShortSlugCache.delete(channelId, quizShortId);
  return null;
}

export async function getQuizShort(this: RepositoryRuntime, channelId: string, quizShortId: string): Promise<QuizShort> {
  const cached = await readCachedQuizShort(this, channelId, quizShortId);
  if (cached) return cached;
  const quizShort = (await this.listQuizShorts(channelId)).find((item) => item.quiz_short_id === quizShortId);
  if (!quizShort) throw new RepositoryError("Quiz Short not found", "QUIZ_SHORT_NOT_FOUND");
  return quizShort;
}

/** Writes the record to `channels/<slug>/quiz_shorts/<slug>/quiz_short.json`, creating the directory when needed. */
export async function saveQuizShort(this: RepositoryRuntime, channelId: string, quizShort: QuizShort): Promise<QuizShort> {
  const parsed = QuizShortSchema.parse(quizShort);
  if (parsed.channel_id !== channelId) throw new RepositoryError("Quiz Short belongs to another channel", "CHANNEL_MISMATCH");
  const channel = await this.getChannel(channelId);
  const directory = resolveQuizProductDirectory(this.roots, "quiz_short", channel.slug, parsed.slug);
  await mkdir(directory, { recursive: true });
  await this.writeJsonAtomic(path.join(directory, RECORD_FILENAME), parsed);
  rememberQuizShort(this, parsed);
  return parsed;
}

export async function deleteQuizShort(this: RepositoryRuntime, channelId: string, quizShortId: string, confirmed = true): Promise<void> {
  if (!confirmed) throw new RepositoryError("Delete confirmation is required", "CONFIRMATION_REQUIRED");
  const quizShort = await this.getQuizShort(channelId, quizShortId);
  const channel = await this.getChannel(channelId);
  const collection = resolveQuizProductCollectionDirectory(this.roots, "quiz_short", channel.slug);
  const directory = resolveQuizProductDirectory(this.roots, "quiz_short", channel.slug, quizShort.slug);
  await this.assertRealPathInside(collection, directory);
  await this.removeQuestionHistoryEntries(channelId, { episodeIds: [quizShortId] });
  await this.removeTree(directory);
  this.quizShortSlugCache.delete(channelId, quizShortId);
  await this.updateChannel(channelId, { updated_at: nowIso() });
}
