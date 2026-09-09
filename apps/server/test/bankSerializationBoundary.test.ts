import { describe, expect, it } from "vitest";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  createBankSerializationBoundary,
  bankRevisionToken,
  digestBankSnapshot,
  type BankSnapshotRevision,
} from "../src/repository/quiz/bank/bankSerializationBoundary.js";

const CHILD_LOCK_SCRIPT = `
  import { createBankSerializationBoundary } from "./src/repository/quiz/bank/bankSerializationBoundary.ts";
  const mode = process.argv[1];
  const root = process.argv[2];
  const boundary = createBankSerializationBoundary(root);
  const release = new Promise((resolve) => process.stdin.once("data", resolve));
  try {
    await (mode === "reader" ? boundary.runRead(run) : boundary.runWrite(run));
  } catch (error) {
    process.stdout.write(mode + "-error:" + (error?.code || error?.message || "unknown") + "\\n");
    process.exitCode = 1;
  }
  async function run() {
    process.stdout.write(mode + "-started\\n");
    await release;
    process.stdout.write(mode + "-done\\n");
  }
`;

interface LockChild {
  child: ChildProcessWithoutNullStreams;
  lines: string[];
  waitForLine: (expected: RegExp, timeoutMs?: number) => Promise<string>;
  release: () => void;
  stop: () => Promise<void>;
}

function spawnLockChild(mode: "reader" | "writer", root: string): LockChild {
  const child = spawn(
    process.execPath,
    ["--import", "tsx/esm", "--input-type=module", "--eval", CHILD_LOCK_SCRIPT, mode, root],
    {
      cwd: path.resolve(import.meta.dirname, ".."),
      stdio: "pipe",
    },
  );

  const lines: string[] = [];
  let buffer = "";
  let stderrBuffer = "";
  const waiters: Array<{ expected: RegExp; resolve: (line: string) => void; reject: (err: Error) => void }> = [];

  function checkWaiters() {
    for (let i = waiters.length - 1; i >= 0; i--) {
      const waiter = waiters[i];
      const match = lines.find((l) => waiter.expected.test(l));
      if (match !== undefined) {
        waiters.splice(i, 1);
        waiter.resolve(match);
      }
    }
  }

  child.stdout.on("data", (chunk: Buffer) => {
    buffer += chunk.toString("utf8");
    const parts = buffer.split("\n");
    buffer = parts.pop() ?? "";
    for (const part of parts) {
      if (part.trim()) lines.push(part.trim());
    }
    checkWaiters();
  });

  child.stderr.on("data", (chunk: Buffer) => {
    stderrBuffer += chunk.toString("utf8");
  });

  child.once("error", (err) => {
    for (const waiter of waiters) {
      waiter.reject(err);
    }
  });

  child.once("exit", (code) => {
    if (buffer.trim()) lines.push(buffer.trim());
    checkWaiters();
    if (waiters.length > 0) {
      const err = new Error(
        `Child (${mode}) exited with code ${code} before matching line. Lines seen: ${JSON.stringify(lines)}. Stderr: ${stderrBuffer}`,
      );
      for (const waiter of waiters) {
        waiter.reject(err);
      }
    }
  });

  return {
    child,
    lines,
    waitForLine(expected: RegExp, timeoutMs = 15000): Promise<string> {
      const existing = lines.find((l) => expected.test(l));
      if (existing !== undefined) return Promise.resolve(existing);
      return new Promise<string>((resolve, reject) => {
        const timer = setTimeout(() => {
          const idx = waiters.findIndex((w) => w.resolve === resolve);
          if (idx !== -1) waiters.splice(idx, 1);
          reject(
            new Error(
              `Timeout waiting for ${expected} from ${mode} child after ${timeoutMs}ms. Lines seen: ${JSON.stringify(lines)}. Stderr: ${stderrBuffer}`,
            ),
          );
        }, timeoutMs);

        waiters.push({
          expected,
          resolve: (line) => {
            clearTimeout(timer);
            resolve(line);
          },
          reject: (err) => {
            clearTimeout(timer);
            reject(err);
          },
        });
      });
    },
    release() {
      child.stdin.write("release\n");
    },
    async stop() {
      if (child.exitCode === null) {
        child.kill();
        await new Promise<void>((resolve) => child.once("exit", () => resolve()));
      }
    },
  };
}

