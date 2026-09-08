import { ShortReelRecordSchema, type ReelKey, type ShortReelRecord } from "@studio/shared";
import type { RepositoryRuntime } from "./runtime.js";
import {
  resolveCanonicalStorageRoot,
  resolveShortReelFile,
  runInCanonicalShortReelQueue,
  writeShortReelJsonAtomic,
} from "./shortReelStorage.js";

/** The callback executes under the same admission and record queue as ordinary edits. */
export async function mutateShortReelRecord(
  repository: RepositoryRuntime,
  key: ReelKey,
  mutate: (current: ShortReelRecord) => ShortReelRecord | null,
): Promise<ShortReelRecord> {
  repository.acquireWriterAdmission();
  const root = resolveCanonicalStorageRoot(repository.storageRoot);
  return runInCanonicalShortReelQueue(
    root,
    `${key.channel_id}:${key.reel_id}`,
    async () => {
      const current = await repository.getShortReel(key);
      const next = mutate(structuredClone(current));
      if (!next) return current;
      next.revision = current.revision + 1;
      next.updated_at = new Date().toISOString();
      const validated = ShortReelRecordSchema.parse(next);
      const channel = await repository.getChannel(key.channel_id);
      await writeShortReelJsonAtomic(resolveShortReelFile(repository.roots, channel.slug, key.reel_id), validated);
      return validated;
    },
    repository.serviceId,
  );
}
