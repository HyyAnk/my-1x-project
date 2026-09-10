import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { removeKnowledgePolicyFields } from "./transform.js";
import {
  MigrationError,
  type FilePlan,
  type MigrationJournal,
  type MigrationPlan,
  type JsonObject,
} from "./types.js";

function computeSha256(content: Buffer | string): string {
  return crypto.createHash("sha256").update(content).digest("hex");
}

function validateRootDirectory(rootPath: string): string {
  const resolved = path.resolve(rootPath);
  if (!fs.existsSync(resolved)) {
    throw new MigrationError(`Root directory does not exist: ${resolved}`, "INVALID_ROOT");
  }

  const stat = fs.lstatSync(resolved);
  if (!stat.isDirectory()) {
    throw new MigrationError(`Root path is not a directory: ${resolved}`, "INVALID_ROOT");
  }

  if (stat.isSymbolicLink()) {
    throw new MigrationError(`Root directory cannot be a symbolic link: ${resolved}`, "INVALID_ROOT");
  }

  const parse = path.parse(resolved);
  if (parse.root === resolved) {
    throw new MigrationError(`Root cannot be a filesystem drive root: ${resolved}`, "INVALID_ROOT");
  }

  const home = path.resolve(os.homedir());
  if (resolved === home) {
    throw new MigrationError(`Root cannot be user home directory: ${resolved}`, "INVALID_ROOT");
  }

  return resolved;
}

export async function planMigration(root: string): Promise<MigrationPlan> {
  const canonicalRoot = validateRootDirectory(root);

  const entries = fs.readdirSync(canonicalRoot, { withFileTypes: true });
  const jsonFiles = entries
    .filter((e) => e.isFile() && e.name.endsWith(".json"))
    .map((e) => e.name)
    .sort();

  if (jsonFiles.length === 0) {
    throw new MigrationError(`No entity JSON files found in directory: ${canonicalRoot}`, "INVALID_ROOT");
  }

  const filePlans: FilePlan[] = [];
  const seenEntityIds = new Set<string>();

  for (const filename of jsonFiles) {
    const filePath = path.join(canonicalRoot, filename);
    const stat = fs.lstatSync(filePath);
    if (stat.isSymbolicLink()) {
      throw new MigrationError(`Symbolic links are not permitted: ${filePath}`, "INVALID_ROOT");
    }

    const rawBuffer = fs.readFileSync(filePath);
    const beforeSha256 = computeSha256(rawBuffer);

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawBuffer.toString("utf8"));
    } catch (err) {
      throw new MigrationError(`Invalid JSON in file ${filename}: ${(err as Error).message}`, "INVALID_DATA");
    }

    if (!Array.isArray(parsed)) {
      throw new MigrationError(`File content must be an array of entity records: ${filename}`, "INVALID_DATA");
    }

    let changedEntities = 0;
    let removedFields = 0;
    const transformedEntities: JsonObject[] = [];

    for (let index = 0; index < parsed.length; index++) {
      const item = parsed[index];
      if (typeof item !== "object" || item === null || Array.isArray(item)) {
        throw new MigrationError(`Item at index ${index} in ${filename} is not a valid object`, "INVALID_DATA");
      }

      const entity = item as JsonObject;
      const entityId = entity.id;
      if (typeof entityId !== "string" || entityId.trim() === "") {
        throw new MigrationError(`Entity at index ${index} in ${filename} has missing or empty id`, "INVALID_DATA");
      }

      if (seenEntityIds.has(entityId)) {
        throw new MigrationError(`Duplicate entity ID detected: ${entityId} in ${filename}`, "INVALID_DATA");
      }
      seenEntityIds.add(entityId);

      const res = removeKnowledgePolicyFields(entity);
      transformedEntities.push(res.value);
      if (res.removedKeys.length > 0) {
        changedEntities++;
        removedFields += res.removedKeys.length;
      }
    }

    let afterSha256 = beforeSha256;
    if (changedEntities > 0) {
      const transformedJson = JSON.stringify(transformedEntities, null, 2) + "\n";
      afterSha256 = computeSha256(Buffer.from(transformedJson, "utf8"));
    }

    filePlans.push({
      relativePath: filename,
      beforeSha256,
      afterSha256,
      entities: parsed.length,
      changedEntities,
      removedFields,
    });
  }

  return {
    schemaVersion: 1,
    migrationId: "knowledge-policy-removal-v1",
    root: canonicalRoot,
    files: filePlans,
  };
}

