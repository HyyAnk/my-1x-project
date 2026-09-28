import { mkdir, lstat, statfs, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { planAttemptRetention } from "./attemptRetentionPlan.js";
import { assertContainedPath } from "./safeFrameFiles.js";
import { copyVerified, hashFile, writeDurableJson, type ArchiveManifest } from "./archiveFiles.js";
import type { AttemptRetentionPlan } from "./retention.types.js";

export interface ArchiveOptions {
  root: string;
  attempt: string;
  archiveRoot: string;
  verifyArtifacts: (plan: AttemptRetentionPlan) => Promise<void>;
  progress?: (step: string, completed: number, total: number) => void;
}

/** Caller must hold the maintenance lease with all writers offline throughout. */
export async function archiveSourceFrames(options: ArchiveOptions): Promise<{ archive: string; files: number; bytes: number }> {
  const { root, attempt, archiveRoot, verifyArtifacts, progress } = options;
  const plan = await planAttemptRetention(root, attempt);
  if (!plan.source.files.length) return { archive: "", files: 0, bytes: 0 };
  await verifyArtifacts(plan);
  await validateArchiveRoot(root, archiveRoot, plan.source.bytes);
  const archive = path.join(archiveRoot, `source-${randomUUID()}`);
  await mkdir(archive);
  await mkdir(path.join(archive, "frames"));
  await mkdir(path.join(archive, "originals"));
  const manifest: ArchiveManifest = {
    version: 1,
    root: path.resolve(root),
    attempt: path.relative(root, attempt).split(path.sep).join("/"),
    createdAt: new Date().toISOString(),
    files: [],
  };
  for (const entry of plan.source.files) {
    await assertContainedPath(root, entry.path);
    manifest.files.push({ name: path.basename(entry.path), size: entry.size, sha256: await hashFile(entry.path) });
  }
  await writeDurableJson(path.join(archive, "manifest.json"), manifest);
  await backupOriginals(root, attempt, archive);
  for (const [index, entry] of manifest.files.entries()) {
    const source = path.join(plan.source.directory, entry.name);
    await assertContainedPath(root, source);
    await copyVerified(source, path.join(archive, "frames", entry.name), entry.sha256);
    progress?.("copy", index + 1, manifest.files.length);
  }
  // Revalidate metadata and the complete candidate set before the first removal.
  const current = await planAttemptRetention(root, attempt);
  if (JSON.stringify(current.source) !== JSON.stringify(plan.source)) throw new Error(`Attempt changed; archive retained at ${archive}`);
  for (const entry of manifest.files) {
    const source = path.join(plan.source.directory, entry.name);
    await assertContainedPath(root, source);
    if ((await hashFile(source)) !== entry.sha256) throw new Error(`Source changed; archive retained at ${archive}`);
  }
  for (const [index, entry] of manifest.files.entries()) {
    const source = path.join(plan.source.directory, entry.name);
    await assertContainedPath(root, source);
    const stat = await lstat(source);
    if (!stat.isFile() || stat.size !== entry.size || (await hashFile(source)) !== entry.sha256)
      throw new Error(`Source changed; restore from ${archive}`);
    await unlink(source);
    progress?.("remove", index + 1, manifest.files.length);
  }
  await writeDurableJson(path.join(archive, "completed.json"), {
    files: manifest.files.length,
    bytes: plan.source.bytes,
    completedAt: new Date().toISOString(),
  });
  return { archive, files: manifest.files.length, bytes: plan.source.bytes };
}

async function validateArchiveRoot(root: string, archiveRoot: string, bytes: number): Promise<void> {
  if (!path.isAbsolute(archiveRoot)) throw new Error("Archive root must be absolute");
  await assertContainedPath(path.parse(archiveRoot).root, archiveRoot);
  const maintenance = path.join(path.resolve(root), "maintenance");
  const relative = path.relative(maintenance, path.resolve(archiveRoot));
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative))
    throw new Error("Recovery archives must be inside the configured storage maintenance directory; off-volume archives are disabled");
  const capacity = await statfs(archiveRoot);
  if (capacity.bavail * capacity.bsize < bytes + 1024 ** 3) throw new Error("Archive volume needs candidate bytes plus 1 GiB free");
}

async function backupOriginals(root: string, attempt: string, archive: string): Promise<void> {
  const originals = ["source.mp4", "attempt.json", "manifest.json"];
  for (const name of originals) {
    const source = path.join(attempt, name);
    await assertContainedPath(root, source);
    await copyVerified(source, path.join(archive, "originals", name), await hashFile(source));
  }
  const revision = path.join(path.dirname(path.dirname(attempt)), "revisions", `rev_${path.basename(attempt).slice(4)}.json`);
  await assertContainedPath(root, revision);
  await copyVerified(revision, path.join(archive, "originals", "revision.json"), await hashFile(revision));
}
