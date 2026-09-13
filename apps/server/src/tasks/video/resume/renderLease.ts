import { randomUUID } from "node:crypto";
import { mkdir, readdir, rmdir, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code !== "ESRCH";
  }
}

async function removeDeadOwner(leaseDirectory: string): Promise<void> {
  try {
    const entries = await readdir(leaseDirectory);
    for (const entry of entries) {
      const match = /^(\d+)-[a-f0-9-]{36}\.lease$/.exec(entry);
      if (!match || isProcessAlive(Number(match[1]))) return;
      // Remove only this immutable owner token, never a replacement lease.
      await unlink(path.join(leaseDirectory, entry));
    }
    if (entries.length > 0 || Date.now() - (await stat(leaseDirectory)).mtimeMs > 1_000) await rmdir(leaseDirectory);
  } catch (error) {
    if (!["ENOENT", "ENOTEMPTY", "EEXIST"].includes((error as NodeJS.ErrnoException).code ?? "")) throw error;
  }
}

/** Serialize old/new dashboard workers across restarts, not just within a queue. */
export async function acquireRenderLease(renderRoot: string, timeoutMs = 15_000): Promise<() => Promise<void>> {
  await mkdir(renderRoot, { recursive: true });
  const leaseDirectory = path.join(renderRoot, ".render-worker-lock");
  const owner = path.join(leaseDirectory, `${process.pid}-${randomUUID()}.lease`);
  const deadline = Date.now() + timeoutMs;
  do {
    try {
      await mkdir(leaseDirectory);
      await writeFile(owner, "", { flag: "wx" });
      return async () => {
        await unlink(owner);
        await rmdir(leaseDirectory);
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      await removeDeadOwner(leaseDirectory);
      if (Date.now() >= deadline) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  } while (Date.now() < deadline);
  throw new Error("Another render worker still owns this episode. Wait for it to stop, then Retry.");
}
