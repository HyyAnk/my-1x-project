import { afterEach, describe, expect, it } from "vitest";
import { mkdir, mkdtemp, readFile, rename, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { RepositoryService } from "../src/repository/service.js";
import {
  applyBankLanguageMigration,
  backupBankLanguageMigration,
  previewBankLanguageMigration,
  rollbackBankLanguageMigration,
} from "../src/repository/quiz/bank/bankMetadataMigration.js";

describe("Question Bank language migration", () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
  });

  async function createFixture() {
    const root = await mkdtemp(path.join(os.tmpdir(), "bank-migration-test-"));
    tempDirs.push(root);
    const bankRoot = path.join(root, ".quiz-studio", "question_bank");
    await mkdir(path.join(bankRoot, "deep_trivia", "science"), { recursive: true });
    await writeFile(path.join(root, ".quiz-studio", "storage.local.json"), JSON.stringify({ storage_path: root }, null, 2), "utf8");
    const batch = {
      schema_version: 2,
      archetype_id: "deep_trivia",
      domain_id: "science",
      subtopic_id: "astronomy",
      subtopic_title: "Astronomy",
      updated_at: "2026-01-01T00:00:00.000Z",
      questions: [
        {
          id: "missing-language",
          archetype_id: "deep_trivia",
          domain_id: "science",
          subtopic_id: "astronomy",
          format: "multiple_choice",
          question: "Which planet has rings?",
          choices: [
            { id: "A", text: "Saturn", is_correct: true },
            { id: "B", text: "Mars", is_correct: false },
            { id: "C", text: "Earth", is_correct: false },
          ],
          correct_choice_id: "A",
          explanation: "Saturn has a prominent ring system.",
          difficulty: 2,
          language: "",
          tags: ["space"],
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
        },
        {
          id: "already-language",
          archetype_id: "deep_trivia",
          domain_id: "science",
          subtopic_id: "astronomy",
          format: "multiple_choice",
          question: "Which planet is known as the red planet?",
          choices: [
            { id: "A", text: "Mars", is_correct: true },
            { id: "B", text: "Venus", is_correct: false },
            { id: "C", text: "Jupiter", is_correct: false },
          ],
          correct_choice_id: "A",
          explanation: "Iron minerals make Mars appear red.",
          difficulty: 1,
          language: "en",
          tags: ["space"],
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
        },
      ],
    };
    const batchPath = path.join(bankRoot, "deep_trivia", "science", "astronomy.json");
    await writeFile(batchPath, `${JSON.stringify(batch, null, 2)}\n`, "utf8");
    const index = {
      schema_version: 2,
      target_total: 20000,
      current_total: 2,
      by_archetype: { deep_trivia: 2 },
      by_domain: { science: 2 },
      updated_at: "fixed",
    };
    const indexBytes = `${JSON.stringify(index, null, 2)}\n`;
    await writeFile(path.join(bankRoot, "index.json"), indexBytes, "utf8");
    return { root, bankRoot, batchPath, indexBytes };
  }

  it("previews exact missing-language membership and applies only language=en with a byte backup", async () => {
    const fixture = await createFixture();
    const repository = new RepositoryService(fixture.root, fixture.root);
    const preview = await previewBankLanguageMigration(repository, { migrationId: "test-migration" });

    expect(preview.canonicalRoot).toBe(fixture.bankRoot);
    expect(preview.affectedQuestionCount).toBe(1);
    expect(preview.files).toHaveLength(1);
    expect(preview.files[0].questionIds).toEqual(["missing-language", "already-language"]);

    const backup = await backupBankLanguageMigration(repository, preview);
    expect(await readFile(backup.files[0].backupPath, "utf8")).toContain('"language": ""');
    const applied = await applyBankLanguageMigration(repository, backup.manifest);
    expect(applied.changed).toBe(true);
    const migrated = JSON.parse(await readFile(fixture.batchPath, "utf8")) as { questions: Array<{ id: string; language?: string }> };
    expect(migrated.questions.find((q) => q.id === "missing-language")?.language).toBe("en");
    expect(migrated.questions.find((q) => q.id === "already-language")?.language).toBe("en");
    expect(await readFile(path.join(fixture.bankRoot, "index.json"), "utf8")).toBe(fixture.indexBytes);
  });

  it("rejects drift, supports idempotent replay, and rolls back only from the expected postimage", async () => {
    const fixture = await createFixture();
    const repository = new RepositoryService(fixture.root, fixture.root);
    const preview = await previewBankLanguageMigration(repository, { migrationId: "drift-test" });
    const backup = await backupBankLanguageMigration(repository, preview);
    await applyBankLanguageMigration(repository, backup.manifest);
    const replay = await applyBankLanguageMigration(repository, backup.manifest);
    expect(replay.changed).toBe(false);

    const rolledBack = await rollbackBankLanguageMigration(repository, backup.manifest);
    expect(rolledBack.changed).toBe(true);
    const restored = await readFile(fixture.batchPath, "utf8");
    expect(restored).toBe(await readFile(backup.files[0].backupPath, "utf8"));

    await writeFile(fixture.batchPath, `${restored} `, "utf8");
    await expect(applyBankLanguageMigration(repository, backup.manifest)).rejects.toThrow(/drift/i);
  });

  it("rejects path traversal and unsafe migration IDs", async () => {
    const fixture = await createFixture();
    const repository = new RepositoryService(fixture.root, fixture.root);
    await expect(previewBankLanguageMigration(repository, { migrationId: "../escape-dir" })).rejects.toThrow(/invalid migration id/i);

    await expect(previewBankLanguageMigration(repository, { migrationId: "test/with/slashes" })).rejects.toThrow(/invalid migration id/i);
  });

  it("rejects non-string language metadata as corrupt", async () => {
    const fixture = await createFixture();
    const repository = new RepositoryService(fixture.root, fixture.root);
    // Overwrite batch with invalid number language
    const corruptBatch = JSON.parse(await readFile(fixture.batchPath, "utf8")) as {
      questions: Array<Record<string, unknown>>;
    };
    corruptBatch.questions[0].language = 12345;
    await writeFile(fixture.batchPath, JSON.stringify(corruptBatch, null, 2), "utf8");

    await expect(previewBankLanguageMigration(repository, { migrationId: "corrupt-lang-test" })).rejects.toThrow(/corrupt/i);
  });

  it("detects index drift and rejects apply if index.json changes", async () => {
    const fixture = await createFixture();
    const repository = new RepositoryService(fixture.root, fixture.root);
    const preview = await previewBankLanguageMigration(repository, { migrationId: "index-drift-test" });
    const backup = await backupBankLanguageMigration(repository, preview);

    // Modify index.json
    const indexPath = path.join(fixture.bankRoot, "index.json");
    await writeFile(indexPath, `${JSON.stringify({ schema_version: 2, current_total: 999 })}\n`, "utf8");

    await expect(applyBankLanguageMigration(repository, backup.manifest)).rejects.toThrow(/index/i);
  });

  it("recovers safely from an interrupted/partial write without failing on already-migrated batches", async () => {
    const fixture = await createFixture();
    const repository = new RepositoryService(fixture.root, fixture.root);

    // Add a second batch so we can simulate partial write
    const secondBatchDir = path.join(fixture.bankRoot, "deep_trivia", "history");
    await mkdir(secondBatchDir, { recursive: true });
    const secondBatch = {
      schema_version: 2,
      archetype_id: "deep_trivia",
      domain_id: "history",
      subtopic_id: "ancient",
      subtopic_title: "Ancient",
      updated_at: "2026-01-01T00:00:00.000Z",
      questions: [
        {
          id: "hist-q1",
          archetype_id: "deep_trivia",
          domain_id: "history",
          subtopic_id: "ancient",
          format: "multiple_choice",
          question: "Ancient Rome founded when?",
          choices: [
            { id: "A", text: "753 BC", is_correct: true },
            { id: "B", text: "500 BC", is_correct: false },
            { id: "C", text: "100 BC", is_correct: false },
          ],
          correct_choice_id: "A",
          explanation: "753 BC",
          difficulty: 1,
          language: "",
          tags: ["history"],
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
        },
      ],
    };
    const secondBatchPath = path.join(secondBatchDir, "ancient.json");
    await writeFile(secondBatchPath, `${JSON.stringify(secondBatch, null, 2)}\n`, "utf8");

    const preview = await previewBankLanguageMigration(repository, { migrationId: "partial-write-test" });
    expect(preview.files).toHaveLength(2);
    const backup = await backupBankLanguageMigration(repository, preview);

    // Simulate partial write: manually apply the first file to expectedByteHashAfter
    const file0 = backup.manifest.files[0];
    const raw0 = await readFile(path.join(backup.manifest.canonicalRoot, file0.relativePath), "utf8");
    const parsed0 = JSON.parse(raw0) as { questions: Array<Record<string, unknown>> };
    parsed0.questions[0].language = "en";
    await writeFile(path.join(backup.manifest.canonicalRoot, file0.relativePath), `${JSON.stringify(parsed0, null, 2)}\n`, "utf8");

    // Retrying apply must succeed and migrate the remaining file without throwing drift
    const resumed = await applyBankLanguageMigration(repository, backup.manifest);
    expect(resumed.changed).toBe(true);
    expect(resumed.manifest.status).toBe("applied");

    const migratedSecond = JSON.parse(await readFile(secondBatchPath, "utf8")) as { questions: Array<Record<string, unknown>> };
    expect(migratedSecond.questions[0].language).toBe("en");
  });

  it("replaying a backed_up manifest after success does not regress durable applied status", async () => {
    const fixture = await createFixture();
    const repository = new RepositoryService(fixture.root, fixture.root);
    const preview = await previewBankLanguageMigration(repository, { migrationId: "status-regression-test" });
    const backup = await backupBankLanguageMigration(repository, preview);

    // First apply succeeds
    const firstApply = await applyBankLanguageMigration(repository, backup.manifest);
    expect(firstApply.manifest.status).toBe("applied");

    // Pass the original backed_up manifest object again
    expect(backup.manifest.status).toBe("backed_up");
    const replay = await applyBankLanguageMigration(repository, backup.manifest);
    expect(replay.manifest.status).toBe("applied");

    // Verify persisted manifest on disk has status "applied", not "backed_up"
    const savedManifestPath = path.join(
      fixture.root,
      ".quiz-studio",
      "question_bank_migrations",
      "status-regression-test",
      "manifest.json",
    );
    const persisted = JSON.parse(await readFile(savedManifestPath, "utf8")) as { status: string };
    expect(persisted.status).toBe("applied");
  });

  it("rejects a Bank directory junction that redirects migration reads outside the configured root", async () => {
    const fixture = await createFixture();
    const redirectedBank = path.join(fixture.root, "redirected-bank");
    await rename(fixture.bankRoot, redirectedBank);
    await symlink(redirectedBank, fixture.bankRoot, "junction");
    const repository = new RepositoryService(fixture.root, fixture.root);

    await expect(previewBankLanguageMigration(repository, { migrationId: "junction-bank-test" })).rejects.toThrow(
      /symlink|junction|unsafe|root/i,
    );
  });

  it("rejects an index symlink during preview", async () => {
    const fixture = await createFixture();
    const redirectedIndex = path.join(fixture.root, "redirected-index.json");
    await rename(path.join(fixture.bankRoot, "index.json"), redirectedIndex);
    await symlink(redirectedIndex, path.join(fixture.bankRoot, "index.json"), "file");
    const repository = new RepositoryService(fixture.root, fixture.root);

    await expect(previewBankLanguageMigration(repository, { migrationId: "symlink-index-test" })).rejects.toThrow(
      /symlink|junction|unsafe|root/i,
    );
  });

  it("rejects a backup junction before migration writes can escape the migration root", async () => {
    const fixture = await createFixture();
    const repository = new RepositoryService(fixture.root, fixture.root);
    const preview = await previewBankLanguageMigration(repository, { migrationId: "junction-backup-test" });
    const backupRoot = path.join(path.dirname(fixture.bankRoot), "question_bank_migrations", preview.migrationId, "backup");
    const redirectedBackup = path.join(fixture.root, "redirected-backup");
    await mkdir(redirectedBackup, { recursive: true });
    await mkdir(path.dirname(backupRoot), { recursive: true });
    await symlink(redirectedBackup, backupRoot, "junction");

    await expect(backupBankLanguageMigration(repository, preview)).rejects.toThrow(/symlink|junction|unsafe|root/i);
  });

  it("rejects a source file symlink during apply even when its bytes match the manifest", async () => {
    const fixture = await createFixture();
    const repository = new RepositoryService(fixture.root, fixture.root);
    const preview = await previewBankLanguageMigration(repository, { migrationId: "symlink-source-test" });
    const backup = await backupBankLanguageMigration(repository, preview);
    const redirectedSource = path.join(fixture.root, "redirected-source.json");
    await rename(fixture.batchPath, redirectedSource);
    await symlink(redirectedSource, fixture.batchPath, "file");

    await expect(applyBankLanguageMigration(repository, backup.manifest)).rejects.toThrow(/symlink|junction|unsafe|root/i);
  });

  it("rejects a manifest symlink before apply can mutate the Bank", async () => {
    const fixture = await createFixture();
    const repository = new RepositoryService(fixture.root, fixture.root);
    const preview = await previewBankLanguageMigration(repository, { migrationId: "symlink-manifest-test" });
    const backup = await backupBankLanguageMigration(repository, preview);
    const redirectedManifest = path.join(fixture.root, "redirected-manifest.json");
    const manifestBytes = await readFile(backup.manifestPath);
    await writeFile(redirectedManifest, manifestBytes);
    await rm(backup.manifestPath);
    await symlink(redirectedManifest, backup.manifestPath, "file");

    await expect(applyBankLanguageMigration(repository, backup.manifest)).rejects.toThrow(/symlink|junction|unsafe|root/i);
    const abortedBatch = JSON.parse(await readFile(fixture.batchPath, "utf8")) as {
      questions: Array<{ language?: string }>;
    };
    expect(abortedBatch.questions[0]?.language).toBe("");
  });

  it("rejects a backup file symlink during rollback", async () => {
    const fixture = await createFixture();
    const repository = new RepositoryService(fixture.root, fixture.root);
    const preview = await previewBankLanguageMigration(repository, { migrationId: "symlink-rollback-test" });
    const backup = await backupBankLanguageMigration(repository, preview);
    await applyBankLanguageMigration(repository, backup.manifest);

    const redirectedBackup = path.join(fixture.root, "redirected-rollback-backup.json");
    await writeFile(redirectedBackup, await readFile(backup.files[0].backupPath));
    await rm(backup.files[0].backupPath);
    await symlink(redirectedBackup, backup.files[0].backupPath, "file");

    await expect(rollbackBankLanguageMigration(repository, backup.manifest)).rejects.toThrow(/symlink|junction|unsafe|root/i);
  });

  it("resolves relative storage_path against repository.rootDirectory and succeeds", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "bank-relative-root-"));
    tempDirs.push(root);
    // Relative storage directory inside root
    const relStorage = "custom-storage";
    const storageDir = path.join(root, relStorage);
    const bankDir = path.join(storageDir, ".quiz-studio", "question_bank");
    await mkdir(path.join(bankDir, "deep_trivia", "science"), { recursive: true });
    await mkdir(path.join(root, ".quiz-studio"), { recursive: true });
    await writeFile(path.join(root, ".quiz-studio", "storage.local.json"), JSON.stringify({ storage_path: `./${relStorage}` }), "utf8");

    const indexBytes = `${JSON.stringify({ schema_version: 2, current_total: 0, by_archetype: {}, by_domain: {} }, null, 2)}\n`;
    await writeFile(path.join(bankDir, "index.json"), indexBytes, "utf8");

    const repo = new RepositoryService(root, storageDir);
    const preview = await previewBankLanguageMigration(repo, { migrationId: "rel-path-test" });
    expect(preview.canonicalRoot).toBe(bankDir);
  });

  it("throws typed RepositoryError when storage.local.json is malformed JSON", async () => {
    const fixture = await createFixture();
    await writeFile(path.join(fixture.root, ".quiz-studio", "storage.local.json"), "{ malformed json", "utf8");
    const repository = new RepositoryService(fixture.root, fixture.root);
    await expect(previewBankLanguageMigration(repository, { migrationId: "malformed-config" })).rejects.toMatchObject({
      code: "BANK_CONFIG_CORRUPT",
    });
  });

  it("restores manifest preimage when apply manifest write fails after batch write", async () => {
    const fixture = await createFixture();
    const repository = new RepositoryService(fixture.root, fixture.root);
    const preview = await previewBankLanguageMigration(repository, { migrationId: "apply-manifest-fail" });
    const backup = await backupBankLanguageMigration(repository, preview);

    const manifestBefore = await readFile(backup.manifestPath, "utf8");
    const batchBefore = await readFile(fixture.batchPath, "utf8");

    // Intercept manifest write during apply
    const originalWriteText = repository.writeTextAtomic.bind(repository);
    repository.writeTextAtomic = async (target, content) => {
      if (target === backup.manifestPath) {
        // Write then throw
        await originalWriteText(target, content);
        throw new Error("simulated manifest write failure during apply");
      }
      return originalWriteText(target, content);
    };

    await expect(applyBankLanguageMigration(repository, backup.manifest)).rejects.toThrow(/simulated manifest write failure/);
    // Batch must be restored to preimage
    expect(await readFile(fixture.batchPath, "utf8")).toBe(batchBefore);
    expect(await readFile(backup.manifestPath, "utf8")).toBe(manifestBefore);
    // Manifest on disk must be restored to preimage (backed_up), not left as applied!
    const manifestAfter = JSON.parse(await readFile(backup.manifestPath, "utf8")) as { status: string };
    expect(manifestAfter.status).toBe("backed_up");
  });

  it("rolls back first batch when second batch fails during rollback", async () => {
    const fixture = await createFixture();
    const repository = new RepositoryService(fixture.root, fixture.root);

    // Add second batch
    const secondBatchDir = path.join(fixture.bankRoot, "deep_trivia", "history");
    await mkdir(secondBatchDir, { recursive: true });
    const secondBatch = {
      schema_version: 2,
      archetype_id: "deep_trivia",
      domain_id: "history",
      subtopic_id: "ancient",
      subtopic_title: "Ancient",
      updated_at: "2026-01-01T00:00:00.000Z",
      questions: [
        {
          id: "hist-q1",
          archetype_id: "deep_trivia",
          domain_id: "history",
          subtopic_id: "ancient",
          format: "multiple_choice",
          question: "Ancient Rome founded when?",
          choices: [
            { id: "A", text: "753 BC", is_correct: true },
            { id: "B", text: "500 BC", is_correct: false },
            { id: "C", text: "100 BC", is_correct: false },
          ],
          correct_choice_id: "A",
          explanation: "753 BC",
          difficulty: 1,
          language: "",
          tags: ["history"],
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
        },
      ],
    };
    const secondBatchPath = path.join(secondBatchDir, "ancient.json");
    await writeFile(secondBatchPath, `${JSON.stringify(secondBatch, null, 2)}\n`, "utf8");

    const preview = await previewBankLanguageMigration(repository, { migrationId: "rollback-fail-test" });
    const backup = await backupBankLanguageMigration(repository, preview);
    await applyBankLanguageMigration(repository, backup.manifest);

    // Now both batches are applied (language: en)
    const appliedBatch0 = await readFile(fixture.batchPath, "utf8");
    const appliedBatch1 = await readFile(secondBatchPath, "utf8");

    // Fail during rollback on second batch write
    const secondFilePath = path.join(backup.manifest.canonicalRoot, backup.manifest.files[1].relativePath);
    const originalWriteBinary = repository.writeBinaryAtomic.bind(repository);
    repository.writeBinaryAtomic = async (target, content) => {
      if (path.resolve(target) === path.resolve(secondFilePath)) {
        throw new Error("simulated second batch rollback failure");
      }
      return originalWriteBinary(target, content);
    };

    await expect(rollbackBankLanguageMigration(repository, backup.manifest)).rejects.toThrow(/simulated second batch rollback failure/);
    // First batch must be compensated back to its postimage before rollback! Not left rolled back!
    const firstFilePath = path.join(backup.manifest.canonicalRoot, backup.manifest.files[0].relativePath);
    expect(await readFile(firstFilePath, "utf8")).toBe(
      backup.manifest.files[0].relativePath === "deep_trivia/science/astronomy.json" ? appliedBatch0 : appliedBatch1,
    );
  });
});
