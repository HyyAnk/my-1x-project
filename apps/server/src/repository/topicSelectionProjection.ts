import { readdir, readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import type { Dirent } from "node:fs";
import type { TopicCandidate } from "@studio/shared";
import type { RepositoryRuntime } from "./runtime.js";
import { RepositoryError } from "./service.js";
import type { TopicRun } from "./helpers.js";
import { ensureWriterAdmission, releaseWriterAdmission, reserveWriterOperation } from "./shortReelWriterAdmission.js";

const topicRunQueues = new Map<string, Promise<unknown>>();

/**
 * Serializes read-modify-write operations on topic runs for a given directory/root,
 * preventing concurrent mutations from clobbering each other.
 */
export function serializeTopicRunOperation<T>(key: string, operation: () => Promise<T>): Promise<T> {
  const current = topicRunQueues.get(key) ?? Promise.resolve();
  const next = current.catch(() => {}).then(() => operation());
  const tail = next.then(
    () => undefined,
    () => undefined,
  );
  topicRunQueues.set(key, tail);
  return next.finally(() => {
    if (topicRunQueues.get(key) === tail) topicRunQueues.delete(key);
  });
}

/**
 * Durably marks a topic candidate as selected within its stored topic run files.
 * Distinguishes disk JSON parse errors (skipped) from operational I/O failures (thrown).
 * Serialized at the channel topic run directory boundary.
 */
export async function projectTopicSelected(
  runtime: RepositoryRuntime,
  channelId: string,
  topicId: string,
  questionCount: number,
): Promise<void> {
  const channel = await runtime.getChannel(channelId);
  const directory = runtime.resolvePath("channels", channel.slug, "topics");
  const storageRoot = runtime.storageRoot;
  const ownerId = `${runtime.serviceId}:topic-projection:${randomUUID()}`;
  ensureWriterAdmission(storageRoot, ownerId);
  const finishWriterOperation = reserveWriterOperation(storageRoot, ownerId);

  return serializeTopicRunOperation(directory, async () => {
    let entries: Dirent[];
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === "ENOENT") return;
      const message = err instanceof Error ? err.message : String(err);
      throw new RepositoryError(`Failed to read topics directory: ${message}`, "STORAGE_ERROR");
    }

    for (const entry of entries.filter((item) => item.isFile() && item.name.endsWith(".json"))) {
      const filePath = path.join(directory, entry.name);
      let raw: string;
      try {
        raw = await readFile(filePath, "utf8");
      } catch (err: unknown) {
        const code = (err as { code?: string })?.code;
        if (code === "ENOENT") continue;
        const message = err instanceof Error ? err.message : String(err);
        throw new RepositoryError(`Failed to read topic run file '${entry.name}': ${message}`, "STORAGE_ERROR");
      }

      let run: TopicRun;
      try {
        run = JSON.parse(raw) as TopicRun;
      } catch {
        // Ignore malformed historical runs, but ONLY genuine JSON parse errors
        continue;
      }

      if (!run || !Array.isArray(run.candidates)) {
        continue;
      }

      let changed = false;
      run.candidates = run.candidates.map((topic: TopicCandidate): TopicCandidate => {
        if (topic.topic_id !== topicId) return topic;
        changed = true;
        if (topic.content_kind === "short_reel") {
          return { ...topic, selected: true, question_count: 1 as const };
        }
        return { ...topic, selected: true, question_count: questionCount };
      });

      if (changed) {
        // Operational write failure must NOT be swallowed; propagate for safe retry
        await runtime.writeJsonAtomic(filePath, run);
      }
    }
  }).finally(async () => {
    finishWriterOperation();
    await releaseWriterAdmission(storageRoot, ownerId);
  });
}
