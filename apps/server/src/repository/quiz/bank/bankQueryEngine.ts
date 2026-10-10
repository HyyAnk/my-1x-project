import path from "node:path";
import type { BankQuestionWithCooldown } from "@studio/shared";
import { createBankCooldownCalculator, type BankCooldownScope } from "./bankCooldownCalculator.js";
import type { RepositoryRuntime } from "../../runtime.js";
import { QUESTION_BANK_DIR } from "./bankPathResolver.js";
import { withBankSqliteDb } from "./bankSqliteEngine.js";
import { queryBankQuestionsSqlite, getBankQuestionByIdSqlite } from "./bankSqliteQueries.js";
import { syncQuestionBankFromJson } from "./bankSqliteSync.js";
import { listQuestionBankBatchesUnlocked } from "./bankBatchStorage.js";
import { readQuestionBankIndexUnlocked } from "./bankIndexManager.js";
import { bankRevisionToken, digestBankSnapshot, getBankSerializationBoundary, withBankRead } from "./bankSerializationBoundary.js";
import type { BankQuestionSnapshot } from "./bankSerializationBoundary.js";

// Re-export mutation operations for 100% backward compatibility
export {
  saveQuestionBankQuestion,
  deleteQuestionBankQuestion,
  clearQuestionBank,
  clearAllQuestionBankQuestions,
} from "./bankMutationEngine.js";

export const COOLDOWN_DAYS_DEFAULT = 30;

export type { BankCooldownScope } from "./bankCooldownCalculator.js";

export interface QueryQuestionBankParams {
  channelId?: string;
  archetypeId?: string;
  domainId?: string;
  subtopicId?: string;
  status?: string;
  search?: string;
  language?: string;
  hasTranslationFor?: string;
  cooldownOnly?: boolean;
  readyOnly?: boolean;
  scope?: BankCooldownScope;
  limit?: number;
  offset?: number;
}

const COOLDOWN_MS_DEFAULT = COOLDOWN_DAYS_DEFAULT * 24 * 60 * 60 * 1000;

/**
 * Queries bank questions with multi-attribute filtering, search, pagination,
 * and optional channel cooldown calculation using direct SQLite WAL queries.
 */
export async function queryQuestionBankQuestionsUnlocked(
  this: RepositoryRuntime,
  params: QueryQuestionBankParams = {},
  scope?: BankCooldownScope,
): Promise<{ questions: BankQuestionWithCooldown[]; total: number }> {
  const effectiveScope = params.scope ?? scope;
  const runtimeBankRoot = path.join(this.roots.runtime, QUESTION_BANK_DIR);
  return withBankSqliteDb(runtimeBankRoot, async (db) => {
    await syncQuestionBankFromJson(this);

    const isCooldownFilterActive = Boolean(params.channelId && (params.cooldownOnly || params.readyOnly));

    if (!isCooldownFilterActive) {
      const { questions, total } = queryBankQuestionsSqlite(db, params);
      let historyEntries: Awaited<ReturnType<RepositoryRuntime["readQuestionHistory"]>> = [];
      if (params.channelId) {
        historyEntries = await this.readQuestionHistory(params.channelId).catch(() => []);
      }
      const applyCooldown = createBankCooldownCalculator(historyEntries, {
        nowMs: Date.now(),
        cooldownMs: COOLDOWN_MS_DEFAULT,
        scope: effectiveScope,
      });
      return { questions: questions.map(applyCooldown), total };
    }

    const historyEntries = await this.readQuestionHistory(params.channelId!).catch(() => []);
    const { questions: allMatching } = queryBankQuestionsSqlite(db, {
      ...params,
      limit: 100000,
      offset: 0,
    });

    const applyCooldown = createBankCooldownCalculator(historyEntries, {
      nowMs: Date.now(),
      cooldownMs: COOLDOWN_MS_DEFAULT,
      scope: effectiveScope,
    });
    let filtered = allMatching.map(applyCooldown);

    if (params.cooldownOnly) {
      filtered = filtered.filter((q) => q.channel_cooldown?.is_cooldown);
    } else if (params.readyOnly) {
      filtered = filtered.filter((q) => !q.channel_cooldown?.is_cooldown);
    }

    const total = filtered.length;
    const offset = Math.max(0, params.offset ?? 0);
    const limit = Math.max(1, params.limit ?? 50);
    const paginated = filtered.slice(offset, offset + limit);

    return { questions: paginated, total };
  });
}

