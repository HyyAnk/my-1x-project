import type { BankQuestion } from "@studio/shared";
import { resolveQuestionHighlightPhrase } from "../../formatting/questionHighlightPhrase.js";
import { executeSinglePromptText, type LLMClient } from "../../../utils/promptSanitizer.js";
import { buildHighlightAnnotationPrompt } from "./highlightAnnotationPrompt.js";
import { parseHighlightAnnotationOutput } from "./highlightAnnotationParser.js";
import type { HighlightAnnotationDeps, HighlightAnnotationResult } from "./highlightAnnotation.types.js";

const DEFAULT_CHUNK_SIZE = 20;
const DEFAULT_MAX_ATTEMPTS = 2;
const DEFAULT_TIMEOUT_MS = 60_000;

/** Returns the question with its stored phrase re-validated: kept in question casing, or dropped when stale. */
export function withValidatedHighlightPhrase(question: BankQuestion): BankQuestion {
  const phrase = resolveQuestionHighlightPhrase(question.question, question.highlight_phrase);
  if (phrase === question.highlight_phrase) return question;
  const { highlight_phrase: _stale, ...rest } = question;
  return phrase ? { ...rest, highlight_phrase: phrase } : rest;
}

export function needsHighlightPhrase(question: BankQuestion): boolean {
  return !resolveQuestionHighlightPhrase(question.question, question.highlight_phrase);
}

function chunk<T>(items: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) chunks.push(items.slice(index, index + size));
  return chunks;
}

async function annotateChunk(subjects: BankQuestion[], deps: HighlightAnnotationDeps): Promise<Map<string, string>> {
  try {
    const rawOutput = await executeSinglePromptText(deps.llmClient, buildHighlightAnnotationPrompt(subjects), {
      modelOverride: deps.modelOverride,
      signal: deps.signal,
      timeoutMs: deps.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    });
    return parseHighlightAnnotationOutput(rawOutput, subjects);
  } catch (error) {
    deps.signal?.throwIfAborted();
    console.warn(`[highlightAnnotation] Chunk of ${subjects.length} questions failed:`, error instanceof Error ? error.message : error);
    return new Map();
  }
}

/**
 * Asks the LLM for the highlight phrase of every question that lacks a valid one. Questions that already
 * carry a valid phrase are never sent. Missing phrases are retried for `maxAttempts` rounds.
 */
export async function annotateHighlightPhrases(
  questions: readonly BankQuestion[],
  deps: HighlightAnnotationDeps,
): Promise<HighlightAnnotationResult> {
  const validated = questions.map(withValidatedHighlightPhrase);
  const found = new Map<string, string>();
  let pending = validated.filter(needsHighlightPhrase);
  for (let attempt = 0; attempt < (deps.maxAttempts ?? DEFAULT_MAX_ATTEMPTS) && pending.length > 0; attempt++) {
    for (const subjects of chunk(pending, deps.chunkSize ?? DEFAULT_CHUNK_SIZE)) {
      for (const [id, phrase] of await annotateChunk(subjects, deps)) found.set(id, phrase);
    }
    pending = pending.filter((question) => !found.has(question.id));
  }
  return {
    questions: validated.map((question) => {
      const phrase = found.get(question.id);
      return phrase ? { ...question, highlight_phrase: phrase } : question;
    }),
    annotatedIds: [...found.keys()],
    unresolvedIds: pending.map((question) => question.id),
  };
}

export type CompleteHighlightPhrasesDeps = Omit<HighlightAnnotationDeps, "llmClient"> & { llmClient?: LLMClient | null };

/**
 * Generation hook: makes freshly generated questions carry a highlight phrase before they are saved.
 * Without an LLM client the existing phrases are only re-validated.
 */
export async function completeHighlightPhrases(
  questions: readonly BankQuestion[],
  deps: CompleteHighlightPhrasesDeps,
): Promise<BankQuestion[]> {
  const { llmClient, ...options } = deps;
  if (!llmClient) return questions.map(withValidatedHighlightPhrase);
  const result = await annotateHighlightPhrases(questions, { ...options, llmClient });
  if (result.unresolvedIds.length > 0) {
    console.warn(`[highlightAnnotation] ${result.unresolvedIds.length} generated questions still lack a highlight phrase.`);
  }
  return result.questions;
}
