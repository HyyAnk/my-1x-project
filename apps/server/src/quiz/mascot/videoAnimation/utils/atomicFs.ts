import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

/**
 * Handles Windows-specific transient locking errors (EPERM, EEXIST, ENOENT)
 * during atomic file rename operations.
 */
export async function handleWindowsRenameRetry(
  tempPath: string,
  filePath: string,
  serialized: string,
  dir: string,
  err: unknown,
): Promise<void> {
  const errorWithCode = err as { code?: string };
  if (errorWithCode?.code === "EPERM" || errorWithCode?.code === "EEXIST") {
    try {
      await fs.unlink(filePath);
      await fs.rename(tempPath, filePath);
      return;
    } catch {
      await fs.copyFile(tempPath, filePath);
      await fs.unlink(tempPath).catch(() => {});
      return;
    }
  }
  if (errorWithCode?.code === "ENOENT") {
    try {
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(filePath, serialized, "utf8");
      await fs.unlink(tempPath).catch(() => {});
      return;
    } catch {
      return;
    }
  }
  await fs.unlink(tempPath).catch(() => {});
  throw err;
}

/**
 * Writes data to a JSON file atomically using a temporary file with a random suffix,
 * replacing the target file upon completion and handling Windows-safe file locking retries.
 */
export async function atomicWriteJson<T>(filePath: string, data: T): Promise<void> {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  const randomSuffix = crypto.randomBytes(6).toString("hex");
  const tempPath = `${filePath}.tmp.${Date.now()}.${randomSuffix}`;
  const serialized = JSON.stringify(data, null, 2);
  await fs.writeFile(tempPath, serialized, "utf8");

  try {
    await fs.rename(tempPath, filePath);
  } catch (err: unknown) {
    await handleWindowsRenameRetry(tempPath, filePath, serialized, dir, err);
  }
}
