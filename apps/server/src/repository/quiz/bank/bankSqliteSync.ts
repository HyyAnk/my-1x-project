import { existsSync, statSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { BankSubtopicBatchSchema, type BankSubtopicBatch } from "@studio/shared";
import { RepositoryError } from "../../errors.js";
import type { RepositoryRuntime } from "../../runtime.js";
import { QUESTION_BANK_DIR } from "./bankPathResolver.js";
import { assertSafeBankFilesystemPath, assertSafeBankPathSegments } from "./bankPathSafety.js";
import { getBankSqliteDb } from "./bankSqliteEngine.js";
import { bankQuestionToRow, type BankQuestionRow } from "./bankSqliteMapper.js";
import { matchesArchetypeFilter } from "./bankBatchStorage.js";

interface DiscoveredBatchFile {
  filePath: string;
  expectedArchetype: string;
  expectedDomain: string;
  expectedSubtopic: string;
  mtimeMs: number;
  fileSize: number;
}

export async function syncQuestionBankFromJson(runtime: RepositoryRuntime): Promise<void> {
  const runtimeBankRoot = path.join(runtime.roots.runtime, QUESTION_BANK_DIR);
  if (!existsSync(runtimeBankRoot)) return;

  const db = getBankSqliteDb(runtimeBankRoot);
  const candidateRoots = getCandidateBankRoots(runtime);
  const discoveredFiles = await discoverBatchFiles(candidateRoots);

  const syncStmt = db.prepare("SELECT mtime_ms, file_size FROM bank_json_sync WHERE file_path = ?");
  const filesToProcess: DiscoveredBatchFile[] = [];

  for (const file of discoveredFiles) {
    const record = syncStmt.get(file.filePath) as { mtime_ms: number; file_size: number } | undefined;
    if (!record || record.mtime_ms !== file.mtimeMs || record.file_size !== file.fileSize) {
      filesToProcess.push(file);
    }
  }

  if (filesToProcess.length === 0) return;

  const rowsToUpsert: BankQuestionRow[] = [];
  for (const file of filesToProcess) {
    const batch = await parseAndValidateBatchFile(file);
    for (const question of batch.questions) {
      rowsToUpsert.push(bankQuestionToRow(question));
    }
  }

  persistSyncedBatch(db, rowsToUpsert, filesToProcess);
}

function getCandidateBankRoots(runtime: RepositoryRuntime): string[] {
  const runtimeBankRoot = path.join(runtime.roots.runtime, QUESTION_BANK_DIR);
  const defaultProjectRuntime = path.join(runtime.rootDirectory, ".quiz-studio");
  const isRedirectedRuntime = path.resolve(runtime.roots.runtime) !== path.resolve(defaultProjectRuntime);

  const roots: string[] = [runtimeBankRoot];
  if (!isRedirectedRuntime) {
    const projectBankRoot = path.join(defaultProjectRuntime, QUESTION_BANK_DIR);
    if (projectBankRoot !== runtimeBankRoot && existsSync(projectBankRoot)) {
      roots.push(projectBankRoot);
    }
  }
  return roots;
}

async function discoverBatchFiles(candidateRoots: string[]): Promise<DiscoveredBatchFile[]> {
  const files: DiscoveredBatchFile[] = [];

  for (const bankRoot of candidateRoots) {
    await assertSafeBankFilesystemPath(bankRoot, bankRoot);
    let archetypes: string[] = [];
    try {
      archetypes = (await readdir(bankRoot, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name);
    } catch {
      continue;
    }

    for (const arch of archetypes) {
      assertSafeBankPathSegments([arch], ["archetype"]);
      const archPath = path.join(bankRoot, arch);
      let domains: string[] = [];
      try {
        domains = (await readdir(archPath, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name);
      } catch {
        continue;
      }

      for (const dom of domains) {
        assertSafeBankPathSegments([dom], ["domain"]);
        const domPath = path.join(archPath, dom);
        let batchNames: string[] = [];
        try {
          batchNames = (await readdir(domPath, { withFileTypes: true }))
            .filter((f) => f.isFile() && f.name.endsWith(".json"))
            .map((f) => f.name);
        } catch {
          continue;
        }

        for (const name of batchNames) {
          const filePath = path.join(domPath, name);
          const stat = statSync(filePath);
          files.push({
            filePath,
            expectedArchetype: arch,
            expectedDomain: dom,
            expectedSubtopic: name.replace(/\.json$/, ""),
            mtimeMs: stat.mtimeMs,
            fileSize: stat.size,
          });
        }
      }
    }
  }
  return files;
}

async function parseAndValidateBatchFile(file: DiscoveredBatchFile): Promise<BankSubtopicBatch> {
  let rawContent: string;
  try {
    rawContent = await readFile(file.filePath, "utf8");
  } catch (err) {
    throw new RepositoryError(`Failed to read batch file ${file.filePath}`, "BANK_READ_FAILED", { cause: err });
  }

  let content: unknown;
  try {
    content = JSON.parse(rawContent);
  } catch (err) {
    throw new RepositoryError(`Malformed JSON in batch file ${file.filePath}: ${(err as Error).message}`, "BANK_BATCH_CORRUPT", { cause: err });
  }

  const parsed = BankSubtopicBatchSchema.safeParse(content);
  if (!parsed.success) {
    throw new RepositoryError(`Schema validation failed for batch file ${file.filePath}: ${parsed.error.message}`, "BANK_BATCH_CORRUPT", {
      cause: parsed.error,
    });
  }

  const data = parsed.data;
  if (data.subtopic_id !== file.expectedSubtopic) {
    throw new RepositoryError(
      `Inconsistent batch subtopic membership: file ${file.filePath} contains subtopic_id "${data.subtopic_id}" (expected "${file.expectedSubtopic}")`,
      "BANK_BATCH_INCONSISTENT",
    );
  }
  if (data.domain_id !== file.expectedDomain) {
    throw new RepositoryError(
      `Inconsistent batch domain membership: batch in directory "${file.expectedDomain}" contains domain_id "${data.domain_id}"`,
      "BANK_BATCH_INCONSISTENT",
    );
  }
  if (!matchesArchetypeFilter(file.expectedArchetype, data.archetype_id)) {
    throw new RepositoryError(
      `Inconsistent batch archetype membership: batch in directory "${file.expectedArchetype}" contains archetype_id "${data.archetype_id}"`,
      "BANK_BATCH_INCONSISTENT",
    );
  }

  for (const q of data.questions) {
    if (q.domain_id !== data.domain_id || q.subtopic_id !== data.subtopic_id || !matchesArchetypeFilter(data.archetype_id, q.archetype_id)) {
      throw new RepositoryError(`Question membership does not match batch ${file.filePath}`, "BANK_BATCH_INCONSISTENT");
    }
  }

  return data;
}

function persistSyncedBatch(
  db: ReturnType<typeof getBankSqliteDb>,
  rows: BankQuestionRow[],
  files: DiscoveredBatchFile[],
): void {
  const insertQuestionStmt = db.prepare(`
    INSERT INTO bank_questions (
      id, entity_id, archetype_id, domain_id, subtopic_id, language, question,
      format, choices, correct_choice_id, explanation, fun_fact, visual_spec,
      age_band, difficulty, thinking_seconds, tags, status, created_at, updated_at, translations
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?, ?
    )
    ON CONFLICT(id) DO UPDATE SET
      entity_id = excluded.entity_id,
      archetype_id = excluded.archetype_id,
      domain_id = excluded.domain_id,
      subtopic_id = excluded.subtopic_id,
      language = excluded.language,
      question = excluded.question,
      format = excluded.format,
      choices = excluded.choices,
      correct_choice_id = excluded.correct_choice_id,
      explanation = excluded.explanation,
      fun_fact = excluded.fun_fact,
      visual_spec = excluded.visual_spec,
      age_band = excluded.age_band,
      difficulty = excluded.difficulty,
      thinking_seconds = excluded.thinking_seconds,
      tags = excluded.tags,
      status = excluded.status,
      created_at = excluded.created_at,
      updated_at = excluded.updated_at,
      translations = excluded.translations;
  `);

  const recordSyncStmt = db.prepare(`
    INSERT INTO bank_json_sync (file_path, mtime_ms, file_size)
    VALUES (?, ?, ?)
    ON CONFLICT(file_path) DO UPDATE SET
      mtime_ms = excluded.mtime_ms,
      file_size = excluded.file_size;
  `);

  db.exec("BEGIN;");
  try {
    for (const row of rows) {
      insertQuestionStmt.run(
        row.id,
        row.entity_id,
        row.archetype_id,
        row.domain_id,
        row.subtopic_id,
        row.language,
        row.question,
        row.format,
        row.choices,
        row.correct_choice_id,
        row.explanation,
        row.fun_fact,
        row.visual_spec,
        row.age_band,
        row.difficulty,
        row.thinking_seconds,
        row.tags,
        row.status,
        row.created_at,
        row.updated_at,
        row.translations ?? "{}",
      );
    }
    for (const file of files) {
      recordSyncStmt.run(file.filePath, file.mtimeMs, file.fileSize);
    }
    db.exec("COMMIT;");
  } catch (err) {
    db.exec("ROLLBACK;");
    throw err;
  }
}
