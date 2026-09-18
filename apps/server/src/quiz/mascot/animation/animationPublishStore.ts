import fs from "node:fs/promises";
import path from "node:path";
import { writeJsonAtomic } from "../../../utils/fs.js";
import { ImmutableRecordError, AnimationRepositoryError, type PublishedAnimationRecord } from "./animationRepositoryTypes.js";
import type { AnimationState } from "@studio/shared";

function buildPublishDir(storageRoot: string, mascotId: string, styleId: string, state: AnimationState): string {
  return path.join(storageRoot, "mascots", mascotId, "published_animations", styleId, state);
}

function buildRecordPath(
  storageRoot: string,
  mascotId: string,
  styleId: string,
  state: AnimationState,
  slotIndex: number,
  revision: number,
): string {
  const dir = buildPublishDir(storageRoot, mascotId, styleId, state);
  return path.join(dir, `slot_${slotIndex}_rev${revision}.json`);
}

export async function savePublishedRecordToDisk(storageRoot: string, record: PublishedAnimationRecord): Promise<PublishedAnimationRecord> {
  const targetPath = buildRecordPath(storageRoot, record.mascot_id, record.style_id, record.state, record.slot_index, record.revision);

  // Check if this exact revision already exists
  const alreadyExists = await fs
    .access(targetPath)
    .then(() => true)
    .catch(() => false);
  if (alreadyExists) {
    throw new ImmutableRecordError(
      `Published animation record for mascot=${record.mascot_id} style=${record.style_id} state=${record.state} slot=${record.slot_index} rev=${record.revision} is immutable and cannot be overwritten`,
    );
  }

  // Check if an equal or higher revision already exists
  const existing = await listPublishedRecordsFromDisk(storageRoot, record.mascot_id, record.style_id, record.state, record.slot_index);
  const highestRevision = existing.length > 0 ? Math.max(...existing.map((r) => r.revision)) : 0;
  if (record.revision <= highestRevision) {
    throw new AnimationRepositoryError(
      `Published revision ${record.revision} must be strictly greater than current revision ${highestRevision}`,
      "INVALID_REVISION",
    );
  }

  await writeJsonAtomic(targetPath, record);
  return record;
}

export async function getPublishedRecordFromDisk(
  storageRoot: string,
  mascotId: string,
  styleId: string,
  state: AnimationState,
  slotIndex: number,
  revision: number,
): Promise<PublishedAnimationRecord | null> {
  const targetPath = buildRecordPath(storageRoot, mascotId, styleId, state, slotIndex, revision);
  try {
    const raw = await fs.readFile(targetPath, "utf8");
    return JSON.parse(raw) as PublishedAnimationRecord;
  } catch {
    return null;
  }
}

export async function listPublishedRecordsFromDisk(
  storageRoot: string,
  mascotId: string,
  styleId: string,
  state: AnimationState,
  slotIndex: number,
): Promise<PublishedAnimationRecord[]> {
  const dir = buildPublishDir(storageRoot, mascotId, styleId, state);
  try {
    const entries = await fs.readdir(dir);
    const prefix = `slot_${slotIndex}_rev`;
    const matchedFiles = entries.filter((e) => e.startsWith(prefix) && e.endsWith(".json"));

    const records: PublishedAnimationRecord[] = [];
    for (const filename of matchedFiles) {
      try {
        const raw = await fs.readFile(path.join(dir, filename), "utf8");
        records.push(JSON.parse(raw) as PublishedAnimationRecord);
      } catch {
        // Skip unparseable
      }
    }

    return records.sort((a, b) => a.revision - b.revision);
  } catch {
    return [];
  }
}
