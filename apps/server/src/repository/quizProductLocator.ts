import path from "node:path";
import {
  EpisodeSchema,
  QuizShortSchema,
  nowIso,
  type Episode,
  type QuizProductMediaFields,
  type QuizProductRef,
  type QuizShort,
} from "@studio/shared";
import {
  quizProductRecordFilename,
  quizProductRelativeDirectory,
  resolveQuizProductCollectionDirectory,
  resolveQuizProductDirectory,
  toQuizProductRef,
  type QuizProductId,
} from "./quizProductPaths.js";
import type { RepositoryRuntime } from "./runtime.js";

export type QuizProductRecord = Episode | QuizShort;

export type QuizProductLocation = {
  ref: QuizProductRef;
  channelSlug: string;
  productSlug: string;
  /** Absolute product directory, verified to live inside the channel root. */
  directory: string;
  /** Repository-relative POSIX directory, e.g. `channels/<slug>/episodes/<slug>`. */
  relativeDirectory: string;
  record: QuizProductRecord;
};

export function quizProductRecordId(record: QuizProductRecord): string {
  return "episode_id" in record ? record.episode_id : record.quiz_short_id;
}

async function loadQuizProductRecord(runtime: RepositoryRuntime, ref: QuizProductRef): Promise<QuizProductRecord> {
  return ref.kind === "episode" ? runtime.getEpisode(ref.channel_id, ref.product_id) : runtime.getQuizShort(ref.channel_id, ref.product_id);
}

/** Resolves a product (Episode or Quiz Short) to its record and safety-checked directory. */
export async function locateQuizProduct(this: RepositoryRuntime, channelId: string, product: QuizProductId): Promise<QuizProductLocation> {
  const ref = toQuizProductRef(channelId, product);
  const [record, channel] = await Promise.all([loadQuizProductRecord(this, ref), this.getChannel(ref.channel_id)]);
  const directory = resolveQuizProductDirectory(this.roots, ref.kind, channel.slug, record.slug);
  await this.assertRealPathInside(resolveQuizProductCollectionDirectory(this.roots, ref.kind, channel.slug), directory);
  return {
    ref,
    channelSlug: channel.slug,
    productSlug: record.slug,
    directory,
    relativeDirectory: quizProductRelativeDirectory(ref.kind, channel.slug, record.slug),
    record,
  };
}

export type QuizProductRecordPatch = Partial<QuizProductMediaFields> & { stage?: QuizProductRecord["stage"] };

/**
 * Applies a media/stage patch to whichever record kind the location holds and writes it back with
 * the matching schema. Keeps slug caches in sync, mirroring the episode writers.
 */
export async function writeQuizProductRecordPatch(
  this: RepositoryRuntime,
  location: QuizProductLocation,
  patch: QuizProductRecordPatch,
): Promise<QuizProductRecord> {
  const stamped = { ...location.record, ...patch, updated_at: nowIso() };
  const next: QuizProductRecord = location.ref.kind === "episode" ? EpisodeSchema.parse(stamped) : QuizShortSchema.parse(stamped);
  await this.writeJsonAtomic(path.join(location.directory, quizProductRecordFilename(location.ref.kind)), next);
  if (location.ref.kind === "episode") {
    this.entityIdResolver.setEpisodeSlug(location.ref.channel_id, location.ref.product_id, next.slug);
  } else {
    this.quizShortSlugCache.set(location.ref.channel_id, location.ref.product_id, next.slug);
  }
  return next;
}
