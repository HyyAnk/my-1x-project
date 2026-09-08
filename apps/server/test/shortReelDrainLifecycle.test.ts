import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  acquireWriterAdmission,
  isWriterAdmissionHeld,
  releaseWriterAdmission,
  resolveCanonicalStorageRoot,
  runInCanonicalShortReelQueue,
  setShortReelWriteHookForTesting,
} from "../src/repository/shortReelAtomicWriter.js";
import { deferred, repairFixture } from "./helpers/shortReelRepairFixture.js";
import { RepositoryService } from "../src/repository/service.js";

async function childAdmission(root: string) {
  const moduleUrl = new URL("../src/repository/shortReelWriterAdmission.ts", import.meta.url).href;
  const script = `import { acquireWriterAdmission, releaseWriterAdmission } from ${JSON.stringify(moduleUrl)};
    try { acquireWriterAdmission(process.argv[1], "child"); await releaseWriterAdmission(process.argv[1], "child"); process.stdout.write("ACQUIRED"); }
    catch (error) { process.stdout.write(error.code ?? "ERROR"); }`;
  const result = await promisify(execFile)(process.execPath, ["--import", "tsx", "--input-type=module", "-e", script, root], {
    timeout: 10000,
    windowsHide: true,
  });
  return result.stdout;
}

afterEach(() => vi.useRealTimers());

