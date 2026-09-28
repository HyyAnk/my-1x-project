import { mkdir, open, rename, readFile, unlink } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { auditMascotStorage } from "./storageAudit.js";
import { readLibraryDocuments, referencedMediaNames } from "./libraryReferences.js";
import { compactLegacyRevisions } from "./compactLegacyRevisions.js";
import { assertContainedPath, removeInventoriedFrames } from "./safeFrameFiles.js";
import { copyVerified, hashFile, writeDurableJson } from "./archiveFiles.js";
import { verifyArchiveArtifacts } from "./verifyArchiveArtifacts.js";
import { mattedReferenceCheck } from "./mattedReferences.js";
import { fileExists } from "./archiveFiles.js";

/** Requires all writers offline and the library maintenance lease. Never archives media. */
export async function maintainLegacyStorage(root: string, apply: boolean, log: (message: string) => void, verify = verifyArchiveArtifacts) {
  const library = path.dirname(root);
  const audit = await auditMascotStorage(root);
  log(`Eligible=${audit.attempts.length}; excluded=${audit.skipped.length}`);
  if (apply)
    for (const [index, plan] of audit.attempts.entries()) {
      await verify(plan);
      if (index % 10 === 0) log(`Verify=${index + 1}/${audit.attempts.length}`);
    }
  const documents = await readLibraryDocuments(library);
  const updates = documents.flatMap((document) => {
    if (document.value === undefined) return [];
    const result = compactLegacyRevisions(document.value, root, audit.attempts);
    if (!result.changed) return [];
    document.value = result.value;
    return [{ document, changes: result.changed }];
  });
  const names = referencedMediaNames(documents);
  const frameReferenced = mattedReferenceCheck(root, documents);
  const inventories = audit.attempts.map((plan) => ({
    ...plan.matted,
    files: plan.matted.files.filter((entry) => !/^frame_0*1\.png$/.test(path.basename(entry.path)) && !frameReferenced(entry.path)),
  }));
  const bytes = inventories.reduce((sum, inventory) => sum + inventory.files.reduce((total, entry) => total + entry.size, 0), 0);
  const files = inventories.reduce((sum, inventory) => sum + inventory.files.length, 0);
  log(`MetadataFiles=${updates.length}; removableMattedFiles=${files}; bytes=${bytes}; retainedMediaNames=${names.size}`);
  if (!apply) return { files, bytes, metadataFiles: updates.length };
  const journal = path.join(root, "maintenance", `legacy-${randomUUID()}`);
  await mkdir(journal, { recursive: true });
  await assertContainedPath(root, journal);
  await writeDurableJson(path.join(journal, "plan.json"), {
    files,
    bytes,
    targets: inventories,
    metadata: updates.map(({ document }) => ({ path: document.file, hash: document.hash })),
  });
  for (const document of documents) {
    if ((await hashFile(document.file)) !== document.hash) throw new Error(`Reference changed: ${document.file}`);
  }
  for (const plan of audit.attempts) {
    const marker = path.join(plan.attemptDirectory, "retained-frames.json");
    if (!(await fileExists(marker)))
      await writeDurableJson(marker, {
        reason: "Legacy thumbnail and external references; never treat the remaining frames as disposable scratch",
        files: plan.matted.files
          .filter((entry) => /^frame_0*1\.png$/.test(path.basename(entry.path)) || frameReferenced(entry.path))
          .map((entry) => path.basename(entry.path)),
      });
  }
  for (const [index, { document }] of updates.entries()) {
    await assertContainedPath(library, document.file);
    await copyVerified(document.file, path.join(journal, `metadata-${index}.json`), document.hash);
    await replaceJson(document.file, document.value);
  }
  // Re-read every live reference after migration before deleting a single frame.
  const refreshedReferenceCheck = mattedReferenceCheck(root, await readLibraryDocuments(library));
  let removedFiles = 0;
  let removedBytes = 0;
  for (const inventory of inventories) {
    const safe = { ...inventory, files: inventory.files.filter((entry) => !refreshedReferenceCheck(entry.path)) };
    const removed = await removeInventoriedFrames(root, safe);
    removedFiles += removed.files;
    removedBytes += removed.bytes;
  }
  const result = { files: removedFiles, bytes: removedBytes, metadataFiles: updates.length };
  await writeDurableJson(path.join(journal, "completed.json"), result);
  log(`Completed=${JSON.stringify(result)}; journal=${journal}`);
  return result;
}

async function replaceJson(file: string, value: unknown): Promise<void> {
  const temporary = `${file}.${randomUUID()}.tmp`;
  const handle = await open(temporary, "wx");
  try {
    await handle.writeFile(JSON.stringify(value, null, 2));
    await handle.sync();
  } finally {
    await handle.close();
  }
  try {
    JSON.parse(await readFile(temporary, "utf8"));
    await rename(temporary, file);
  } catch (error) {
    await unlink(temporary);
    throw error;
  }
}
