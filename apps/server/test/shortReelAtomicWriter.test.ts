import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  BankQuestionSchema,
  ShortReelRecordSchema,
  createInitialShortReel,
  createSourceSnapshot,
  type ShortReelRecord,
  type ShortReelTopicSnapshot,
} from "@studio/shared";
import {
  acquireWriterAdmission,
  isWriterAdmissionHeld,
  releaseWriterAdmission,
  resolveCanonicalStorageRoot,
  setShortReelRenameHookForTesting,
  setShortReelSyncHookForTesting,
  setShortReelWriteHookForTesting,
  writeShortReelJsonAtomic,
} from "../src/repository/shortReelAtomicWriter.js";

describe("ShortReelAtomicWriter Behavioral Tests (Stage A)", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "reel-atomic-writer-test-"));
  });

  afterEach(async () => {
    setShortReelWriteHookForTesting(null);
    setShortReelRenameHookForTesting(null);
    setShortReelSyncHookForTesting(null);
    await releaseWriterAdmission(tempDir);
    await rm(tempDir, { recursive: true, force: true });
  });

  const sampleQuestion = BankQuestionSchema.parse({
    id: "bank-q-atomic-001",
    archetype_id: "versus_faceoff",
    domain_id: "tech",
    subtopic_id: "hardware",
    language: "English",
    question: "Which processor architecture uses RISC: ARM or x86?",
    format: "multiple_choice",
    choices: [
      { id: "A", text: "ARM", is_correct: true },
      { id: "B", text: "x86", is_correct: false },
    ],
    correct_choice_id: "A",
    explanation: "ARM is designed as a Reduced Instruction Set Computer.",
    age_band: "family",
    status: "approved",
  });

  const sampleTopic: ShortReelTopicSnapshot = {
    topic_id: "topic-atomic-001",
    channel_id: "ch_atomic",
    title: "ARM vs x86 Architecture",
    premise: "Comparing RISC and CISC processor designs",
    hook: "Which one uses RISC?",
    origin: "keyword",
  };

  function createTestRecord(revision = 1): ShortReelRecord {
    const record = createInitialShortReel({
      channel_id: "ch_atomic",
      topic: sampleTopic,
      source: createSourceSnapshot(sampleQuestion),
    });
    record.revision = revision;
    return record;
  }

  it("writes valid JSON record to disk atomically with flushed contents", async () => {
    const targetPath = path.join(tempDir, "reel.json");
    const record = createTestRecord(1);

    await writeShortReelJsonAtomic(targetPath, record);

    const writtenRaw = await readFile(targetPath, "utf8");
    const parsed = ShortReelRecordSchema.parse(JSON.parse(writtenRaw));
    expect(parsed.reel_id).toBe(record.reel_id);
    expect(parsed.revision).toBe(1);
  });

  it("retries transient rename errors and succeeds when transient lock clears", async () => {
    const targetPath = path.join(tempDir, "reel.json");
    const record = createTestRecord(1);
    let attempts = 0;

    setShortReelRenameHookForTesting(async (_src, _dest, attempt) => {
      await Promise.resolve();
      attempts++;
      if (attempt < 2) {
        const error = new Error("Resource temporarily locked") as NodeJS.ErrnoException;
        error.code = "EPERM";
        throw error;
      }
    });

    await writeShortReelJsonAtomic(targetPath, record);

    expect(attempts).toBe(3); // attempt 0 (fail), attempt 1 (fail), attempt 2 (pass)
    const writtenRaw = await readFile(targetPath, "utf8");
    const parsed = JSON.parse(writtenRaw) as { reel_id?: string };
    expect(parsed.reel_id).toBe(record.reel_id);
  });

  it("never copies over existing target when rename retries are exhausted (strict no-copy)", async () => {
    const targetPath = path.join(tempDir, "reel.json");
    const originalBytes = JSON.stringify({ original: "data_must_not_be_corrupted" }, null, 2);
    await writeFile(targetPath, originalBytes, "utf8");

    const record = createTestRecord(2);
    let renameAttempts = 0;

    setShortReelRenameHookForTesting(async () => {
      await Promise.resolve();
      renameAttempts++;
      const error = new Error("Persistent permission denied") as NodeJS.ErrnoException;
      error.code = "EPERM";
      throw error;
    });

    await expect(writeShortReelJsonAtomic(targetPath, record)).rejects.toThrow("Persistent permission denied");

    // All retries attempted (0 through 5 = 6 attempts)
    expect(renameAttempts).toBe(6);

    // Destination target must retain EXACT original bytes without any copy overwriting
    const destinationBytes = await readFile(targetPath, "utf8");
    expect(destinationBytes).toBe(originalBytes);
  });

  it("cleans up temporary file and leaves target untouched when write hook fails", async () => {
    const targetPath = path.join(tempDir, "reel.json");
    const originalBytes = "untouched-original-content";
    await writeFile(targetPath, originalBytes, "utf8");

    const record = createTestRecord(1);

    setShortReelWriteHookForTesting(async (tempFile) => {
      const existsBefore = await readFile(tempFile, "utf8")
        .then(() => true)
        .catch(() => false);
      expect(existsBefore).toBe(true);
      throw new Error("Simulated disk full during sync");
    });

    await expect(writeShortReelJsonAtomic(targetPath, record)).rejects.toThrow("Simulated disk full during sync");

    const destinationBytes = await readFile(targetPath, "utf8");
    expect(destinationBytes).toBe(originalBytes);

    const dirFiles = await readdir(tempDir);
    expect(dirFiles.filter((f) => f.endsWith(".tmp"))).toEqual([]);
  });

  it("cleans up temporary file and preserves target on actual sync failure (A-R07)", async () => {
    const targetPath = path.join(tempDir, "reel.json");
    const originalBytes = "original-bytes-before-sync-failure";
    await writeFile(targetPath, originalBytes, "utf8");

    const record = createTestRecord(2);

    setShortReelSyncHookForTesting(async () => {
      await Promise.resolve();
      const error = new Error("Simulated I/O sync failure") as NodeJS.ErrnoException;
      error.code = "EIO";
      throw error;
    });

    await expect(writeShortReelJsonAtomic(targetPath, record)).rejects.toThrow("Simulated I/O sync failure");

    // Destination target must retain EXACT original bytes
    const destinationBytes = await readFile(targetPath, "utf8");
    expect(destinationBytes).toBe(originalBytes);

    // No leftover .tmp files must remain
    const dirFiles = await readdir(tempDir);
    expect(dirFiles.filter((f) => f.endsWith(".tmp"))).toEqual([]);
  });

  it("manages writer admission lifecycle and detects held admission", async () => {
    const canonical = resolveCanonicalStorageRoot(tempDir);
    expect(isWriterAdmissionHeld(tempDir)).toBe(false);
    expect(isWriterAdmissionHeld(canonical)).toBe(false);

    acquireWriterAdmission(tempDir);
    expect(isWriterAdmissionHeld(tempDir)).toBe(true);
    expect(isWriterAdmissionHeld(canonical)).toBe(true);

    // Idempotent second acquisition in same process
    acquireWriterAdmission(tempDir);
    expect(isWriterAdmissionHeld(tempDir)).toBe(true);

    await releaseWriterAdmission(tempDir);
    expect(isWriterAdmissionHeld(tempDir)).toBe(false);
    expect(isWriterAdmissionHeld(canonical)).toBe(false);
  });

  it("binds admission to ownerId and prevents non-owner release (A-R04)", async () => {
    acquireWriterAdmission(tempDir, "owner-A");
    expect(isWriterAdmissionHeld(tempDir, "owner-A")).toBe(true);
    expect(isWriterAdmissionHeld(tempDir, "owner-B")).toBe(false);

    // Second owner registers
    acquireWriterAdmission(tempDir, "owner-B");
    expect(isWriterAdmissionHeld(tempDir, "owner-B")).toBe(true);

    // Non-owner C tries to release -> no-op, admission still held for A and B
    await releaseWriterAdmission(tempDir, "owner-C");
    expect(isWriterAdmissionHeld(tempDir, "owner-A")).toBe(true);
    expect(isWriterAdmissionHeld(tempDir, "owner-B")).toBe(true);

    // Owner A releases -> admission still held for B
    await releaseWriterAdmission(tempDir, "owner-A");
    expect(isWriterAdmissionHeld(tempDir, "owner-A")).toBe(false);
    expect(isWriterAdmissionHeld(tempDir, "owner-B")).toBe(true);

    // Owner B releases -> lock is now released
    await releaseWriterAdmission(tempDir, "owner-B");
    expect(isWriterAdmissionHeld(tempDir, "owner-B")).toBe(false);
    expect(isWriterAdmissionHeld(tempDir)).toBe(false);
  });
});
