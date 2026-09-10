import { normalizeLanguageCode, type BankQuestion, type BankQuestionWithCooldown } from "@studio/shared";
import { calculateQuestionSimilarity, normalizeQuestionText } from "../../../quiz/qa/questionHistory.js";
import type { RepositoryRuntime } from "../../runtime.js";
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
  limit?: number;
  offset?: number;
}

/**
 * Queries bank questions with multi-attribute filtering, search, pagination,
 * and optional channel cooldown calculation.
 */
export async function queryQuestionBankQuestionsUnlocked(
  this: RepositoryRuntime,
  params: QueryQuestionBankParams = {},
): Promise<{ questions: BankQuestionWithCooldown[]; total: number }> {
  const batches = await listQuestionBankBatchesUnlocked.call(this, {
    archetypeId: params.archetypeId,
    domainId: params.domainId,
  });

  let allQuestions: BankQuestion[] = [];
  for (const batch of batches) {
    if (params.subtopicId && batch.subtopic_id !== params.subtopicId) continue;
    allQuestions.push(...batch.questions);
  }

  if (params.archetypeId === "verdict_fact_myth") {
    allQuestions = allQuestions.map((q) => {
      if (q.archetype_id === "verdict_true_false") {
        return { ...q, archetype_id: "verdict_fact_myth" as const };
      }
      return q;
    });
  }

  // Filter by status
  if (params.status) {
    allQuestions = allQuestions.filter((q) => q.status === params.status);
  }

  // Filter by source language
  if (params.language?.trim()) {
    const targetLang = normalizeLanguageCode(params.language);
    allQuestions = allQuestions.filter((q) => normalizeLanguageCode(q.language) === targetLang);
  }

  // Filter by hasTranslationFor
  if (params.hasTranslationFor?.trim()) {
    const targetLang = normalizeLanguageCode(params.hasTranslationFor);
    allQuestions = allQuestions.filter((q) => {
      if (normalizeLanguageCode(q.language) === targetLang) return true;
      return Boolean(q.translations && q.translations[targetLang]);
    });
  }

  // Filter by search keyword (multilingual aware)
  if (params.search?.trim()) {
    const normSearch = normalizeQuestionText(params.search);
    allQuestions = allQuestions.filter((q) => {
      const normQ = normalizeQuestionText(q.question);
      const inTags = q.tags.some((t) => normalizeQuestionText(t).includes(normSearch));
      const inExplanation = normalizeQuestionText(q.explanation).includes(normSearch);
      const inTranslations = Object.values(q.translations || {}).some(
        (tr) =>
          normalizeQuestionText(tr.question).includes(normSearch) ||
          normalizeQuestionText(tr.explanation).includes(normSearch) ||
          (tr.fun_fact ? normalizeQuestionText(tr.fun_fact).includes(normSearch) : false) ||
          tr.choices.some((c) => normalizeQuestionText(c.text).includes(normSearch)),
      );
      return normQ.includes(normSearch) || inTags || inExplanation || inTranslations;
    });
  }

  // Calculate Channel Cooldown if channelId is provided
  let historyEntries: Awaited<ReturnType<RepositoryRuntime["readQuestionHistory"]>> = [];
  if (params.channelId) {
    historyEntries = await this.readQuestionHistory(params.channelId).catch(() => []);
  }

  const nowMs = Date.now();
  const cooldownMs = COOLDOWN_DAYS_DEFAULT * 24 * 60 * 60 * 1000;

  const questionsWithCooldown: BankQuestionWithCooldown[] = allQuestions.map((q) => {
    if (!params.channelId || historyEntries.length === 0) {
      return {
        ...q,
        channel_cooldown: {
          is_cooldown: false,
          days_remaining: 0,
        },
      };
    }

    // Match against channel history by ID or semantic similarity >= 0.75
    let matchedEntry: (typeof historyEntries)[number] | null = null;
    let highestSim = 0;

    for (const entry of historyEntries) {
      if (entry.question_id === q.id) {
        matchedEntry = entry;
        break;
      }
      const sim = calculateQuestionSimilarity(q.question, entry.question_text);
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
          ...q,
          channel_cooldown: {
            is_cooldown: true,
            days_remaining: daysRemaining,
            last_used_at: matchedEntry.rendered_at,
            episode_id: matchedEntry.episode_id,
            episode_title: matchedEntry.episode_title,
          },
        };
      }
    }

    return {
      ...q,
      channel_cooldown: {
        is_cooldown: false,
        days_remaining: 0,
        last_used_at: matchedEntry ? matchedEntry.rendered_at : undefined,
      },
    };
  });

  // Filter by Cooldown flag if requested
  let filtered = questionsWithCooldown;
  if (params.cooldownOnly) {
    filtered = filtered.filter((q) => q.channel_cooldown?.is_cooldown);
  } else if (params.readyOnly) {
    filtered = filtered.filter((q) => !q.channel_cooldown?.is_cooldown);
  }

  // Sort questions: newest first by default
  filtered.sort((a, b) => {
    const timeA = new Date(a.updated_at || a.created_at || 0).getTime();
    const timeB = new Date(b.updated_at || b.created_at || 0).getTime();
    return timeB - timeA;
  });

  const total = filtered.length;
  const offset = params.offset || 0;
  const limit = params.limit || 50;
  const paginated = filtered.slice(offset, offset + limit);

  return { questions: paginated, total };
}

