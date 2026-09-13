import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { DatabaseSync as SqliteDatabase } from "node:sqlite";
import { withBankSqliteDbSync } from "../../../repository/quiz/bank/bankSqliteEngine.js";
import { getMatrixCoverageCache, type MatrixCoverageCache } from "./matrixCoverageCache.js";
import type { SqliteAggregationRow } from "./matrixCoverageCache.types.js";

const SQL_AGGREGATION_WARMUP = `
  SELECT archetype_id, domain_id, entity_id, COUNT(*) as count
  FROM bank_questions
  WHERE status = 'approved'
  GROUP BY archetype_id, domain_id, entity_id;
`;

/**
 * Reads the persisted target_total from index.json if present on disk.
 */
function readPersistedTargetTotal(runtimeBankRoot: string): number {
  const indexPath = path.join(runtimeBankRoot, "index.json");
  if (existsSync(indexPath)) {
    try {
      const raw = JSON.parse(readFileSync(indexPath, "utf8")) as { target_total?: number };
      if (typeof raw?.target_total === "number" && raw.target_total >= 20000) {
        return raw.target_total;
      }
    } catch {
      // Fallback to default
    }
  }
  return 20000;
}

/**
 * Warms up the in-memory cache directly from the SQLite database using fast SQL grouping.
 */
export function warmUpMatrixCoverageCache(runtimeBankRoot: string, db?: SqliteDatabase): MatrixCoverageCache {
  const cache = getMatrixCoverageCache(runtimeBankRoot);
  const targetTotal = readPersistedTargetTotal(runtimeBankRoot);

  try {
    if (db) {
      const stmt = db.prepare(SQL_AGGREGATION_WARMUP);
      const rows = stmt.all() as unknown as SqliteAggregationRow[];
      cache.warmUpFromSqlite(rows, targetTotal);
      return cache;
    }

    return withBankSqliteDbSync(runtimeBankRoot, (sqlite) => {
      const stmt = sqlite.prepare(SQL_AGGREGATION_WARMUP);
      const rows = stmt.all() as unknown as SqliteAggregationRow[];
      cache.warmUpFromSqlite(rows, targetTotal);
      return cache;
    });
  } catch {
    return cache;
  }
}

/**
 * Ensures the cache for the given runtime bank root is warmed, warming it on first access if needed.
 */
export function ensureMatrixCoverageCache(runtimeBankRoot: string, db?: SqliteDatabase): MatrixCoverageCache {
  const cache = getMatrixCoverageCache(runtimeBankRoot);
  if (cache.isWarmed()) {
    return cache;
  }
  return warmUpMatrixCoverageCache(runtimeBankRoot, db);
}
