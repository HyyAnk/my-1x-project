import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { RepositoryError } from "../../errors.js";
import type { RepositoryRuntime } from "../../runtime.js";
import { withBankRead, withBankWrite } from "./bankSerializationBoundary.js";
import {
  assertSafeBackupPath, assertSafeFilesystemPath, assertSafeRelativePath,
  assertValidMigrationId, collectBatchFiles, migrationRoot,
  resolveCanonicalRoot, verifyCanonicalRootMatch,
} from "./migration/bankMigrationSafety.js";
import { buildMigrationFile, parseBatchForMigration, sha256 } from "./migration/bankMigrationHasher.js";
import { assertManifestPathSafe, persistManifest } from "./migration/bankMigrationApplier.js";


export type BankMigrationFile = {
  relativePath: string;
  questionIds: string[];
  missingLanguageQuestionIds: string[];
  byteHashBefore: string;
  semanticHashBefore: string;
  semanticHashAfter: string;
  expectedByteHashAfter: string;
  backupPath: string;
};

export type BankLanguageMigrationManifest = {
  schemaVersion: 1;
  migrationId: string;
  canonicalRoot: string;
  indexByteHash: string;
  createdAt: string;
  status: "backed_up" | "applied" | "rolled_back";
  preRevision: string;
  totalQuestionCount: number;
  postRevision?: string;
  files: BankMigrationFile[];
};

export type BankLanguageMigrationPreview = Omit<BankLanguageMigrationManifest, "status" | "postRevision"> & {
  affectedQuestionCount: number;
};

export type BankLanguageMigrationResult = {
  changed: boolean;
  manifest: BankLanguageMigrationManifest;
  manifestPath: string;
};

export {
  assertValidMigrationId,
  assertSafeRelativePath,
  assertSafeBackupPath,
} from "./migration/bankMigrationSafety.js";

export {
  sha256,
  canonicalJson,
  semanticHash,
  serializedBatch,
} from "./migration/bankMigrationHasher.js";

export {
  applyBankLanguageMigration,
  rollbackBankLanguageMigration,
} from "./migration/bankMigrationApplier.js";

async function readIndexByteHash(canonicalRoot: string): Promise<string> {
  const indexPath = path.join(canonicalRoot, "index.json");
  await assertSafeFilesystemPath(canonicalRoot, indexPath);
  try {
    const indexBytes = await readFile(indexPath);
    return sha256(indexBytes);
  } catch {
    throw new RepositoryError(`Question bank index.json missing or unreadable at ${indexPath}`, "BANK_INDEX_MISSING");
  }
}

export async function previewBankLanguageMigration(
  repository: RepositoryRuntime,
  options: { migrationId: string },
): Promise<BankLanguageMigrationPreview> {
  assertValidMigrationId(options.migrationId);
  return withBankRead(repository, async () => {
    const canonicalRoot = await resolveCanonicalRoot(repository);
    const indexByteHash = await readIndexByteHash(canonicalRoot);

    const files: BankMigrationFile[] = [];
    let totalQuestionCount = 0;
    for (const filePath of await collectBatchFiles(canonicalRoot)) {
      const raw = await readFile(filePath);
      const batch = parseBatchForMigration(raw.toString("utf8"), filePath);
      if (!batch) continue;
      totalQuestionCount += batch.questions.length;
      files.push(buildMigrationFile(filePath, raw, batch, canonicalRoot, options.migrationId));
    }
    const preRevision = sha256(Buffer.from(files.map((file) => `${file.relativePath}:${file.byteHashBefore}`).join("\n"), "utf8"));
    return {
      schemaVersion: 1,
      migrationId: options.migrationId,
      canonicalRoot,
      indexByteHash,
      createdAt: new Date().toISOString(),
      preRevision,
      files,
      affectedQuestionCount: files.reduce((count, file) => count + file.missingLanguageQuestionIds.length, 0),
      totalQuestionCount,
    };
  });
}

async function backupIndexFile(
  repository: RepositoryRuntime,
  canonicalRoot: string,
  migrationId: string,
  expectedHash: string,
): Promise<void> {
  const indexPath = path.join(canonicalRoot, "index.json");
  await assertSafeFilesystemPath(canonicalRoot, indexPath);
  const indexBytes = await readFile(indexPath);
  if (sha256(indexBytes) !== expectedHash) {
    throw new RepositoryError("BANK_DRIFT: index.json changed before backup", "BANK_DRIFT");
  }
  const indexBackupPath = path.join(migrationRoot(canonicalRoot), migrationId, "backup", "index.json");
  const backupParent = path.join(migrationRoot(canonicalRoot), migrationId, "backup");
  await assertSafeFilesystemPath(backupParent, indexBackupPath);
  await mkdir(path.dirname(indexBackupPath), { recursive: true });
  await assertSafeFilesystemPath(backupParent, indexBackupPath);
  await repository.writeBinaryAtomic(indexBackupPath, indexBytes);
}

async function backupBatchFiles(
  repository: RepositoryRuntime,
  preview: BankLanguageMigrationPreview,
): Promise<void> {
  const backupRoot = path.join(migrationRoot(preview.canonicalRoot), preview.migrationId, "backup");
  for (const file of preview.files) {
    assertSafeRelativePath(file.relativePath, preview.canonicalRoot);
    assertSafeBackupPath(file.backupPath, preview.canonicalRoot, preview.migrationId);
    const sourcePath = path.join(preview.canonicalRoot, file.relativePath);
    await assertSafeFilesystemPath(preview.canonicalRoot, sourcePath);
    await assertSafeFilesystemPath(backupRoot, file.backupPath);
    const bytes = await readFile(sourcePath);
    if (sha256(bytes) !== file.byteHashBefore) {
      throw new RepositoryError(`BANK_DRIFT: preimage changed for ${file.relativePath}`, "BANK_DRIFT");
    }
    await mkdir(path.dirname(file.backupPath), { recursive: true });
    await assertSafeFilesystemPath(backupRoot, file.backupPath);
    await repository.writeBinaryAtomic(file.backupPath, bytes);
  }
}

export async function backupBankLanguageMigration(
  repository: RepositoryRuntime,
  preview: BankLanguageMigrationPreview,
): Promise<{ manifest: BankLanguageMigrationManifest; files: BankMigrationFile[]; manifestPath: string }> {
  assertValidMigrationId(preview.migrationId);
  return withBankWrite(repository, async () => {
    await verifyCanonicalRootMatch(repository, preview.canonicalRoot);
    const previewManifest: BankLanguageMigrationManifest = { ...preview, status: "backed_up" };
    await assertManifestPathSafe(previewManifest);

    await backupIndexFile(repository, preview.canonicalRoot, preview.migrationId, preview.indexByteHash);
    await backupBatchFiles(repository, preview);

    const savedPath = await persistManifest(repository, previewManifest);
    return { manifest: previewManifest, files: preview.files, manifestPath: savedPath };
  });
}
