import { appendFileSync, existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { parseArgs } from "node:util";
import { loadConfig } from "../apps/server/src/config.js";
import { StudioLogger } from "../apps/server/src/logger.js";
import { AntigravityClient } from "../apps/server/src/antigravity.js";
import { CodexAppServerClient } from "../apps/server/src/codex.js";
import { rowToBankQuestion, type BankQuestionRow } from "../apps/server/src/repository/quiz/bank/bankSqliteMapper.js";
import {
  applyKidReadabilityRewritesToBank,
  needsKidReadabilityRewrite,
  rewriteKidReadabilityBatch,
  toKidReadabilityRewriteInput,
  type KidReadabilityRewrite,
  type KidReadabilityRewriteInput,
} from "../apps/server/src/quiz/bank/remediation/kidReadability/index.js";

/**
 * Rewrites the narrated explanation and fun fact of approved Question Bank questions for children aged 6-12.
 * Phase 1 (default) asks the LLM in batches and appends results to a resumable JSONL progress file.
 * Phase 2 (--apply, dashboard stopped) writes accepted rewrites into the batch files and SQLite, with a backup.
 *
 * Usage: tsx scripts/simplify-bank-copy.ts [--bank-root <abs>] [--batch-size 20] [--concurrency 3] [--limit N] [--apply]
 */
const MAX_ATTEMPTS = 2;

interface ProgressEntry {
  id: string;
  status: "accepted" | "rejected";
  explanation?: string;
  funFact?: string;
  reason?: string;
}

function resolveBankRoot(explicit?: string): string {
  if (explicit) return explicit;
  const storageConfig = path.resolve(".quiz-studio/storage.local.json");
  const storagePath = existsSync(storageConfig)
    ? (JSON.parse(readFileSync(storageConfig, "utf8")) as { storage_path?: string }).storage_path
    : undefined;
  return path.join(storagePath ?? path.resolve("."), ".quiz-studio", "question_bank");
}

function readProgress(progressPath: string): ProgressEntry[] {
  if (!existsSync(progressPath)) return [];
  return readFileSync(progressPath, "utf8")
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line) as ProgressEntry);
}

function summarizeProgress(entries: ProgressEntry[]) {
  const accepted = new Map<string, KidReadabilityRewrite>();
  const attempts = new Map<string, number>();
  for (const entry of entries) {
    attempts.set(entry.id, (attempts.get(entry.id) ?? 0) + 1);
    if (entry.status === "accepted")
      accepted.set(entry.id, { id: entry.id, explanation: entry.explanation!, funFact: entry.funFact ?? "" });
  }
  return { accepted, attempts };
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) chunks.push(items.slice(index, index + size));
  return chunks;
}

async function createLlmClient(workspaceRoot: string) {
  const config = await loadConfig(workspaceRoot);
  const logger = new StudioLogger(workspaceRoot, false);
  return config.active_engine === "antigravity"
    ? new AntigravityClient(workspaceRoot, config, logger)
    : new CodexAppServerClient(workspaceRoot, config, logger);
}

function selectPending(db: DatabaseSync, progress: ReturnType<typeof summarizeProgress>, limit: number): KidReadabilityRewriteInput[] {
  const rows = db.prepare("SELECT * FROM bank_questions WHERE status = 'approved' ORDER BY id;").all() as unknown as BankQuestionRow[];
  return rows
    .map(rowToBankQuestion)
    .filter((question) => !progress.accepted.has(question.id) && (progress.attempts.get(question.id) ?? 0) < MAX_ATTEMPTS)
    .filter(needsKidReadabilityRewrite)
    .slice(0, limit)
    .map(toKidReadabilityRewriteInput);
}

async function runGeneration(db: DatabaseSync, progressPath: string, options: { batchSize: number; concurrency: number; limit: number }) {
  const pending = selectPending(db, summarizeProgress(readProgress(progressPath)), options.limit);
  const batches = chunk(pending, options.batchSize);
  console.log(`Questions needing a kid-friendly rewrite: ${pending.length} in ${batches.length} batches.`);
  const llmClient = await createLlmClient(path.resolve("."));
  let nextBatch = 0;
  let accepted = 0;
  let rejected = 0;
  const worker = async () => {
    while (nextBatch < batches.length) {
      const batchIndex = nextBatch++;
      try {
        const result = await rewriteKidReadabilityBatch(batches[batchIndex], { llmClient });
        const lines = [
          ...result.accepted.map((rewrite): ProgressEntry => ({
            id: rewrite.id,
            status: "accepted",
            explanation: rewrite.explanation,
            funFact: rewrite.funFact,
          })),
          ...result.rejected.map((rejection): ProgressEntry => ({ id: rejection.id, status: "rejected", reason: rejection.reason })),
        ];
        appendFileSync(progressPath, lines.map((line) => JSON.stringify(line)).join("\n") + "\n");
        accepted += result.accepted.length;
        rejected += result.rejected.length;
      } catch (error) {
        console.warn(`Batch ${batchIndex + 1} failed and will be retried on the next run: ${(error as Error).message.slice(0, 200)}`);
      }
      console.log(`Batch ${batchIndex + 1}/${batches.length} done. Accepted ${accepted}, rejected ${rejected}.`);
    }
  };
  await Promise.all(Array.from({ length: options.concurrency }, worker));
}

async function runApply(bankRoot: string, db: DatabaseSync, progressPath: string) {
  const { accepted } = summarizeProgress(readProgress(progressPath));
  const backupDir = path.join(
    path.dirname(bankRoot),
    "question_bank_migrations",
    `kid_readability_${new Date().toISOString().replace(/[:.]/g, "-")}`,
  );
  const result = await applyKidReadabilityRewritesToBank(bankRoot, db, accepted, backupDir);
  console.log(`Applied ${accepted.size} rewrites:`, result, `Backup: ${backupDir}`);
}

const { values } = parseArgs({
  options: {
    "bank-root": { type: "string" },
    "batch-size": { type: "string", default: "20" },
    concurrency: { type: "string", default: "3" },
    limit: { type: "string", default: String(Number.MAX_SAFE_INTEGER) },
    apply: { type: "boolean", default: false },
  },
  strict: true,
});
const bankRoot = resolveBankRoot(values["bank-root"]);
const progressPath = path.join(path.dirname(bankRoot), "question_bank_migrations", "kid_readability_progress.jsonl");
const db = new DatabaseSync(path.join(bankRoot, "questions.db"));
try {
  if (values.apply) await runApply(bankRoot, db, progressPath);
  else
    await runGeneration(db, progressPath, {
      batchSize: Number(values["batch-size"]),
      concurrency: Number(values.concurrency),
      limit: Number(values.limit),
    });
} finally {
  db.close();
}
process.exit(0);
