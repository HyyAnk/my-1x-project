import { describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  createBankSerializationBoundary,
  bankRevisionToken,
  digestBankSnapshot,
  type BankSnapshotRevision,
} from "../src/repository/quiz/bank/bankSerializationBoundary.js";

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
});
