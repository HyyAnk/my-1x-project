import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import {
  ShortReelEditCommandSchema,
  createInitialShortReel,
  canonicalJsonStringify,
  sha256Hex,
  type MutationContext,
  type ReelKey,
  type ShortReelEditCommand,
  type ShortReelRecord,
  type ShortReelSourceSnapshot,
  type ShortReelTopicSnapshot,
} from "@studio/shared";
import { RepositoryError } from "./errors.js";
import { applyShortReelEdit } from "./shortReelEdits.js";
import type { RepositoryRuntime } from "./runtime.js";
import { assertShortReelSourceMutation, requireCompleteShortReelSource } from "./shortReelSourcePolicy.js";
import {
  readShortReelJson,
  resolveCanonicalStorageRoot,
  resolveShortReelDirectory,
  resolveShortReelFile,
  resolveShortReelsRoot,
  runInCanonicalShortReelQueue,
  writeShortReelJsonAtomic,
} from "./shortReelStorage.js";
import {
  extractShortReelDisplayProjection,
  loadShortReelLocalizationArtifact,
} from "../quiz/bank/localization/productLocalization.js";

export async function listShortReels(this: RepositoryRuntime, channelId: string): Promise<ShortReelRecord[]> {
  const channel = await this.getChannel(channelId);
  const root = resolveShortReelsRoot(this.roots, channel.slug);
  await mkdir(root, { recursive: true });

  const entries = await readdir(root, { withFileTypes: true });
  const reels: ShortReelRecord[] = [];

  for (const entry of entries.filter((e) => e.isDirectory())) {
    try {
      const reelFile = resolveShortReelFile(this.roots, channel.slug, entry.name);
      await this.assertRealPathInside(root, path.dirname(reelFile));
      const record = await readShortReelJson(reelFile);
      if (record.channel_id === channel.channel_id) {
        reels.push(record);
      }
    } catch {
      // Safely ignore missing or corrupted individual entries
    }
  }

  return reels.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export async function getShortReel(this: RepositoryRuntime, key: ReelKey): Promise<ShortReelRecord> {
  const channel = await this.getChannel(key.channel_id);
  const root = resolveShortReelsRoot(this.roots, channel.slug);
  const dir = resolveShortReelDirectory(this.roots, channel.slug, key.reel_id);
  const file = resolveShortReelFile(this.roots, channel.slug, key.reel_id);

  if (!(await this.exists(file))) {
    throw new RepositoryError(`Short-Reel not found: ${key.reel_id}`, "SHORT_REEL_NOT_FOUND");
  }

  await this.assertRealPathInside(root, dir);
  const record = await readShortReelJson(file);

  if (record.channel_id !== key.channel_id) {
    throw new RepositoryError("Short-Reel not found", "SHORT_REEL_NOT_FOUND");
  }

  return record;
}

export async function getShortReelByTopic(this: RepositoryRuntime, channelId: string, topicId: string): Promise<ShortReelRecord | null> {
  const all = await this.listShortReels(channelId);
  return all.find((r) => r.topic_id === topicId) ?? null;
}

export async function createShortReel(
  this: RepositoryRuntime,
  channelId: string,
  topic: ShortReelTopicSnapshot,
  source: ShortReelSourceSnapshot,
  requestId: string,
): Promise<ShortReelRecord> {
  this.acquireWriterAdmission();
  const canonicalRoot = resolveCanonicalStorageRoot(this.storageRoot);
  const lockKey = `${channelId}:create:${topic.topic_id}`;

  return runInCanonicalShortReelQueue(
    canonicalRoot,
    lockKey,
    async () => {
      const channel = await this.getChannel(channelId);
      const existing = await this.getShortReelByTopic(channelId, topic.topic_id);

      const createPayloadHash = sha256Hex(
        canonicalJsonStringify({
          channel_id: channelId,
          topic_id: topic.topic_id,
          source_hash: source.content_hash,
        }),
      );

      if (existing) {
        if (requestId) {
          const receipt =
            (existing.mutation_history ?? []).find((m) => m.request_id === requestId) ??
            (existing.last_mutation?.request_id === requestId ? existing.last_mutation : null);
          if (receipt) {
            if (receipt.command_hash === createPayloadHash) {
              return existing;
            }
            throw new RepositoryError("Replayed request ID with conflicting create payload", "REQUEST_CONFLICT");
          }
        }
        return existing;
      }

      const completeSource = requireCompleteShortReelSource(source);
      const now = new Date().toISOString();
      const initial = createInitialShortReel({
        channel_id: channelId,
        topic,
        source: completeSource,
      });

      const receipt = {
        request_id: requestId,
        revision: 1,
        command_kind: "create",
        command_hash: createPayloadHash,
        applied_at: now,
      };
      initial.last_mutation = receipt;
      initial.mutation_history = [receipt];

      const targetFile = resolveShortReelFile(this.roots, channel.slug, initial.reel_id);
      await writeShortReelJsonAtomic(targetFile, initial);
      return initial;
    },
    this.serviceId,
  );
}

export async function updateShortReel(
  this: RepositoryRuntime,
  key: ReelKey,
  context: MutationContext,
  command: ShortReelEditCommand,
): Promise<ShortReelRecord> {
  this.acquireWriterAdmission();
  const canonicalRoot = resolveCanonicalStorageRoot(this.storageRoot);
  if (command.kind === "replace_source_question") requireCompleteShortReelSource(command.source);
  const validatedCommand = ShortReelEditCommandSchema.parse(command);
  const queueKey = `${key.channel_id}:${key.reel_id}`;

  return runInCanonicalShortReelQueue(
    canonicalRoot,
    queueKey,
    async () => {
      const channel = await this.getChannel(key.channel_id);
      const current = await this.getShortReel(key);
      assertShortReelSourceMutation(current.source, validatedCommand);

      const commandHash = sha256Hex(JSON.stringify(validatedCommand));

      // Check request idempotency / replay
      const priorMutation =
        (current.mutation_history ?? []).find((m) => m.request_id === context.request_id) ??
        (current.last_mutation?.request_id === context.request_id ? current.last_mutation : null);
      if (priorMutation) {
        if (priorMutation.command_hash === commandHash) {
          return current; // Replay returning same record
        }
        throw new RepositoryError("Replayed request ID with conflicting payload", "REQUEST_CONFLICT");
      }

      // CAS revision check
      if (current.revision !== context.expected_revision) {
        throw new RepositoryError(
          `Revision conflict: expected revision ${context.expected_revision}, but current is ${current.revision}`,
          "REVISION_CONFLICT",
        );
      }

      const nextRevision = current.revision + 1;
      const now = new Date().toISOString();

      const updated: ShortReelRecord = structuredClone(current);
      updated.revision = nextRevision;
      updated.updated_at = now;

      if (
        (validatedCommand.kind === "update_script" || validatedCommand.kind === "update_segment") &&
        !validatedCommand.display_projection
      ) {
        const localization = await loadShortReelLocalizationArtifact(this, key.channel_id, key.reel_id);
        const displayProjection = extractShortReelDisplayProjection(current.source, localization);
        if (displayProjection) {
          validatedCommand.display_projection = displayProjection;
        }
      }

      applyShortReelEdit(updated, validatedCommand);

      const receipt = {
        request_id: context.request_id,
        revision: nextRevision,
        command_kind: validatedCommand.kind,
        command_hash: commandHash,
        applied_at: now,
      };
      updated.last_mutation = receipt;
      const history = updated.mutation_history ? [...updated.mutation_history] : [];
      history.push(receipt);
      // Durable replay protection: retain complete mutation history
      updated.mutation_history = history;

      const targetFile = resolveShortReelFile(this.roots, channel.slug, key.reel_id);
      await writeShortReelJsonAtomic(targetFile, updated);
      return updated;
    },
    this.serviceId,
  );
}
