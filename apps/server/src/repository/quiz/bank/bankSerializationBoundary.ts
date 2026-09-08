import { AsyncLocalStorage } from "node:async_hooks";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import type { DatabaseSync as SqliteDatabase } from "node:sqlite";
import type { BankIndex, BankSubtopicBatch } from "@studio/shared";
import { RepositoryError } from "../../errors.js";
import type { RepositoryRuntime } from "../../runtime.js";
import { QUESTION_BANK_DIR } from "./bankPathResolver.js";

/**
 * PUBLISHED QUESTION BANK WRITER INVENTORY:
 * 1. saveQuestionBankQuestion (CRUD, batch import/generation, JIT)
 * 2. writeSubtopicBatch (bulk batch writes)
 * 3. deleteQuestionBankQuestion (removal)
 * 4. clearQuestionBank / clearAllQuestionBankQuestions (complete reset)
 * 5. recalculateQuestionBankIndex (index statistics recalculation)
 * 6. saveQuestionBankTranslation (legacy translation persistence until retired)
 * 7. backupBankLanguageMigration / applyBankLanguageMigration / rollbackBankLanguageMigration (metadata migrations)
 *
 * PUBLISHED SUBSYSTEM LOCK ORDER:
 * When acquiring locks across multiple subsystems, systems MUST adhere strictly to the following acquisition hierarchy:
 * 1. Channel / ShortReel Writer Admission (SQLite OS lock)
 * 2. Question Bank Serialization Boundary (In-Process FIFO + OS-level .bank_writer.lock)
 * 3. Episode / Artifact Mutation Queues
 *
 * Rules:
 * - Public boundary methods (withBankRead / withBankWrite) must NOT be invoked recursively within an active boundary operation.
 *   Recursive invocation is detected and rejected with a BANK_RECURSIVE_LOCK error.
 * - Inside the boundary, callers MUST invoke unlocked internal methods (*Unlocked).
 */

let SqliteDbClass: (new (path: string) => SqliteDatabase) | null = null;
try {
  const req = createRequire(import.meta.url);
  const sqlite = req("node:sqlite") as { DatabaseSync: new (path: string) => SqliteDatabase };
  SqliteDbClass = sqlite.DatabaseSync;
} catch {
  SqliteDbClass = null;
}

export interface BankSnapshotRevision {
  epoch?: string;
  revision: number;
}

export interface BankQuestionSnapshot {
  epoch: string;
  revision: number;
  snapshotToken: string;
  batches: BankSubtopicBatch[];
  index: BankIndex;
}

export interface BankSerializationBoundary {
  readonly epoch: string;
  readonly revision: number;
  runRead<T>(operation: () => Promise<T>): Promise<T>;
  runWrite<T>(operation: () => Promise<T>): Promise<T>;
}

class QueueBoundary implements BankSerializationBoundary {
  readonly epoch: string = randomUUID();
  private queue: Promise<void> = Promise.resolve();
  private currentRevision = 0;
  private asyncLocalStorage = new AsyncLocalStorage<{ active: boolean; type: "read" | "write" }>();

  constructor(private readonly bankRoot?: string) {}

  get revision(): number {
    return this.currentRevision;
  }

  runRead<T>(operation: () => Promise<T>): Promise<T> {
    if (this.asyncLocalStorage.getStore()?.active) {
      throw new RepositoryError(
        "BANK_RECURSIVE_LOCK: recursive public boundary acquisition is forbidden; use unlocked helpers inside boundary",
        "BANK_RECURSIVE_LOCK",
      );
    }
    return this.enqueue(operation, false);
  }

  runWrite<T>(operation: () => Promise<T>): Promise<T> {
    if (this.asyncLocalStorage.getStore()?.active) {
      throw new RepositoryError(
        "BANK_RECURSIVE_LOCK: recursive public boundary acquisition is forbidden; use unlocked helpers inside boundary",
        "BANK_RECURSIVE_LOCK",
      );
    }
    return this.enqueue(operation, true);
  }

  private enqueue<T>(operation: () => Promise<T>, writes: boolean): Promise<T> {
    const previous = this.queue;
    let release!: () => void;
    this.queue = new Promise<void>((resolve) => {
      release = resolve;
    });

    const run = previous
      .catch(() => undefined)
      .then(async () => {
        return this.asyncLocalStorage.run({ active: true, type: writes ? "write" : "read" }, async () => {
          let db: SqliteDatabase | undefined;
          if (writes && this.bankRoot && SqliteDbClass) {
            try {
              fs.mkdirSync(this.bankRoot, { recursive: true });
              db = new SqliteDbClass(path.join(this.bankRoot, ".bank_writer.lock"));
              db.exec("PRAGMA busy_timeout = 200; PRAGMA locking_mode = EXCLUSIVE;");
              db.exec("CREATE TABLE IF NOT EXISTS lock_lease (id INTEGER PRIMARY KEY);");
              db.exec("BEGIN EXCLUSIVE;");
            } catch (err) {
              db?.close();
              throw new RepositoryError("BANK_WRITER_BUSY: question bank writer lock held by another process", "BANK_WRITER_BUSY", {
                cause: err,
              });
            }
          }
          try {
            const result = await operation();
            if (writes) this.currentRevision += 1;
            return result;
          } finally {
            if (db) {
              try {
                db.exec("ROLLBACK;");
              } catch {
                // Ignore rollback cleanup on closed db
              }
              db.close();
            }
          }
        });
      });
    return run.finally(release);
  }
}

const boundaryByBankRoot = new Map<string, BankSerializationBoundary>();

export function getBankSerializationBoundary(runtime: RepositoryRuntime): BankSerializationBoundary {
  const key = path.resolve(runtime.roots.runtime, QUESTION_BANK_DIR);
  let boundary = boundaryByBankRoot.get(key);
  if (!boundary) {
    boundary = createBankSerializationBoundary(key);
    boundaryByBankRoot.set(key, boundary);
  }
  return boundary;
}

export function createBankSerializationBoundary(bankRoot?: string): BankSerializationBoundary {
  return new QueueBoundary(bankRoot);
}

export function withBankRead<T>(runtime: RepositoryRuntime, operation: () => Promise<T>): Promise<T> {
  return getBankSerializationBoundary(runtime).runRead(operation);
}

export function withBankWrite<T>(runtime: RepositoryRuntime, operation: () => Promise<T>): Promise<T> {
  return getBankSerializationBoundary(runtime).runWrite(operation);
}

export function bankRevisionToken(epochOrRevision: string | number, revisionOrDigest: number | string, maybeDigest?: string): string {
  if (maybeDigest !== undefined) {
    return `${epochOrRevision}:${revisionOrDigest}:${maybeDigest}`;
  }
  return `${epochOrRevision}:${revisionOrDigest}`;
}

export function digestBankSnapshot(batches: BankSubtopicBatch[], index?: BankIndex): string {
  const normalizedBatches = batches
    .map((batch) => ({
      archetype_id: batch.archetype_id,
      domain_id: batch.domain_id,
      subtopic_id: batch.subtopic_id,
      questions: batch.questions,
    }))
    .sort((a, b) => `${a.archetype_id}/${a.domain_id}/${a.subtopic_id}`.localeCompare(`${b.archetype_id}/${b.domain_id}/${b.subtopic_id}`));
  const normalizedIndex = index
    ? {
        target_total: index.target_total,
        current_total: index.current_total,
        by_archetype: index.by_archetype,
        by_domain: index.by_domain,
      }
    : null;
  return createHash("sha256")
    .update(JSON.stringify({ batches: normalizedBatches, index: normalizedIndex }))
    .digest("hex");
}