export function queryQuestionBankQuestions(
  this: RepositoryRuntime,
  params: QueryQuestionBankParams = {},
): Promise<{ questions: BankQuestionWithCooldown[]; total: number }> {
  return withBankRead(this, () => queryQuestionBankQuestionsUnlocked.call(this, params));
}

export function readQuestionBankQuestionsSnapshot(
  this: RepositoryRuntime,
  params: QueryQuestionBankParams = {},
): Promise<{ questions: BankQuestionWithCooldown[]; total: number; revision: number }> {
  return withBankRead(this, async () => ({
    ...(await queryQuestionBankQuestionsUnlocked.call(this, params)),
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
  return withBankRead(this, () => queryQuestionBankQuestionsUnlocked.call(this, { ...options, search }));
}

/**
 * Finds a single question in the bank by its unique identifier.
 */
export async function getQuestionBankQuestionUnlocked(
  this: RepositoryRuntime,
  questionId: string,
  channelId?: string,
): Promise<BankQuestionWithCooldown | null> {
  const batches = await listQuestionBankBatchesUnlocked.call(this);
  let matchedQuestion: BankQuestion | null = null;
  for (const batch of batches) {
    const found = batch.questions.find((q) => q.id === questionId);
    if (found) {
      matchedQuestion = found.archetype_id === "verdict_fact_myth" ? { ...found, archetype_id: "verdict_true_false" } : found;
      break;
    }
  }

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

  let matchedEntry: (typeof historyEntries)[number] | null = null;
  let highestSim = 0;

  for (const entry of historyEntries) {
    if (entry.question_id === matchedQuestion.id) {
      matchedEntry = entry;
      break;
    }
    const sim = calculateQuestionSimilarity(matchedQuestion.question, entry.question_text);
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
        ...matchedQuestion,
        channel_cooldown: {
          is_cooldown: true,
          days_remaining: daysRemaining,
          last_used_at: matchedEntry.rendered_at,
          episode_id: matchedEntry.episode_id,
          episode_title: matchedEntry.episode_title,
        },
      };
    }
  }

  return {
    ...matchedQuestion,
    channel_cooldown: {
      is_cooldown: false,
      days_remaining: 0,
      last_used_at: matchedEntry ? matchedEntry.rendered_at : undefined,
    },
  };
}

export function getQuestionBankQuestion(
  this: RepositoryRuntime,
  questionId: string,
  channelId?: string,
): Promise<BankQuestionWithCooldown | null> {
  return withBankRead(this, () => getQuestionBankQuestionUnlocked.call(this, questionId, channelId));
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
