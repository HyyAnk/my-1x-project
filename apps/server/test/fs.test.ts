import { mkdtemp, readFile, rm, writeFile, copyFile, unlink, rename } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { atomicRenameWithRetry, writeBinaryAtomic, writeJsonAtomic, writeTextAtomic } from "../src/utils/fs.js";

describe("Atomic File System Utils", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), "fs-test-"));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  });

  it("writes text files atomically", async () => {
    const filePath = path.join(tmpDir, "sub", "test.txt");
    await writeTextAtomic(filePath, "hello world\n");
    const content = await readFile(filePath, "utf8");
    expect(content).toBe("hello world\n");
  });

  it("writes json files atomically", async () => {
    const filePath = path.join(tmpDir, "sub", "test.json");
    await writeJsonAtomic(filePath, { key: "value", count: 42 });
    const content = JSON.parse(await readFile(filePath, "utf8"));
    expect(content).toEqual({ key: "value", count: 42 });
  });

  it("writes binary files atomically", async () => {
    const filePath = path.join(tmpDir, "sub", "test.bin");
    const data = new Uint8Array([1, 2, 3, 4, 5]);
    await writeBinaryAtomic(filePath, data);
    const content = new Uint8Array(await readFile(filePath));
    expect(Array.from(content)).toEqual([1, 2, 3, 4, 5]);
  });

  it("retries on EPERM/EBUSY and succeeds when transient lock clears", async () => {
    const tempFile = path.join(tmpDir, "temp.tmp");
    const targetFile = path.join(tmpDir, "target.txt");
    await writeFile(tempFile, "retry success", "utf8");

    let attempts = 0;
    const fakeRename = vi.fn(async (src: string, dest: string) => {
      attempts++;
      if (attempts < 3) {
        const err = new Error("operation not permitted") as NodeJS.ErrnoException;
        err.code = "EPERM";
        throw err;
      }
      return rename(src, dest);
    });

    await atomicRenameWithRetry(tempFile, targetFile, {
      maxRetries: 5,
      initialDelayMs: 10,
      maxDelayMs: 50,
      backoffFactor: 1.2,
      renameFn: fakeRename,
    });

    expect(attempts).toBe(3);
    const content = await readFile(targetFile, "utf8");
    expect(content).toBe("retry success");
  });

  it("falls back to copyFile + unlink if rename fails after exhausting all retries", async () => {
    const tempFile = path.join(tmpDir, "temp2.tmp");
    const targetFile = path.join(tmpDir, "target2.txt");
    await writeFile(tempFile, "fallback success", "utf8");

    const fakeRename = vi.fn(async () => {
      const err = new Error("resource busy or locked") as NodeJS.ErrnoException;
      err.code = "EBUSY";
      throw err;
    });

    await atomicRenameWithRetry(tempFile, targetFile, {
      maxRetries: 3,
      initialDelayMs: 10,
      maxDelayMs: 20,
      backoffFactor: 1.0,
      renameFn: fakeRename,
      copyFn: copyFile,
      unlinkFn: unlink,
    });

    const content = await readFile(targetFile, "utf8");
    expect(content).toBe("fallback success");
  });
});
