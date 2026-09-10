import fs from "node:fs";
import { mkdtemp, mkdir, rm, writeFile, readFile, copyFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { removeKnowledgePolicyFields } from "../../../scripts/migrations/knowledge-policy-removal/transform.js";
import { planMigration, applyMigration, rollbackMigration } from "../../../scripts/migrations/knowledge-policy-removal/files.js";
import { MigrationError } from "../../../scripts/migrations/knowledge-policy-removal/types.js";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 })));
});

function sha256(content: Buffer | string): string {
  return crypto.createHash("sha256").update(content).digest("hex");
}

describe("P4: Knowledge Policy Metadata Migration", () => {
  describe("Pure Transform", () => {
    it("removes only obsolete enforcement metadata and preserves all other fields", () => {
      const input = {
        id: "ENT-TEST-1",
        domain_id: "sports_games",
        subtopic_id: "arcade",
        name: "Pac-Man",
        aliases: ["Pac Man"],
        visual_anchor: "Pac-Man in a maze",
        copyright_risk: "high",
        is_trademark_ip: true,
        forbidden_visual_keywords: ["Pac-Man"],
        safe_visual_proxy: "A yellow circle",
        license_type: "official_press_asset",
        attribution: "Recorded source credit",
        source_url: "https://example.com/asset",
        future_field: { preserved: true },
      };
      const before = structuredClone(input);
      const result = removeKnowledgePolicyFields(input as any);
      expect(result.removedKeys).toHaveLength(4);
      expect(result.removedKeys).toEqual(
        expect.arrayContaining(["copyright_risk", "is_trademark_ip", "forbidden_visual_keywords", "safe_visual_proxy"]),
      );
      expect(result.value).toEqual({
        id: input.id,
        domain_id: input.domain_id,
        subtopic_id: input.subtopic_id,
        name: input.name,
        aliases: input.aliases,
        visual_anchor: input.visual_anchor,
        license_type: input.license_type,
        attribution: input.attribution,
        source_url: input.source_url,
        future_field: input.future_field,
      });
      expect(input).toEqual(before);
      expect(removeKnowledgePolicyFields(result.value).removedKeys).toEqual([]);
    });
  });

  describe("File Planning & Validation", () => {
    it("generates a migration plan for entity files with exact hash and field counts", async () => {
      const tempDir = await mkdtemp(path.join(os.tmpdir(), "migration-plan-test-"));
      roots.push(tempDir);
      const entitiesDir = path.join(tempDir, "entities");
      await mkdir(entitiesDir, { recursive: true });

      const fixtureSource = path.resolve(__dirname, "fixtures/knowledge-policy-removal/entities.json");
      const targetFixture = path.join(entitiesDir, "entities.json");
      await copyFile(fixtureSource, targetFixture);

      const plan = await planMigration(entitiesDir);
      expect(plan.schemaVersion).toBe(1);
      expect(plan.migrationId).toBe("knowledge-policy-removal-v1");
      expect(plan.files).toHaveLength(1);

      const filePlan = plan.files[0];
      expect(filePlan.relativePath).toBe("entities.json");
      expect(filePlan.entities).toBe(1);
      expect(filePlan.changedEntities).toBe(1);
      expect(filePlan.removedFields).toBe(4);
      expect(filePlan.beforeSha256).toBe(sha256(await readFile(targetFixture)));
      expect(filePlan.afterSha256).not.toBe(filePlan.beforeSha256);
    });

    it("rejects non-existent or invalid root directories", async () => {
      await expect(planMigration(path.join(os.tmpdir(), "non-existent-dir-" + Date.now()))).rejects.toMatchObject({
        code: "INVALID_ROOT",
      });
      await expect(planMigration(os.homedir())).rejects.toMatchObject({
        code: "INVALID_ROOT",
      });
    });

    it("rejects duplicate entity IDs across files", async () => {
      const tempDir = await mkdtemp(path.join(os.tmpdir(), "migration-dup-test-"));
      roots.push(tempDir);
      const entitiesDir = path.join(tempDir, "entities");
      await mkdir(entitiesDir, { recursive: true });

      const file1 = [{ id: "ENT-DUP", name: "One", domain_id: "d", subtopic_id: "s" }];
      const file2 = [{ id: "ENT-DUP", name: "Two", domain_id: "d", subtopic_id: "s" }];

      await writeFile(path.join(entitiesDir, "file1.json"), JSON.stringify(file1), "utf8");
      await writeFile(path.join(entitiesDir, "file2.json"), JSON.stringify(file2), "utf8");

      await expect(planMigration(entitiesDir)).rejects.toMatchObject({
        code: "INVALID_DATA",
      });
    });

    it("rejects malformed JSON", async () => {
      const tempDir = await mkdtemp(path.join(os.tmpdir(), "migration-malformed-test-"));
      roots.push(tempDir);
      const entitiesDir = path.join(tempDir, "entities");
      await mkdir(entitiesDir, { recursive: true });

      await writeFile(path.join(entitiesDir, "malformed.json"), "{ invalid json", "utf8");

      await expect(planMigration(entitiesDir)).rejects.toMatchObject({
        code: "INVALID_DATA",
      });
    });
  });

  describe("Apply & Rollback Contract", () => {
    it("rehearses full lifecycle: plan -> apply -> second plan (zero changes) -> rollback (exact byte match)", async () => {
      const rehearsalRoot = await mkdtemp(path.join(os.tmpdir(), "migration-rehearsal-"));
      roots.push(rehearsalRoot);

      const entitiesDir = path.join(rehearsalRoot, "entities");
      const backupsDir = path.join(rehearsalRoot, "backups");
      await mkdir(entitiesDir, { recursive: true });
      await mkdir(backupsDir, { recursive: true });

      const fixtureSource = path.resolve(__dirname, "fixtures/knowledge-policy-removal/entities.json");
      const targetFixture = path.join(entitiesDir, "entities.json");
      await copyFile(fixtureSource, targetFixture);

      const originalBytes = await readFile(targetFixture);
      const originalSha = sha256(originalBytes);

      // Step 1: Generate initial plan
      const plan1 = await planMigration(entitiesDir);
      expect(plan1.files[0].changedEntities).toBe(1);
      expect(plan1.files[0].removedFields).toBe(4);

      // Step 2: Apply plan
      const journal = await applyMigration(plan1, backupsDir);
      expect(journal.state).toBe("applied");
      expect(journal.entries[0].status).toBe("applied");

      // Verify source file was modified
      const appliedBytes = await readFile(targetFixture);
      const appliedSha = sha256(appliedBytes);
      expect(appliedSha).toBe(plan1.files[0].afterSha256);
      expect(appliedSha).not.toBe(originalSha);

      // Step 3: Second dry run must report 0 changed entities
      const plan2 = await planMigration(entitiesDir);
      expect(plan2.files[0].changedEntities).toBe(0);
      expect(plan2.files[0].removedFields).toBe(0);
      expect(plan2.files[0].beforeSha256).toBe(appliedSha);
      expect(plan2.files[0].afterSha256).toBe(appliedSha);

      // Step 4: Rollback
      const backupDirEntries = fs.readdirSync(backupsDir);
      const backupSubdir = backupDirEntries.find((d) => d.startsWith("backup-"));
      expect(backupSubdir).toBeDefined();
      const journalPath = path.join(backupsDir, backupSubdir!, "migration-journal.json");

      const rollbackJournal = await rollbackMigration(journalPath);
      expect(rollbackJournal.state).toBe("rolled_back");

      // Verify original file restored byte-for-byte
      const restoredBytes = await readFile(targetFixture);
      const restoredSha = sha256(restoredBytes);
      expect(restoredSha).toBe(originalSha);
      expect(Buffer.compare(restoredBytes, originalBytes)).toBe(0);
    });

    it("prevents apply when concurrent migration lock exists", async () => {
      const tempDir = await mkdtemp(path.join(os.tmpdir(), "migration-lock-test-"));
      roots.push(tempDir);
      const entitiesDir = path.join(tempDir, "entities");
      const backupsDir = path.join(tempDir, "backups");
      await mkdir(entitiesDir, { recursive: true });

      const targetFixture = path.join(entitiesDir, "entities.json");
      await copyFile(path.resolve(__dirname, "fixtures/knowledge-policy-removal/entities.json"), targetFixture);

      const plan = await planMigration(entitiesDir);

      // Create fake lock
      await writeFile(path.join(entitiesDir, ".migration.lock"), "LOCKED", "utf8");

      await expect(applyMigration(plan, backupsDir)).rejects.toMatchObject({
        code: "LOCKED",
      });
    });

    it("aborts apply if source file changed between plan and apply", async () => {
      const tempDir = await mkdtemp(path.join(os.tmpdir(), "migration-stale-test-"));
      roots.push(tempDir);
      const entitiesDir = path.join(tempDir, "entities");
      const backupsDir = path.join(tempDir, "backups");
      await mkdir(entitiesDir, { recursive: true });

      const targetFixture = path.join(entitiesDir, "entities.json");
      await copyFile(path.resolve(__dirname, "fixtures/knowledge-policy-removal/entities.json"), targetFixture);

      const plan = await planMigration(entitiesDir);

      // Modify the file after plan was generated
      await writeFile(targetFixture, JSON.stringify([{ id: "ENT-CHANGED", name: "X", domain_id: "d", subtopic_id: "s" }]), "utf8");

      await expect(applyMigration(plan, backupsDir)).rejects.toMatchObject({
        code: "SOURCE_CHANGED",
      });
    });

    it("detects conflict on rollback if file was modified after migration", async () => {
      const tempDir = await mkdtemp(path.join(os.tmpdir(), "migration-conflict-test-"));
      roots.push(tempDir);
      const entitiesDir = path.join(tempDir, "entities");
      const backupsDir = path.join(tempDir, "backups");
      await mkdir(entitiesDir, { recursive: true });

      const targetFixture = path.join(entitiesDir, "entities.json");
      await copyFile(path.resolve(__dirname, "fixtures/knowledge-policy-removal/entities.json"), targetFixture);

      const plan = await planMigration(entitiesDir);
      await applyMigration(plan, backupsDir);

      const backupDirEntries = fs.readdirSync(backupsDir);
      const backupSubdir = backupDirEntries.find((d) => d.startsWith("backup-"));
      const journalPath = path.join(backupsDir, backupSubdir!, "migration-journal.json");

      // Now user manually edits the migrated file
      await writeFile(targetFixture, JSON.stringify([{ id: "NEW-EDIT", name: "Edited", domain_id: "d", subtopic_id: "s" }]), "utf8");

      await expect(rollbackMigration(journalPath)).rejects.toMatchObject({
        code: "ROLLBACK_CONFLICT",
      });
    });
  });

  describe("Production Knowledge Base State & Loader Integration", () => {
    it("asserts that 100% of production entity files are completely free of the 4 enforcement fields", async () => {
      const { resolveKnowledgeBaseEntitiesDir } = await import("../src/quiz/bank/knowledgeBaseLoader.js");
      const entitiesDir = resolveKnowledgeBaseEntitiesDir();
      expect(fs.existsSync(entitiesDir)).toBe(true);

      const jsonFiles = fs
        .readdirSync(entitiesDir)
        .filter((file) => file.endsWith(".json"))
        .sort();

      expect(jsonFiles.length).toBe(14);

      const forbiddenKeys = ["copyright_risk", "is_trademark_ip", "forbidden_visual_keywords", "safe_visual_proxy"];
      let totalEntitiesChecked = 0;

      for (const filename of jsonFiles) {
        const filePath = path.join(entitiesDir, filename);
        const raw = fs.readFileSync(filePath, "utf8");
        const entities = JSON.parse(raw) as Array<Record<string, unknown>>;

        expect(Array.isArray(entities)).toBe(true);
        expect(entities.length).toBeGreaterThan(0);

        for (const entity of entities) {
          totalEntitiesChecked++;
          for (const key of forbiddenKeys) {
            expect(entity).not.toHaveProperty(key);
          }
          expect(typeof entity.id).toBe("string");
          expect(typeof entity.name).toBe("string");
          expect(typeof entity.domain_id).toBe("string");
          expect(typeof entity.subtopic_id).toBe("string");
          expect(typeof entity.visual_anchor).toBe("string");
        }
      }

      expect(totalEntitiesChecked).toBeGreaterThan(1500);
    });

    it("asserts that knowledgeBaseLoader loads entities cleanly with full type safety and no policy keys", async () => {
      const { loadAllKnowledgeEntities, clearKnowledgeBaseCache } = await import("../src/quiz/bank/knowledgeBaseLoader.js");
      clearKnowledgeBaseCache();

      const entities = loadAllKnowledgeEntities({ forceReload: true });
      expect(entities.length).toBeGreaterThan(1500);

      const forbiddenKeys = ["copyright_risk", "is_trademark_ip", "forbidden_visual_keywords", "safe_visual_proxy"];
      for (const entity of entities) {
        for (const key of forbiddenKeys) {
          expect(entity).not.toHaveProperty(key);
        }
        expect(entity.id).toBeTruthy();
        expect(entity.name).toBeTruthy();
        expect(entity.visual_anchor).toBeTruthy();
      }

      // Verify authentic character identities are preserved verbatim
      const popCultureEntities = entities.filter((e) => e.domain_id === "pop_culture_classics");
      expect(popCultureEntities.length).toBeGreaterThan(50);
      for (const entity of popCultureEntities) {
        expect(entity.name.length).toBeGreaterThan(0);
        expect(entity.visual_anchor.length).toBeGreaterThan(0);
      }
    });
  });
});
