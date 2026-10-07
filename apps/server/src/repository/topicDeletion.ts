import { readdir, readFile, unlink } from "node:fs/promises";
import path from "node:path";
import type { Dirent } from "node:fs";
import type { TopicCandidate } from "@studio/shared";
import type { RepositoryRuntime } from "./runtime.js";
import { RepositoryError } from "./service.js";
import type { TopicRun } from "./helpers.js";
import { serializeTopicRunOperation } from "./topicSelectionProjection.js";
import { findLatestTopicRunFile } from "./topicRunReader.js";
import { listTopics } from "./topics.js";

/** Reads all JSON files in the given topics directory. */
async function getTopicDirectoryJsonFiles(directory: string): Promise<Dirent[]> {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    return entries.filter((item) => item.isFile() && item.name.endsWith(".json"));
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === "ENOENT") return [];
    const message = err instanceof Error ? err.message : String(err);
    throw new RepositoryError(`Failed to read topics directory: ${message}`, "STORAGE_ERROR");
  }
}

/** Parses topic run from a file, returning null if malformed or non-existent. */
async function readTopicRunSafe(filePath: string): Promise<TopicRun | null> {
  try {
    const raw = await readFile(filePath, "utf8");
    const run = JSON.parse(raw) as TopicRun;
    return run && Array.isArray(run.candidates) ? run : null;
  } catch {
    return null;
  }
}

/** Synchronizes the topic_database.json file with current remaining topics. */
async function syncTopicDatabase(runtime: RepositoryRuntime, channelSlug: string, channelId: string): Promise<void> {
  const remaining = await listTopics.call(runtime, channelId);
  const topicDbPath = path.join(runtime.resolvePath("channels", channelSlug), "topic_database.json");
  await runtime.writeJsonAtomic(
    topicDbPath,
    remaining.map(({ title, premise }) => ({ title, premise })),
  );
}

/**
 * Deletes a single topic candidate by ID across all topic run files in the channel.
 * If a topic run becomes empty after deletion, the run file is removed.
 */
export async function deleteTopicCandidate(this: RepositoryRuntime, channelId: string, topicId: string): Promise<boolean> {
  const channel = await this.getChannel(channelId);
  const directory = this.resolvePath("channels", channel.slug, "topics");

  return serializeTopicRunOperation(directory, async () => {
    const entries = await getTopicDirectoryJsonFiles(directory);
    let deleted = false;

    for (const entry of entries) {
      const filePath = path.join(directory, entry.name);
      const run = await readTopicRunSafe(filePath);
      if (!run) continue;

      const initialCount = run.candidates.length;
      run.candidates = run.candidates.filter((topic: TopicCandidate) => topic.topic_id !== topicId);

      if (run.candidates.length < initialCount) {
        deleted = true;
        if (run.candidates.length === 0) {
          await unlink(filePath).catch(() => {});
        } else {
          await this.writeJsonAtomic(filePath, run);
        }
      }
    }

    if (deleted) {
      await syncTopicDatabase(this, channel.slug, channelId);
    }

    return deleted;
  });
}

export interface ClearTopicHistoryOptions {
  unselectedOnly?: boolean;
}

/**
 * Clears topic candidates from historical runs (all runs older than the latest run).
 * Optionally preserves candidates that were previously selected.
 */
export async function clearTopicHistory(
  this: RepositoryRuntime,
  channelId: string,
  options: ClearTopicHistoryOptions = {},
): Promise<{ deleted_count: number }> {
  const channel = await this.getChannel(channelId);
  const directory = this.resolvePath("channels", channel.slug, "topics");

  return serializeTopicRunOperation(directory, async () => {
    const latestFile = await findLatestTopicRunFile(directory);
    const latestFileName = latestFile?.entry?.name;
    const entries = await getTopicDirectoryJsonFiles(directory);
    let totalDeleted = 0;

    for (const entry of entries) {
      if (entry.name === latestFileName) continue;

      const filePath = path.join(directory, entry.name);
      const run = await readTopicRunSafe(filePath);
      if (!run) continue;

      if (options.unselectedOnly) {
        const retained = run.candidates.filter((topic: TopicCandidate) => topic.selected === true);
        const removedCount = run.candidates.length - retained.length;

        if (removedCount > 0) {
          totalDeleted += removedCount;
          if (retained.length === 0) {
            await unlink(filePath).catch(() => {});
          } else {
            run.candidates = retained;
            await this.writeJsonAtomic(filePath, run);
          }
        }
      } else {
        totalDeleted += run.candidates.length;
        await unlink(filePath).catch(() => {});
      }
    }

    if (totalDeleted > 0) {
      await syncTopicDatabase(this, channel.slug, channelId);
    }

    return { deleted_count: totalDeleted };
  });
}
