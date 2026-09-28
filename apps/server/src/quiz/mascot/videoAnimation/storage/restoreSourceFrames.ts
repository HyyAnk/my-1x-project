import { mkdir } from "node:fs/promises";
import path from "node:path";
import { assertContainedPath } from "./safeFrameFiles.js";
import { copyVerified, fileExists, hashFile, loadArchive } from "./archiveFiles.js";

/** Restores only source frames. Existing matching files are skipped; conflicts never overwritten. */
export async function restoreSourceFrames(root: string, archive: string): Promise<{ restored: number; skipped: number }> {
  const manifest = await loadArchive(root, archive);
  const attempt = path.join(root, ...manifest.attempt.split("/"));
  await assertContainedPath(root, attempt);
  const directory = path.join(attempt, "frames", "source");
  await assertContainedPath(root, path.join(attempt, "frames"));
  await mkdir(directory, { recursive: true });
  await assertContainedPath(root, directory);
  // Preflight every file before writing any; permits recovery after an interrupted copy.
  for (const entry of manifest.files) {
    const destination = path.join(directory, entry.name);
    if (await fileExists(destination)) {
      await assertContainedPath(root, destination);
      if ((await hashFile(destination)) !== entry.sha256) throw new Error(`Restore conflict: ${destination}`);
    } else {
      const source = path.join(archive, "frames", entry.name);
      await assertContainedPath(archive, source);
      if ((await hashFile(source)) !== entry.sha256) throw new Error(`Archive checksum mismatch: ${source}`);
    }
  }
  const result = { restored: 0, skipped: 0 };
  for (const entry of manifest.files) {
    const destination = path.join(directory, entry.name);
    if (await fileExists(destination)) {
      result.skipped++;
      continue;
    }
    await assertContainedPath(root, directory);
    await copyVerified(path.join(archive, "frames", entry.name), destination, entry.sha256);
    result.restored++;
  }
  return result;
}
