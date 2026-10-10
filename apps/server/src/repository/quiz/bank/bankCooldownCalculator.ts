import {
  type BankQuestion,
  type BankQuestionWithCooldown,
  type QuestionContentType,
  inferQuestionHistoryContentType,
} from "@studio/shared";
import { QuestionSimilarityIndex } from "../../../quiz/qa/questionSimilarityIndex.js";

export type BankCooldownScope = "all" | "episode" | "short_reel";

export interface CooldownHistoryEntry {
  question_id: string;
  question_text: string;
  rendered_at: string;
  episode_id?: string;
  episode_title?: string;
  content_type?: QuestionContentType;
}

export interface BankCooldownOptions {
  nowMs: number;
  cooldownMs: number;
  scope?: BankCooldownScope;
}

export type BankCooldownCalculator = (question: BankQuestion) => BankQuestionWithCooldown;

const SIMILARITY_MATCH_THRESHOLD = 0.75;
const DAY_MS = 24 * 60 * 60 * 1000;

interface PreparedHistory {
  entries: CooldownHistoryEntry[];
  similarityIndex: QuestionSimilarityIndex;
  firstEntryByQuestionId: Map<string, CooldownHistoryEntry>;
}

function filterHistoryByScope(entries: CooldownHistoryEntry[], scope?: BankCooldownScope): CooldownHistoryEntry[] {
  if (scope === "episode" || scope === "short_reel") {
    return entries.filter((entry) => inferQuestionHistoryContentType(entry) === scope);
  }
  return entries;
}

function prepareHistory(entries: CooldownHistoryEntry[]): PreparedHistory {
  const firstEntryByQuestionId = new Map<string, CooldownHistoryEntry>();
  for (const entry of entries) {
    if (!firstEntryByQuestionId.has(entry.question_id)) firstEntryByQuestionId.set(entry.question_id, entry);
  }
  const similarityIndex = new QuestionSimilarityIndex(entries.map((entry) => entry.question_text));
  return { entries, similarityIndex, firstEntryByQuestionId };
}

/** An exact question ID match wins; otherwise the earliest entry with the highest similarity at or above the threshold. */
function findMatchingEntry(question: BankQuestion, history: PreparedHistory): CooldownHistoryEntry | null {
  const idMatch = history.firstEntryByQuestionId.get(question.id);
  if (idMatch) return idMatch;

  const similarities = history.similarityIndex.scoreAll(question.question);
  let matchedEntry: CooldownHistoryEntry | null = null;
  let highestSimilarity = 0;
  for (let index = 0; index < history.entries.length; index++) {
    const similarity = similarities[index];
    if (similarity >= SIMILARITY_MATCH_THRESHOLD && similarity > highestSimilarity) {
      highestSimilarity = similarity;
      matchedEntry = history.entries[index];
    }
  }
  return matchedEntry;
}

function withCooldown(
  question: BankQuestion,
  matchedEntry: CooldownHistoryEntry | null,
  options: BankCooldownOptions,
): BankQuestionWithCooldown {
  if (matchedEntry) {
    const elapsedMs = options.nowMs - new Date(matchedEntry.rendered_at).getTime();
    if (elapsedMs < options.cooldownMs) {
      return {
        ...question,
        channel_cooldown: {
          is_cooldown: true,
          days_remaining: Math.max(1, Math.ceil((options.cooldownMs - elapsedMs) / DAY_MS)),
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
 * Builds a channel cooldown calculator that filters and normalizes the channel history once,
 * so scoring many Bank questions costs set lookups instead of repeated text normalization.
 */
export function createBankCooldownCalculator(historyEntries: CooldownHistoryEntry[], options: BankCooldownOptions): BankCooldownCalculator {
  const scopedHistory = filterHistoryByScope(historyEntries, options.scope);
  if (scopedHistory.length === 0) {
    return (question) => ({ ...question, channel_cooldown: { is_cooldown: false, days_remaining: 0 } });
  }
  const history = prepareHistory(scopedHistory);
  return (question) => withCooldown(question, findMatchingEntry(question, history), options);
}
