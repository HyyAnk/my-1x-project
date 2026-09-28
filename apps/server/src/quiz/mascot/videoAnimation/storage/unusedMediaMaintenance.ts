import { lstat, readdir, mkdir, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { readLibraryDocuments, referencedMediaNames } from "./libraryReferences.js";
import { assertContainedPath } from "./safeFrameFiles.js";
import { hashFile, writeDurableJson } from "./archiveFiles.js";
import { auditMascotStorage } from "./storageAudit.js";
import { verifyArchiveArtifacts } from "./verifyArchiveArtifacts.js";

interface Candidate {
  file: string;
  size: number;
  modifiedMs: number;
  hash: string;
  reason: string;
  canonical?: string;
}

/** Run exclusively before application startup or under the offline maintenance lease. */
export async function maintainUnusedMedia(root: string, apply: boolean, log: (message: string) => void, now = Date.now()) {
  const library = path.dirname(root);
  const documents = await readLibraryDocuments(library);
  if (
    documents.some(
      (document) =>
        document.value !== undefined &&
        !document.file.startsWith(path.join(root, "mascots") + path.sep) &&
        /"status"\s*:\s*"(?:running|queued|pending|processing|uploading|retrying|replacing)"/i.test(JSON.stringify(document.value)),
    )
  ) {
    log("Deferred: persisted active or recoverable jobs exist");
    return { files: 0, bytes: 0 };
  }
  const referenced = referencedMediaNames(documents);
  const candidates: Candidate[] = [];
  const graceMs = 7 * 24 * 60 * 60 * 1000;
  async function consider(file: string, reason: string, canonical?: string): Promise<void> {
    if (referenced.has(path.basename(file).toLowerCase())) return;
    await assertContainedPath(library, file);
    const stat = await lstat(file);
    if (!stat.isFile() || now - stat.mtimeMs < graceMs) return;
    const hash = await hashFile(file);
    if (canonical && (await hashFile(canonical)) !== hash) return;
    candidates.push({ file, reason, canonical, size: stat.size, modifiedMs: stat.mtimeMs, hash });
  }
  async function scanNarration(directory: string): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`Linked narration path: ${file}`);
      if (entry.isDirectory()) await scanNarration(file);
      else if (/^quiz-narration-\d+\.wav$/.test(entry.name) && path.basename(directory) === "assets")
        await consider(file, "Unreferenced generated narration older than seven days");
    }
  }
  try {
    await scanNarration(path.join(library, "channels"));
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
  }
  const audit = await auditMascotStorage(root);
  for (const plan of audit.attempts) {
    for (const entry of await readdir(plan.attemptDirectory, { withFileTypes: true })) {
      if (!entry.isFile() || !/^\d+\.mp4$/i.test(entry.name)) continue;
      const before = candidates.length;
      await consider(
        path.join(plan.attemptDirectory, entry.name),
        "Unreferenced byte-identical upload duplicate",
        path.join(plan.attemptDirectory, "source.mp4"),
      );
      if (apply && candidates.length > before) await verifyArchiveArtifacts(plan);
    }
  }
  const result = { files: candidates.length, bytes: candidates.reduce((sum, item) => sum + item.size, 0) };
  log(
    `mode=${apply ? "apply" : "dry-run"}; candidates=${result.files}; bytes=${result.bytes}; graceDays=7; excludedAttempts=${audit.skipped.length}`,
  );
  if (!apply || !candidates.length) return result;
  const journal = path.join(root, "maintenance", `unused-${randomUUID()}`);
  await mkdir(journal, { recursive: true });
  await assertContainedPath(root, journal);
  await writeDurableJson(path.join(journal, "plan.json"), { createdAt: new Date(now).toISOString(), candidates });
  const current = await readLibraryDocuments(library);
  if (
    documents.length !== current.length ||
    documents.some((item, index) => item.file !== current[index].file || item.hash !== current[index].hash)
  )
    throw new Error("Library references changed during maintenance");
  for (const item of candidates) {
    await assertContainedPath(library, item.file);
    const stat = await lstat(item.file);
    if (stat.size !== item.size || stat.mtimeMs !== item.modifiedMs || (await hashFile(item.file)) !== item.hash)
      throw new Error(`Candidate changed: ${item.file}`);
    if (item.canonical) {
      await assertContainedPath(library, item.canonical);
      if ((await hashFile(item.canonical)) !== item.hash) throw new Error("Canonical source changed");
    }
    await unlink(item.file);
  }
  await writeDurableJson(path.join(journal, "completed.json"), result);
  return result;
}