export async function applyMigration(plan: MigrationPlan, backupRoot: string): Promise<MigrationJournal> {
  const canonicalRoot = validateRootDirectory(plan.root);
  const canonicalBackupRoot = path.resolve(backupRoot);
  fs.mkdirSync(canonicalBackupRoot, { recursive: true });

  const lockFile = path.join(canonicalRoot, ".migration.lock");
  try {
    fs.writeFileSync(
      lockFile,
      JSON.stringify({ pid: process.pid, time: new Date().toISOString(), migrationId: plan.migrationId }),
      { flag: "wx" },
    );
  } catch {
    throw new MigrationError(`Root directory is locked by another migration process: ${lockFile}`, "LOCKED");
  }

  const releaseLock = () => {
    try {
      if (fs.existsSync(lockFile)) fs.unlinkSync(lockFile);
    } catch {
      // Ignore lock removal error
    }
  };

  try {
    // 1. Verify every source file matches the plan beforeSha256
    for (const f of plan.files) {
      const filePath = path.join(canonicalRoot, f.relativePath);
      if (!fs.existsSync(filePath)) {
        throw new MigrationError(`Planned source file missing: ${f.relativePath}`, "SOURCE_CHANGED");
      }
      const currentSha = computeSha256(fs.readFileSync(filePath));
      if (currentSha !== f.beforeSha256) {
        throw new MigrationError(
          `Source file content changed since plan was created: ${f.relativePath} (expected ${f.beforeSha256}, found ${currentSha})`,
          "SOURCE_CHANGED",
        );
      }
    }

    // 2. Create backup directory and save original files
    const backupDir = path.join(canonicalBackupRoot, `backup-${Date.now()}`);
    fs.mkdirSync(backupDir, { recursive: true });

    for (const f of plan.files) {
      const srcPath = path.join(canonicalRoot, f.relativePath);
      const destPath = path.join(backupDir, f.relativePath);
      fs.copyFileSync(srcPath, destPath);
      const backupSha = computeSha256(fs.readFileSync(destPath));
      if (backupSha !== f.beforeSha256) {
        throw new MigrationError(`Backup integrity check failed for ${f.relativePath}`, "BACKUP_FAILED");
      }
    }

    const journalPath = path.join(backupDir, "migration-journal.json");
    const journal: MigrationJournal = {
      schemaVersion: 1,
      root: canonicalRoot,
      state: "prepared",
      entries: plan.files.map((f) => ({
        ...f,
        backupRelativePath: f.relativePath,
        status: "backed_up",
      })),
    };

    fs.writeFileSync(journalPath, JSON.stringify(journal, null, 2) + "\n", "utf8");

    // 3. Atomically write transformed files
    journal.state = "applying";
    fs.writeFileSync(journalPath, JSON.stringify(journal, null, 2) + "\n", "utf8");

    for (const entry of journal.entries) {
      if (entry.changedEntities === 0) {
        continue;
      }

      const targetPath = path.join(canonicalRoot, entry.relativePath);
      const rawContent = fs.readFileSync(targetPath, "utf8");
      const currentSha = computeSha256(Buffer.from(rawContent, "utf8"));
      if (currentSha !== entry.beforeSha256) {
        throw new MigrationError(`Source file changed immediately before write: ${entry.relativePath}`, "SOURCE_CHANGED");
      }

      const parsed = JSON.parse(rawContent) as JsonObject[];
      const transformed = parsed.map((e) => removeKnowledgePolicyFields(e).value);
      const newJson = JSON.stringify(transformed, null, 2) + "\n";

      const tmpPath = path.join(canonicalRoot, `${entry.relativePath}.tmp.${Date.now()}.${Math.random().toString(36).slice(2)}`);
      try {
        const fd = fs.openSync(tmpPath, "w");
        fs.writeFileSync(fd, newJson, "utf8");
        fs.fsyncSync(fd);
        fs.closeSync(fd);
        fs.renameSync(tmpPath, targetPath);
      } catch (writeErr) {
        try {
          if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
        } catch {
          // ignore
        }
        journal.state = "partial";
        fs.writeFileSync(journalPath, JSON.stringify(journal, null, 2) + "\n", "utf8");
        throw new MigrationError(`Failed atomic write for ${entry.relativePath}: ${(writeErr as Error).message}`, "WRITE_FAILED");
      }

      const writtenSha = computeSha256(fs.readFileSync(targetPath));
      if (writtenSha !== entry.afterSha256) {
        journal.state = "partial";
        fs.writeFileSync(journalPath, JSON.stringify(journal, null, 2) + "\n", "utf8");
        throw new MigrationError(`Post-write hash mismatch on ${entry.relativePath}`, "WRITE_FAILED");
      }

      entry.status = "applied";
      fs.writeFileSync(journalPath, JSON.stringify(journal, null, 2) + "\n", "utf8");
    }

    journal.state = "applied";
    fs.writeFileSync(journalPath, JSON.stringify(journal, null, 2) + "\n", "utf8");
    releaseLock();
    return journal;
  } catch (err) {
    releaseLock();
    throw err;
  }
}

