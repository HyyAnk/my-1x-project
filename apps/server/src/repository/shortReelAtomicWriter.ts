import { open, rename, unlink, mkdir } from "node:fs/promises";
import path from "node:path";
import { ShortReelRecordSchema, type ShortReelRecord } from "@studio/shared";
export {
  acquireWriterAdmission,
  releaseWriterAdmission,
  isWriterAdmissionHeld,
  ensureWriterAdmission,
  resolveCanonicalStorageRoot,
} from "./shortReelWriterAdmission.js";
export { runInCanonicalShortReelQueue } from "./shortReelMutationQueue.js";

let testWriteHook: ((source: string, destination: string) => Promise<void>) | null = null;
let testRenameHook: ((source: string, destination: string, attempt: number) => Promise<void>) | null = null;
let testSyncHook: ((source: string, destination: string) => Promise<void>) | null = null;

export function setShortReelWriteHookForTesting(hook: ((source: string, destination: string) => Promise<void>) | null): void {
  testWriteHook = hook;
}

export function setShortReelRenameHookForTesting(
  hook: ((source: string, destination: string, attempt: number) => Promise<void>) | null,
): void {
  testRenameHook = hook;
}

export function setShortReelSyncHookForTesting(hook: ((source: string, destination: string) => Promise<void>) | null): void {
  testSyncHook = hook;
}

export async function writeShortReelJsonAtomic(targetPath: string, record: ShortReelRecord): Promise<void> {
  const directory = path.dirname(targetPath);
  await mkdir(directory, { recursive: true });

  const tempPath = `${targetPath}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
  const content = `${JSON.stringify(ShortReelRecordSchema.parse(record), null, 2)}\n`;

  let tempFileCreated = false;
  try {
    const handle = await open(tempPath, "w");
    tempFileCreated = true;
    try {
      if (testSyncHook) {
        await testSyncHook(tempPath, targetPath);
      }
      await handle.writeFile(content, "utf8");
      await handle.sync();
    } finally {
      await handle.close();
    }

    if (testWriteHook) {
      await testWriteHook(tempPath, targetPath);
    }

    const maxRetries = 5;
    let delay = 25;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (testRenameHook) {
          await testRenameHook(tempPath, targetPath, attempt);
        }
        await rename(tempPath, targetPath);
        return;
      } catch (err: unknown) {
        const error = err as NodeJS.ErrnoException;
        const isTransient =
          error && (error.code === "EPERM" || error.code === "EBUSY" || error.code === "EACCES" || error.code === "EEXIST");

        if (isTransient && attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay = Math.min(delay * 2, 200);
          continue;
        }

        // Exhausted retries or non-transient error: NEVER copy over destination!
        throw error;
      }
    }
  } catch (err) {
    if (tempFileCreated) {
      try {
        await unlink(tempPath);
      } catch {
        // ignore temp unlink error
      }
    }
    throw err;
  }
}
