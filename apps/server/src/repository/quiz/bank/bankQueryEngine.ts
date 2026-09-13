import path from "node:path";
import {
  type BankQuestion,
  type BankQuestionWithCooldown,
  type QuestionContentType,
  inferQuestionHistoryContentType,
} from "@studio/shared";
import { calculateQuestionSimilarity } from "../../../quiz/qa/questionHistory.js";
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

export type BankCooldownScope = "all" | "episode" | "short_reel";

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

/**
 * Calculates channel cooldown for a single question based on channel history and optional scope.
 */
function computeQuestionCooldown(
  question: BankQuestion,
  historyEntries: Array<{
    question_id: string;
    question_text: string;
    rendered_at: string;
    episode_id?: string;
    episode_title?: string;
    content_type?: QuestionContentType;
  }>,
  nowMs: number,
  cooldownMs: number,
  scope?: BankCooldownScope,
): BankQuestionWithCooldown {
  const scopedHistory =
    scope === "episode"
      ? historyEntries.filter((entry) => inferQuestionHistoryContentType(entry) === "episode")
      : scope === "short_reel"
        ? historyEntries.filter((entry) => inferQuestionHistoryContentType(entry) === "short_reel")
        : historyEntries;

  if (scopedHistory.length === 0) {
    return {
      ...question,
      channel_cooldown: {
        is_cooldown: false,
        days_remaining: 0,
      },
    };
  }

  let matchedEntry: (typeof scopedHistory)[number] | null = null;
  let highestSim = 0;

  for (const entry of scopedHistory) {
    if (entry.question_id === question.id) {
      matchedEntry = entry;
      break;
    }
    const sim = calculateQuestionSimilarity(question.question, entry.question_text);
    if (sim >= 0.75 && sim > highestSim) {
      highestSim = sim;
      matchedEntry = entry;
    }
  }

  if (matchedEntry) {
    const renderedMs = new Date(matchedEntry.rendered_at).getTime();
    const timeDiff = nowMs - renderedMs;
    if (timeDiff < cooldownMs) {
      const daysRemaining = Math.max(1, Math.ceil((cooldownMs - timeDiff) / (24 * 60 * 60 * 1000)));
      return {
        ...question,
        channel_cooldown: {
          is_cooldown: true,
          days_remaining: daysRemaining,
          last_used_at: matchedEntry.rendered_at,
          episode_id: matchedEntry.episode_id,
          episode_title: matchedEntry.episode_title,
          content_type: inferQuestionHistoryContentType(matchedEntry),
        },
      };
    }
  }

  return {
    ...question,
    channel_cooldown: {
      is_cooldown: false,
      days_remaining: 0,
      last_used_at: matchedEntry ? matchedEntry.rendered_at : undefined,
    },
  };
}

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
      const nowMs = Date.now();
      const cooldownMs = COOLDOWN_DAYS_DEFAULT * 24 * 60 * 60 * 1000;
      const questionsWithCooldown = questions.map((q) =>
        params.channelId
          ? computeQuestionCooldown(q, historyEntries, nowMs, cooldownMs, effectiveScope)
          : {
              ...q,
              channel_cooldown: { is_cooldown: false, days_remaining: 0 },
            },
      );
      return { questions: questionsWithCooldown, total };
    }

    const historyEntries = await this.readQuestionHistory(params.channelId!).catch(() => []);
    const { questions: allMatching } = queryBankQuestionsSqlite(db, {
      ...params,
      limit: 100000,
      offset: 0,
    });

    const nowMs = Date.now();
    const cooldownMs = COOLDOWN_DAYS_DEFAULT * 24 * 60 * 60 * 1000;
    let filtered = allMatching.map((q) => computeQuestionCooldown(q, historyEntries, nowMs, cooldownMs, effectiveScope));

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
    const nowMs = Date.now();
    const cooldownMs = COOLDOWN_DAYS_DEFAULT * 24 * 60 * 60 * 1000;
    return computeQuestionCooldown(matchedQuestion, historyEntries, nowMs, cooldownMs, scope);
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
