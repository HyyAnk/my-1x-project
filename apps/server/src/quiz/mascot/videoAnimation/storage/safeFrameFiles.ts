import { lstat, readdir, realpath, unlink } from "node:fs/promises";
import path from "node:path";
import type { CleanupResult, FrameInventory } from "./retention.types.js";

export async function assertContainedPath(root: string, target: string): Promise<void> {
  const base = path.resolve(root);
  const relative = path.relative(base, path.resolve(target));
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("Unsafe retention target");
  if ((await lstat(base)).isSymbolicLink()) throw new Error("Storage root must not be a link");
  let current = base;
  for (const segment of relative.split(path.sep)) {
    current = path.join(current, segment);
    if ((await lstat(current)).isSymbolicLink()) throw new Error(`Linked retention path: ${current}`);
  }
  const realRelative = path.relative(await realpath(base), await realpath(target));
  if (realRelative.startsWith("..") || path.isAbsolute(realRelative)) throw new Error("Retention path escapes storage root");
}

export async function inventoryFrames(root: string, directory: string): Promise<FrameInventory> {
  const result: FrameInventory = { directory, files: [], bytes: 0 };
  try {
    await lstat(directory);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return result;
    throw error;
  }
  await assertContainedPath(root, directory);
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (!entry.isFile() || !/^frame_\d{3,6}\.png$/.test(entry.name)) throw new Error(`Unexpected frame entry: ${entry.name}`);
    const file = path.join(directory, entry.name);
    const stat = await lstat(file);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`Unsafe frame: ${file}`);
    result.files.push({ path: file, size: stat.size, modifiedMs: stat.mtimeMs });
    result.bytes += stat.size;
  }
  return result;
}

/** Only called by the owning job before releasing its queue slot; never deletes directories. */
export async function removeInventoriedFrames(root: string, inventory: FrameInventory): Promise<CleanupResult> {
  const result = { files: 0, bytes: 0 };
  for (const file of inventory.files) {
    await assertContainedPath(root, file.path);
    const stat = await lstat(file.path);
    if (!stat.isFile() || stat.size !== file.size || stat.mtimeMs !== file.modifiedMs) throw new Error("Frame changed during cleanup");
    await unlink(file.path);
    result.files += 1;
    result.bytes += file.size;
  }
  return result;
}