describe("Question Bank serialization boundary", () => {
  it("queues reads and writes in one FIFO order and increments the revision after writes", async () => {
    const boundary = createBankSerializationBoundary();
    const order: string[] = [];
    let releaseRead!: () => void;
    const readGate = new Promise<void>((resolve) => {
      releaseRead = resolve;
    });

    const firstRead = boundary.runRead(async () => {
      order.push("read-start");
      await readGate;
      order.push("read-end");
      return boundary.revision;
    });
    const write = boundary.runWrite(() => {
      order.push("write");
      return Promise.resolve(boundary.revision);
    });

    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(order).toEqual(["read-start"]);
    releaseRead();
    expect(await firstRead).toBe(0);
    expect(await write).toBe(0);
    expect(order).toEqual(["read-start", "read-end", "write"]);
    expect(boundary.revision).toBe(1);
  });

  it("returns a revision-tagged snapshot only after the cooperating read completes", async () => {
    const boundary = createBankSerializationBoundary();
    const observed: BankSnapshotRevision[] = [];
    let releaseMutation!: () => void;
    const mutationGate = new Promise<void>((resolve) => {
      releaseMutation = resolve;
    });

    const mutation = boundary.runWrite(() => mutationGate.then(() => "committed"));
    const snapshotRead = boundary.runRead(() => {
      observed.push({ revision: boundary.revision });
      return { revision: boundary.revision, value: "coherent" };
    });

    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(observed).toEqual([]);
    releaseMutation();
    await mutation;
    expect(await snapshotRead).toEqual({ revision: 1, value: "coherent" });
    expect(observed).toEqual([{ revision: 1 }]);
  });

  it("prevents a bound scan from observing a mixed cooperating mutation", async () => {
    const boundary = createBankSerializationBoundary();
    const state = { first: 0, second: 0 };
    let releaseScan!: () => void;
    const scanGate = new Promise<void>((resolve) => {
      releaseScan = resolve;
    });
    const scan = boundary.runRead(async () => {
      const first = state.first;
      await scanGate;
      return { first, second: state.second };
    });
    const mutation = boundary.runWrite(() => {
      state.first = 1;
      state.second = 1;
      return Promise.resolve();
    });

    await new Promise<void>((resolve) => setImmediate(resolve));
    releaseScan();
    expect(await scan).toEqual({ first: 0, second: 0 });
    await mutation;
    expect(state).toEqual({ first: 1, second: 1 });
  });

  it("detects recursive public acquisition and throws a typed error rather than hanging", async () => {
    const boundary = createBankSerializationBoundary();
    await expect(
      boundary.runWrite(async () => {
        return boundary.runWrite(() => Promise.resolve("nested"));
      }),
    ).rejects.toThrow(/BANK_RECURSIVE_LOCK/);

    await expect(
      boundary.runRead(async () => {
        return boundary.runRead(() => Promise.resolve("nested"));
      }),
    ).rejects.toThrow(/BANK_RECURSIVE_LOCK/);
  });

  it("includes index in canonical snapshot digest", () => {
    const batch = {
      archetype_id: "deep_trivia",
      domain_id: "science",
      subtopic_id: "space",
      subtopic_title: "Space",
      schema_version: 2,
      updated_at: "2026-01-01",
      questions: [],
    };
    const index1 = {
      schema_version: 2,
      target_total: 20000,
      current_total: 10,
      by_archetype: {},
      by_domain: {},
      updated_at: "2026-01-01",
    };
    const index2 = {
      ...index1,
      current_total: 15,
    };
    const digest1 = digestBankSnapshot([batch], index1);
    const digest2 = digestBankSnapshot([batch], index2);
    expect(digest1).not.toBe(digest2);
  });

  it("provides epoch and formats revision token as epoch:revision:digest", () => {
    const boundary = createBankSerializationBoundary();
    expect(typeof boundary.epoch).toBe("string");
    expect(boundary.epoch.length).toBeGreaterThan(0);
    const token = bankRevisionToken(boundary.epoch, 2, "abc123hash");
    expect(token).toBe(`${boundary.epoch}:2:abc123hash`);
  });

  it("enforces cross-process writer lock when bankRoot is provided", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "bank-lock-test-"));
    try {
      const b1 = createBankSerializationBoundary(tempDir);
      const b2 = createBankSerializationBoundary(tempDir);
      let releaseGate!: () => void;
      const lockGate = new Promise<void>((resolve) => {
        releaseGate = resolve;
      });

      const write1 = b1.runWrite(async () => {
        await lockGate;
      });

      // While b1 holds the lock, b2 from a separate boundary instance attempts to write
      await new Promise((resolve) => setTimeout(resolve, 50));
      await expect(b2.runWrite(async () => {})).rejects.toThrow(/BANK_WRITER_BUSY/);

      releaseGate();
      await write1;

      // After b1 releases, b2 can write
      await expect(b2.runWrite(() => Promise.resolve("ok"))).resolves.toBe("ok");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("blocks a cross-process writer until the cooperating reader releases its lock", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "bank-reader-lock-test-"));
    try {
      const writerBoundary = createBankSerializationBoundary(tempDir);
      const readerBoundary = createBankSerializationBoundary(tempDir);
      let releaseReader!: () => void;
      const readerGate = new Promise<void>((resolve) => {
        releaseReader = resolve;
      });
      let readerStarted = false;

      const reader = readerBoundary.runRead(async () => {
        readerStarted = true;
        await readerGate;
        return "coherent";
      });

      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(readerStarted).toBe(true);
      const writer = writerBoundary.runWrite(() => Promise.resolve("written"));
      await expect(writer).rejects.toThrow(/BANK_WRITER_BUSY/);
      releaseReader();
      await expect(reader).resolves.toBe("coherent");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("serializes reader-first access across separate Node processes", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "bank-child-reader-first-"));
    const reader = spawnLockChild("reader", tempDir);
    try {
      await reader.waitForLine(/^reader-started$/);
      const writer = spawnLockChild("writer", tempDir);
      try {
        await writer.waitForLine(/^writer-error:BANK_WRITER_BUSY$/);
        reader.release();
        await reader.waitForLine(/^reader-done$/);
      } finally {
        await writer.stop();
      }
    } finally {
      await reader.stop();
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("serializes writer-first access across separate Node processes", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "bank-child-writer-first-"));
    const writer = spawnLockChild("writer", tempDir);
    const reader = spawnLockChild("reader", tempDir);
    try {
      await writer.waitForLine(/^writer-started$/);
      const readerAttempt = reader.waitForLine(/^reader-(error|started)/);
      writer.release();
      await writer.waitForLine(/^writer-done$/);
      await expect(readerAttempt).resolves.toMatch(/^reader-started$/);
      reader.release();
      await reader.waitForLine(/^reader-done$/);
    } finally {
      await writer.stop();
      await reader.stop();
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});