export async function rollbackMigration(journalPath: string): Promise<MigrationJournal> {
  const resolvedJournalPath = path.resolve(journalPath);
  if (!fs.existsSync(resolvedJournalPath)) {
    throw new MigrationError(`Journal file not found: ${resolvedJournalPath}`, "INVALID_DATA");
  }

  let journal: MigrationJournal;
  try {
    journal = JSON.parse(fs.readFileSync(resolvedJournalPath, "utf8")) as MigrationJournal;
  } catch (err) {
    throw new MigrationError(`Malformed journal JSON: ${(err as Error).message}`, "INVALID_DATA");
  }

  if (journal.schemaVersion !== 1 || !Array.isArray(journal.entries)) {
    throw new MigrationError(`Invalid journal schema in ${resolvedJournalPath}`, "INVALID_DATA");
  }

  const backupDir = path.dirname(resolvedJournalPath);
  const canonicalRoot = validateRootDirectory(journal.root);

  for (const entry of journal.entries) {
    const targetPath = path.join(canonicalRoot, entry.relativePath);
    const backupPath = path.join(backupDir, entry.backupRelativePath);

    if (!fs.existsSync(backupPath)) {
      throw new MigrationError(`Backup file missing for rollback: ${backupPath}`, "BACKUP_FAILED");
    }

    const backupBytes = fs.readFileSync(backupPath);
    const backupSha = computeSha256(backupBytes);
    if (backupSha !== entry.beforeSha256) {
      throw new MigrationError(`Backup file corrupted or changed: ${backupPath}`, "BACKUP_FAILED");
    }

    if (!fs.existsSync(targetPath)) {
      throw new MigrationError(`Target file missing during rollback: ${targetPath}`, "ROLLBACK_CONFLICT");
    }

    const currentSha = computeSha256(fs.readFileSync(targetPath));

    if (currentSha === entry.beforeSha256) {
      entry.status = "restored";
      continue;
    }

    if (currentSha !== entry.afterSha256) {
      throw new MigrationError(
        `Rollback conflict on ${entry.relativePath}: current hash ${currentSha} matches neither original nor migrated state`,
        "ROLLBACK_CONFLICT",
      );
    }

    const tmpPath = path.join(canonicalRoot, `${entry.relativePath}.rbk.${Date.now()}`);
    try {
      const fd = fs.openSync(tmpPath, "w");
      fs.writeFileSync(fd, backupBytes);
      fs.fsyncSync(fd);
      fs.closeSync(fd);
      fs.renameSync(tmpPath, targetPath);
      entry.status = "restored";
    } catch (err) {
      try {
        if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
      } catch {
        // ignore
      }
      throw new MigrationError(`Failed to restore file ${entry.relativePath}: ${(err as Error).message}`, "WRITE_FAILED");
    }
  }

  journal.state = "rolled_back";
  fs.writeFileSync(resolvedJournalPath, JSON.stringify(journal, null, 2) + "\n", "utf8");
  return journal;
}
