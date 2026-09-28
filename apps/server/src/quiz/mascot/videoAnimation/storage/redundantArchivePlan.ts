import { lstat, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { hashFile, loadArchive, fileExists } from "./archiveFiles.js";
import { assertContainedPath } from "./safeFrameFiles.js";
import { planAttemptRetention } from "./attemptRetentionPlan.js";

export interface RedundantArchivePlan {
  archive: string;
  attempt: string;
  sourceHash: string;
  files: { path: string; size: number; sha256: string }[];
  bytes: number;
}

/** Archive frames are disposable only while the exact source and completed outputs survive centrally. */
export async function planRedundantArchive(root: string, archive: string): Promise<RedundantArchivePlan> {
  if (!/^source-[a-f0-9-]{36}$/.test(path.basename(archive))) throw new Error("Not a recognized source archive");
  await assertContainedPath(path.parse(archive).root, archive);
  const manifest = await loadArchive(root, archive);
  const attempt = path.join(root, ...manifest.attempt.split("/"));
  await planAttemptRetention(root, attempt);
  const completedFile = path.join(archive, "completed.json");
  await assertContainedPath(archive, completedFile);
  const completed: unknown = JSON.parse(await readFile(completedFile, "utf8"));
  if (!completed || typeof completed !== "object" || !("files" in completed) || completed.files !== manifest.files.length)
    throw new Error("Archive is not confirmed complete");
  const source = path.join(attempt, "source.mp4");
  const backup = path.join(archive, "originals", "source.mp4");
  const sourceHash = await hashFile(source);
  const hasBackup = await fileExists(backup);
  if (hasBackup) {
    await assertContainedPath(archive, backup);
    if ((await hashFile(backup)) !== sourceHash) throw new Error("Central source differs from archived source");
  } else {
    const intentPath = path.join(archive, "purge-intent.json");
    await assertContainedPath(archive, intentPath);
    const intent: unknown = JSON.parse(await readFile(intentPath, "utf8"));
    if (
      !intent ||
      typeof intent !== "object" ||
      !("attempt" in intent) ||
      intent.attempt !== attempt ||
      !("sourceHash" in intent) ||
      intent.sourceHash !== sourceHash
    )
      throw new Error("Missing source backup without matching purge intent");
  }
  const frames = path.join(archive, "frames");
  await assertContainedPath(archive, frames);
  const expected = new Map(manifest.files.map((entry) => [entry.name, entry]));
  const result: RedundantArchivePlan = { archive, attempt, sourceHash, files: [], bytes: 0 };
  for (const item of await readdir(frames, { withFileTypes: true })) {
    const entry = expected.get(item.name);
    if (!entry || !item.isFile() || item.isSymbolicLink()) throw new Error(`Unexpected archived entry: ${item.name}`);
    const file = path.join(frames, item.name);
    await assertContainedPath(archive, file);
    if ((await lstat(file)).size !== entry.size || (await hashFile(file)) !== entry.sha256)
      throw new Error(`Archive checksum mismatch: ${item.name}`);
    result.files.push({ path: file, size: entry.size, sha256: entry.sha256 });
    result.bytes += entry.size;
  }
  // Missing entries are allowed only after a durable purge intent was written.
  if (result.files.length !== manifest.files.length && !(await fileExists(path.join(archive, "purge-intent.json"))))
    throw new Error("Incomplete archive without a purge journal");
  if (hasBackup) {
    const size = (await lstat(backup)).size;
    result.files.push({ path: backup, size, sha256: sourceHash });
    result.bytes += size;
  }
  return result;
}