export function queryQuestionBankQuestions(
  this: RepositoryRuntime,
  params: QueryQuestionBankParams = {},
  scope?: BankCooldownScope,
): Promise<{ questions: BankQuestionWithCooldown[]; total: number }> {
  return queryQuestionBankQuestionsUnlocked.call(this, params, scope);
}

export function readQuestionBankQuestionsSnapshot(
  this: RepositoryRuntime,
  params: QueryQuestionBankParams = {},
  scope?: BankCooldownScope,
): Promise<{ questions: BankQuestionWithCooldown[]; total: number; revision: number }> {
  return withBankRead(this, async () => ({
    ...(await queryQuestionBankQuestionsUnlocked.call(this, params, scope)),
    revision: getBankSerializationBoundary(this).revision,
  }));
}

/**
 * Convenience helper to search questions by text keyword across questions, tags, and translations.
 */
export async function searchQuestionBank(
  this: RepositoryRuntime,
  search: string,
  options: Omit<QueryQuestionBankParams, "search"> = {},
): Promise<{ questions: BankQuestionWithCooldown[]; total: number }> {
  return queryQuestionBankQuestionsUnlocked.call(this, { ...options, search });
}

/**
 * Finds a single question in the bank by its unique identifier using SQLite indexed lookup.
 */
export async function getQuestionBankQuestionUnlocked(
  this: RepositoryRuntime,
  questionId: string,
  channelId?: string,
  scope?: BankCooldownScope,
): Promise<BankQuestionWithCooldown | null> {
  const runtimeBankRoot = path.join(this.roots.runtime, QUESTION_BANK_DIR);
  return withBankSqliteDb(runtimeBankRoot, async (db) => {
    await syncQuestionBankFromJson(this);
    const matchedQuestion = getBankQuestionByIdSqlite(db, questionId);

    if (!matchedQuestion) return null;

    if (!channelId) {
      return {
        ...matchedQuestion,
        channel_cooldown: {
          is_cooldown: false,
          days_remaining: 0,
        },
      };
    }

    const historyEntries = await this.readQuestionHistory(channelId).catch(() => []);
    return createBankCooldownCalculator(historyEntries, { nowMs: Date.now(), cooldownMs: COOLDOWN_MS_DEFAULT, scope })(matchedQuestion);
  });
}

export function getQuestionBankQuestion(
  this: RepositoryRuntime,
  questionId: string,
  channelId?: string,
  scope?: BankCooldownScope,
): Promise<BankQuestionWithCooldown | null> {
  return getQuestionBankQuestionUnlocked.call(this, questionId, channelId, scope);
}

export async function readQuestionBankSnapshotUnlocked(this: RepositoryRuntime): Promise<BankQuestionSnapshot> {
  const batches = await listQuestionBankBatchesUnlocked.call(this);
  const index = await readQuestionBankIndexUnlocked.call(this);
  const boundary = getBankSerializationBoundary(this);
  const digest = digestBankSnapshot(batches, index);
  return {
    epoch: boundary.epoch,
    revision: boundary.revision,
    snapshotToken: bankRevisionToken(boundary.epoch, boundary.revision, digest),
    batches,
    index,
  };
}

export function readQuestionBankSnapshot(this: RepositoryRuntime): Promise<BankQuestionSnapshot> {
  return withBankRead(this, () => readQuestionBankSnapshotUnlocked.call(this));
}