describe("writer admission drain", () => {
  it("waits for the closing owner's writes while another owner remains usable", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "reel-owner-drain-"));
    acquireWriterAdmission(root, "first");
    acquireWriterAdmission(root, "second");
    const gate = deferred(),
      entered = deferred();
    const work = runInCanonicalShortReelQueue(
      root,
      "first-reel",
      async () => {
        entered.resolve();
        await gate.promise;
      },
      "first",
    );
    await entered.promise;
    let closed = false;
    const closing = releaseWriterAdmission(root, "first").then(() => {
      closed = true;
    });
    try {
      expect(closed).toBe(false);
      expect(() => acquireWriterAdmission(root, "first")).toThrow();
      await runInCanonicalShortReelQueue(root, "second-reel", () => Promise.resolve(), "second");
      gate.resolve();
      await Promise.all([work, closing]);
      expect(isWriterAdmissionHeld(root, "first")).toBe(false);
      expect(isWriterAdmissionHeld(root, "second")).toBe(true);
      expect(await childAdmission(root)).toBe("STORAGE_BUSY");
    } finally {
      gate.resolve();
      await Promise.all([work, closing]);
      await releaseWriterAdmission(root);
      await rm(root, { recursive: true, force: true });
    }
  });

  it("drains rejected operations without poisoning queued work", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "reel-rejected-drain-"));
    acquireWriterAdmission(root);
    const first = runInCanonicalShortReelQueue(root, "reel", () => Promise.reject(new Error("Expected failure")));
    const second = runInCanonicalShortReelQueue(root, "reel", () => Promise.resolve("retained"));
    const result = Promise.allSettled([first, second]);
    const closing = releaseWriterAdmission(root);
    try {
      expect(await result).toMatchObject([{ status: "rejected" }, { status: "fulfilled", value: "retained" }]);
      await closing;
      expect(isWriterAdmissionHeld(root)).toBe(false);
    } finally {
      await result;
      await closing;
      await rm(root, { recursive: true, force: true });
    }
  });

  it("excludes another process throughout draining and permits it after completion", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "reel-drain-process-"));
    const gate = deferred(),
      entered = deferred();
    acquireWriterAdmission(root);
    const work = runInCanonicalShortReelQueue(root, "reel", async () => {
      entered.resolve();
      await gate.promise;
    });
    await entered.promise;
    const closing = releaseWriterAdmission(root);
    try {
      expect(await childAdmission(root)).toBe("STORAGE_BUSY");
      gate.resolve();
      await Promise.all([work, closing]);
      expect(await childAdmission(root)).toBe("ACQUIRED");
    } finally {
      gate.resolve();
      await Promise.all([work, closing]);
      await rm(root, { recursive: true, force: true });
    }
  });

  it("does not let a non-owner close an admitted owner's root", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "reel-drain-owner-"));
    acquireWriterAdmission(root, "owner");
    try {
      await releaseWriterAdmission(root, "not-owner");
      expect(await childAdmission(root)).toBe("STORAGE_BUSY");
    } finally {
      await releaseWriterAdmission(root, "owner");
      await rm(root, { recursive: true, force: true });
    }
  });

  it("root switching drains this handle's queued writes and rejects new writes while switching", async () => {
    const f = await repairFixture();
    const gate = deferred(),
      entered = deferred();
    setShortReelWriteHookForTesting(async () => {
      entered.resolve();
      await gate.promise;
    });
    const first = f.repo.updateShortReel(
      f.key,
      { expected_revision: 1, request_id: "first" },
      { kind: "update_model_note", model_note: "First" },
    );
    const second = f.repo.updateShortReel(
      f.key,
      { expected_revision: 2, request_id: "second" },
      { kind: "update_model_note", model_note: "Second" },
    );
    await entered.promise;
    const nextRoot = path.join(f.root, "next");
    const switching = f.repo.setStorageRoot(nextRoot);
    try {
      expect(f.repo.storageRoot).toBe(f.root);
      await expect(
        f.repo.updateShortReel(f.key, { expected_revision: 3, request_id: "late" }, { kind: "update_model_note", model_note: "Late" }),
      ).rejects.toMatchObject({ code: "STORAGE_BUSY" });
      gate.resolve();
      await Promise.all([first, second, switching]);
      expect(f.repo.storageRoot).toBe(nextRoot);
      const oldReader = new RepositoryService(f.root);
      expect((await oldReader.getShortReel(f.key)).model_note).toBe("Second");
      await oldReader.close();
      await f.repo.close();
      expect(() => f.repo.acquireWriterAdmission()).toThrow();
    } finally {
      gate.resolve();
      await Promise.allSettled([first, second, switching]);
      setShortReelWriteHookForTesting(null);
      await f.cleanup();
    }
  });

  it("retains exclusion beyond five seconds and drains queued writes before release", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "reel-drain-"));
    const canonical = resolveCanonicalStorageRoot(root);
    acquireWriterAdmission(root);
    const first = deferred(),
      second = deferred(),
      enteredFirst = deferred(),
      enteredSecond = deferred();
    const one = runInCanonicalShortReelQueue(canonical, "reel", async () => {
      enteredFirst.resolve();
      await first.promise;
    });
    const two = runInCanonicalShortReelQueue(canonical, "reel", async () => {
      enteredSecond.resolve();
      await second.promise;
    });
    await enteredFirst.promise;
    vi.useFakeTimers();
    let closed = false;
    const closing = releaseWriterAdmission(root).then(() => {
      closed = true;
    });
    try {
      await vi.advanceTimersByTimeAsync(6000);
      expect(closed).toBe(false);
      expect(isWriterAdmissionHeld(root)).toBe(true);
      expect(() => acquireWriterAdmission(root, "new-owner")).toThrow();
      await expect(runInCanonicalShortReelQueue(canonical, "new", () => Promise.resolve("unsafe"))).rejects.toMatchObject({
        code: "STORAGE_BUSY",
      });
      first.resolve();
      await one;
      await enteredSecond.promise;
      expect(closed).toBe(false);
      expect(isWriterAdmissionHeld(root)).toBe(true);
      second.resolve();
      await two;
      await closing;
      expect(isWriterAdmissionHeld(root)).toBe(false);
    } finally {
      first.resolve();
      second.resolve();
      await Promise.all([one, two, closing]);
      vi.useRealTimers();
      await releaseWriterAdmission(root);
      await rm(root, { recursive: true, force: true });
    }
  });

  it("counts a queued operation before its callback starts", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "reel-queued-drain-"));
    const canonical = resolveCanonicalStorageRoot(root);
    acquireWriterAdmission(root);
    let heldAtWrite = false;
    const work = runInCanonicalShortReelQueue(canonical, "reel", () => {
      heldAtWrite = isWriterAdmissionHeld(root);
      return Promise.resolve();
    });
    const closing = releaseWriterAdmission(root);
    try {
      await Promise.all([work, closing]);
      expect(heldAtWrite).toBe(true);
      await expect(runInCanonicalShortReelQueue(canonical, "reel", () => Promise.resolve("unadmitted"))).rejects.toMatchObject({
        code: "STORAGE_BUSY",
      });
    } finally {
      await releaseWriterAdmission(root);
      await rm(root, { recursive: true, force: true });
    }
  });
});
