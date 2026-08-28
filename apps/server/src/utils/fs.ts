import { copyFile, mkdir, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

export interface AtomicWriteOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffFactor?: number;
  renameFn?: (source: string, destination: string) => Promise<void>;
  copyFn?: (source: string, destination: string) => Promise<void>;
  unlinkFn?: (target: string) => Promise<void>;
}

/**
 * Safely renames a temporary file to its target path.
 * On Windows, handles transient file locks (EPERM, EBUSY, EACCES, EEXIST) caused by
 * antivirus scanners, indexers, or momentarily open file handles by retrying
 * with exponential backoff and falling back to copy+unlink if necessary.
 */
export async function atomicRenameWithRetry(
  temporaryPath: string,
  targetPath: string,
  options: AtomicWriteOptions = {},
): Promise<void> {
  const maxRetries = options.maxRetries ?? 10;
  const initialDelayMs = options.initialDelayMs ?? 50;
  const maxDelayMs = options.maxDelayMs ?? 1000;
  const backoffFactor = options.backoffFactor ?? 1.5;
  const doRename = options.renameFn ?? rename;
  const doCopy = options.copyFn ?? copyFile;
  const doUnlink = options.unlinkFn ?? unlink;

  let delay = initialDelayMs;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      await doRename(temporaryPath, targetPath);
      return;
    } catch (err: unknown) {
      const error = err as NodeJS.ErrnoException;
      const isTransientWindowsLock =
        error &&
        (error.code === "EPERM" ||
          error.code === "EBUSY" ||
          error.code === "EACCES" ||
          error.code === "EEXIST");

      if (isTransientWindowsLock && attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay = Math.min(delay * backoffFactor, maxDelayMs);
        continue;
      }

      // If exhausted all retries on a transient error, attempt copyFile + unlink fallback
      if (isTransientWindowsLock) {
        try {
          await doCopy(temporaryPath, targetPath);
          await doUnlink(temporaryPath).catch(() => {});
          return;
        } catch {
          // Fallback failed, throw original rename error
        }
      }

      // Clean up the temporary file before rethrowing to prevent .tmp file buildup
      await doUnlink(temporaryPath).catch(() => {});
      throw error;
    }
  }
}

/**
 * Writes a text file atomically with retry for Windows locking resilience.
 */
export async function writeTextAtomic(
  targetPath: string,
  content: string,
  options?: AtomicWriteOptions,
): Promise<void> {
  await mkdir(path.dirname(targetPath), { recursive: true });
  const temporary = `${targetPath}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}.tmp`;
  await writeFile(temporary, content, "utf8");
  await atomicRenameWithRetry(temporary, targetPath, options);
}

/**
 * Writes a binary file atomically with retry for Windows locking resilience.
 */
export async function writeBinaryAtomic(
  targetPath: string,
  content: Uint8Array,
  options?: AtomicWriteOptions,
): Promise<void> {
  await mkdir(path.dirname(targetPath), { recursive: true });
  const temporary = `${targetPath}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}.tmp`;
  await writeFile(temporary, content);
  await atomicRenameWithRetry(temporary, targetPath, options);
}

/**
 * Writes a JSON file atomically with indentation and retry resilience.
 */
export async function writeJsonAtomic(
  targetPath: string,
  value: unknown,
  options?: AtomicWriteOptions,
): Promise<void> {
  await writeTextAtomic(targetPath, `${JSON.stringify(value, null, 2)}\n`, options);
}
