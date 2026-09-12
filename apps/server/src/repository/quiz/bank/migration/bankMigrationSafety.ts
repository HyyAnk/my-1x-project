import { lstat, readFile, readdir, realpath } from "node:fs/promises";
import path from "node:path";
import { RepositoryError } from "../../../errors.js";
import { isInside } from "../../../pathSafety.js";
import type { RepositoryRuntime } from "../../../runtime.js";
import { QUESTION_BANK_DIR } from "../bankPathResolver.js";

export function assertValidMigrationId(migrationId: string): void {
  if (typeof migrationId !== "string" || !/^[a-zA-Z0-9_-]{1,64}$/.test(migrationId)) {
    throw new RepositoryError(
      `Invalid migration ID "${migrationId}". Must be 1-64 alphanumeric, dash, or underscore characters.`,
      "INVALID_MIGRATION_ID",
    );
  }
}

export function migrationRoot(canonicalRoot: string): string {
  return path.join(path.resolve(canonicalRoot), "..", "question_bank_migrations");
}

export function assertSafeRelativePath(relativePath: string, canonicalRoot: string): string {
  if (typeof relativePath !== "string" || !relativePath.trim()) {
    throw new RepositoryError("Empty or invalid relative path in migration manifest", "UNSAFE_PATH");
  }
  const normalized = path.posix.normalize(relativePath.replace(/\\/g, "/"));
  if (
    normalized.startsWith("../") ||
    normalized === ".." ||
    path.isAbsolute(relativePath) ||
    /^[a-zA-Z]:/.test(relativePath) ||
    relativePath.includes("\0") ||
    relativePath
      .replace(/\\/g, "/")
      .split("/")
      .some((segment) => segment === ".." || segment === ".")
  ) {
    throw new RepositoryError(`Unsafe relative path "${relativePath}" in migration manifest`, "UNSAFE_PATH");
  }
  const target = path.resolve(canonicalRoot, normalized);
  if (!isInside(canonicalRoot, target)) {
    throw new RepositoryError(`Target path escaped canonical root: "${relativePath}"`, "UNSAFE_PATH");
  }
  return normalized;
}

export function assertSafeBackupPath(backupPath: string, canonicalRoot: string, migrationId: string): void {
  assertValidMigrationId(migrationId);
  if (typeof backupPath !== "string" || backupPath.includes("\0")) {
    throw new RepositoryError("Invalid backup path in migration manifest", "UNSAFE_PATH");
  }
  const root = path.join(migrationRoot(canonicalRoot), migrationId, "backup");
  if (!isInside(root, path.resolve(backupPath))) {
    throw new RepositoryError(`Backup path escaped migration backup root: "${backupPath}"`, "UNSAFE_PATH");
  }
}

export function backupPathFor(root: string, migrationId: string, relativePath: string): string {
  const normalizedRelative = relativePath.replace(/\\/g, "/");
  return path.join(migrationRoot(root), migrationId, "backup", ...normalizedRelative.split("/"));
}

export async function assertSafeFilesystemPath(rootPath: string, targetPath: string): Promise<void> {
  const root = path.resolve(rootPath);
  const target = path.resolve(targetPath);
  if (!isInside(root, target)) {
    throw new RepositoryError(`Filesystem path escaped its root: "${targetPath}"`, "UNSAFE_PATH");
  }

  let current = target;
  while (true) {
    try {
      if ((await lstat(current)).isSymbolicLink()) {
        throw new RepositoryError(`Filesystem path contains a symlink or junction: "${current}"`, "UNSAFE_PATH");
      }
    } catch (error) {
      if (error instanceof RepositoryError) throw error;
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "ENOENT" && code !== "ENOTDIR") throw error;
    }
    if (current === root) return;
    const parent = path.dirname(current);
    if (parent === current) {
      throw new RepositoryError(`Filesystem path could not be contained: "${targetPath}"`, "UNSAFE_PATH");
    }
    current = parent;
  }
}

export async function assertCanonicalRoot(repository: RepositoryRuntime, canonicalRoot: string): Promise<string> {
  await assertSafeFilesystemPath(path.join(repository.storageRoot, ".quiz-studio"), canonicalRoot);
  try {
    return await realpath(canonicalRoot);
  } catch (error) {
    throw new RepositoryError(`Question bank root is missing or unreadable at ${canonicalRoot}`, "BANK_ROOT_MISSING", { cause: error });
  }
}

export async function resolveCanonicalRoot(repository: RepositoryRuntime): Promise<string> {
  const configuredPath = path.join(repository.rootDirectory, ".quiz-studio", "storage.local.json");
  let raw: string;
  try {
    raw = await readFile(configuredPath, "utf8");
  } catch (error) {
    throw new RepositoryError(`Config file missing or unreadable at ${configuredPath}`, "BANK_CONFIG_MISSING", { cause: error });
  }
  let config: { storage_path?: unknown };
  try {
    config = JSON.parse(raw) as { storage_path?: unknown };
  } catch (error) {
    throw new RepositoryError(`Config file is corrupt at ${configuredPath}`, "BANK_CONFIG_CORRUPT", { cause: error });
  }
  if (typeof config.storage_path !== "string") {
    throw new RepositoryError("BANK_CONFIG_CORRUPT: configured storage_path is not a string", "BANK_CONFIG_CORRUPT");
  }
  const resolvedStoragePath = path.resolve(repository.rootDirectory, config.storage_path);
  if (path.resolve(resolvedStoragePath) !== path.resolve(repository.storageRoot)) {
    throw new RepositoryError(
      "BANK_ROOT_MISMATCH: configured storage root does not match the repository runtime root",
      "BANK_ROOT_MISMATCH",
    );
  }
  return assertCanonicalRoot(repository, path.join(repository.roots.runtime, QUESTION_BANK_DIR));
}

export async function verifyCanonicalRootMatch(repository: RepositoryRuntime, expectedRoot: string): Promise<void> {
  const currentRoot = await resolveCanonicalRoot(repository);
  if (path.resolve(currentRoot) !== path.resolve(expectedRoot)) {
    throw new RepositoryError("BANK_ROOT_MISMATCH: migration root changed", "BANK_ROOT_MISMATCH");
  }
}

export async function collectBatchFiles(root: string): Promise<string[]> {
  const result: string[] = [];
  const archetypes = await readdir(root, { withFileTypes: true });
  if (archetypes.some((entry) => entry.isSymbolicLink())) {
    throw new RepositoryError("Question bank contains a symlink or junction", "UNSAFE_PATH");
  }
  for (const archetype of archetypes.filter((entry) => entry.isDirectory())) {
    const domains = await readdir(path.join(root, archetype.name), { withFileTypes: true });
    if (domains.some((entry) => entry.isSymbolicLink())) {
      throw new RepositoryError("Question bank contains a symlink or junction", "UNSAFE_PATH");
    }
    for (const domain of domains.filter((entry) => entry.isDirectory())) {
      const files = await readdir(path.join(root, archetype.name, domain.name), { withFileTypes: true });
      if (files.some((entry) => entry.isSymbolicLink())) {
        throw new RepositoryError("Question bank contains a symlink or junction", "UNSAFE_PATH");
      }
      result.push(
        ...files
          .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
          .map((entry) => path.join(root, archetype.name, domain.name, entry.name)),
      );
    }
  }
  return result.sort((a, b) => a.localeCompare(b));
}

