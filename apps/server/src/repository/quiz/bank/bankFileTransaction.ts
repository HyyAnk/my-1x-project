import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { RepositoryError } from "../../errors.js";
import type { RepositoryRuntime } from "../../runtime.js";

export type CapturedFile = {
  target: string;
  bytes?: Buffer;
};

export async function captureFile(target: string): Promise<Buffer | undefined> {
  try {
    return await readFile(target);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

export async function captureFiles(targets: string[]): Promise<CapturedFile[]> {
  const uniqueTargets = [...new Set(targets)];
  return Promise.all(
    uniqueTargets.map(async (target) => ({
      target,
      bytes: await captureFile(target),
    })),
  );
}

export async function restoreFile(runtime: RepositoryRuntime, target: string, bytes: Buffer | undefined): Promise<void> {
  try {
    if (bytes === undefined) {
      await rm(target, { force: true });
    } else {
      await runtime.writeBinaryAtomic(target, bytes);
    }
  } catch {
    if (bytes !== undefined) {
      await writeFile(target, bytes);
    }
  }
}

export async function restoreFiles(runtime: RepositoryRuntime, files: CapturedFile[]): Promise<void> {
  const failures: Array<{ target: string; error: unknown }> = [];
  for (const file of files) {
    try {
      await restoreFile(runtime, file.target, file.bytes);
    } catch (error) {
      failures.push({ target: file.target, error });
    }
  }
  if (failures.length > 0) {
    throw new RepositoryError(
      `BANK_RECOVERY_REQUIRED: Failed to restore files during rollback: ${failures.map((f) => f.target).join(", ")}`,
      "BANK_RECOVERY_REQUIRED",
      { cause: failures },
    );
  }
}

export class BankFileTransaction {
  private preimages = new Map<string, Buffer | undefined>();
  private touched = new Set<string>();

  async capture(target: string): Promise<void> {
    const normalized = path.resolve(target);
    if (this.preimages.has(normalized)) return;
    const bytes = await captureFile(normalized);
    this.preimages.set(normalized, bytes);
  }

  async captureAll(targets: string[]): Promise<void> {
    await Promise.all(targets.map((t) => this.capture(t)));
  }

  markTouched(target: string): void {
    this.touched.add(path.resolve(target));
  }

  async rollback(runtime: RepositoryRuntime): Promise<void> {
    const filesToRestore: CapturedFile[] = [];
    for (const target of this.touched) {
      filesToRestore.push({
        target,
        bytes: this.preimages.get(target),
      });
    }
    await restoreFiles(runtime, filesToRestore);
  }
}
