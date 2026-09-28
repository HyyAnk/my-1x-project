import { lstat, link, rename, unlink, open } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { assertContainedPath } from "./safeFrameFiles.js";
import { hashFile } from "./archiveFiles.js";

/** Preserve both public paths but allocate identical bytes once, on the same volume. */
export async function linkIdenticalMedia(root: string, canonical: string, duplicate: string): Promise<number> {
  await assertContainedPath(root, canonical);
  await assertContainedPath(root, duplicate);
  const [source, target] = await Promise.all([lstat(canonical), lstat(duplicate)]);
  if (!source.isFile() || !target.isFile() || source.size !== target.size || source.dev !== target.dev) return 0;
  if (source.ino === target.ino) return 0;
  const hash = await hashFile(canonical);
  if ((await hashFile(duplicate)) !== hash) return 0;
  const temporary = path.join(path.dirname(duplicate), `.dedup-${randomUUID()}.tmp`);
  await link(canonical, temporary);
  try {
    if ((await hashFile(temporary)) !== hash || (await hashFile(duplicate)) !== hash) throw new Error("Media changed during deduplication");
    await rename(temporary, duplicate);
  } catch (error) {
    await unlink(temporary);
    throw error;
  }
  return target.nlink === 1 ? target.size : 0;
}

/** Writes always replace the directory entry so updating an alias cannot mutate its siblings. */
export async function writeMediaAtomic(file: string, bytes: Uint8Array): Promise<void> {
  const temporary = `${file}.${randomUUID()}.tmp`;
  const handle = await open(temporary, "wx");
  try {
    await handle.writeFile(bytes);
    await handle.sync();
  } finally {
    await handle.close();
  }
  try {
    await rename(temporary, file);
  } catch (error) {
    await unlink(temporary);
    throw error;
  }
}
