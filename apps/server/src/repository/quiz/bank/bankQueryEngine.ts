import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, rm } from "node:fs/promises";
import path from "node:path";
import {
  BankQuestionSchema,
  BankSubtopicBatchSchema,
  normalizeLanguageCode,
  type BankIndex,
  type BankQuestion,
  type BankQuestionWithCooldown,
  type BankSubtopicBatch,
} from "@studio/shared";
import { calculateQuestionSimilarity, normalizeQuestionText } from "../../../quiz/qa/questionHistory.js";
import type { RepositoryRuntime } from "../../runtime.js";
import {
  QUESTION_BANK_DIR,
  getQuestionBankPath,
  getQuestionBankWritePath,
} from "./bankPathResolver.js";
import { listQuestionBankBatches } from "./bankBatchStorage.js";
import { recalculateQuestionBankIndex } from "./bankIndexManager.js";

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
export async function queryQuestionBankQuestions(
  this: RepositoryRuntime,
  params: QueryQuestionBankParams = {},
): Promise<{ questions: BankQuestionWithCooldown[]; total: number }> {
  const batches = await listQuestionBankBatches.call(this, {
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

/**
 * Convenience helper to search questions by text keyword across questions, tags, and translations.
 */
export async function searchQuestionBank(
  this: RepositoryRuntime,
  search: string,
  options: Omit<QueryQuestionBankParams, "search"> = {},
): Promise<{ questions: BankQuestionWithCooldown[]; total: number }> {
  return queryQuestionBankQuestions.call(this, { ...options, search });
}

/**
 * Finds a single question in the bank by its unique identifier.
 */
export async function getQuestionBankQuestion(
  this: RepositoryRuntime,
  questionId: string,
  channelId?: string,
): Promise<BankQuestionWithCooldown | null> {
  const result = await queryQuestionBankQuestions.call(this, { channelId, limit: 10000 });
  const found = result.questions.find((q) => q.id === questionId);
  return found || null;
}

/**
 * Validates, normalizes, and upserts a bank question into its corresponding subtopic batch file.
 */
export async function saveQuestionBankQuestion(
  this: RepositoryRuntime,
  question: BankQuestion,
): Promise<BankQuestion> {
  const normalizedQuestion = {
    ...question,
    archetype_id: question.archetype_id === "verdict_fact_myth" ? "verdict_true_false" : question.archetype_id,
  };
  const validated = BankQuestionSchema.parse(normalizedQuestion);
  const batchFilePath = getQuestionBankWritePath.call(
    this,
    validated.archetype_id,
    validated.domain_id,
    `${validated.subtopic_id}.json`,
  );

  let batch: BankSubtopicBatch = {
    schema_version: 2,
    archetype_id: validated.archetype_id,
    domain_id: validated.domain_id,
    subtopic_id: validated.subtopic_id,
    subtopic_title: validated.subtopic_id.replaceAll("_", " "),
    updated_at: new Date().toISOString(),
    questions: [],
  };

  try {
    const existingReadPath = getQuestionBankPath.call(
      this,
      validated.archetype_id,
      validated.domain_id,
      `${validated.subtopic_id}.json`,
    );
    const raw = JSON.parse(await readFile(existingReadPath, "utf8")) as unknown;
    batch = BankSubtopicBatchSchema.parse(raw);
    if (batch.archetype_id === "verdict_fact_myth") {
      batch.archetype_id = "verdict_true_false";
    }
  } catch {
    if (validated.archetype_id === "verdict_true_false") {
      try {
        const legacyReadPath = getQuestionBankPath.call(
          this,
          "verdict_fact_myth",
          validated.domain_id,
          `${validated.subtopic_id}.json`,
        );
        const rawLegacy = JSON.parse(await readFile(legacyReadPath, "utf8")) as unknown;
        batch = BankSubtopicBatchSchema.parse(rawLegacy);
        batch.archetype_id = "verdict_true_false";
      } catch {
        // Fall back to default batch
      }
    }
  }

  const existingIndex = batch.questions.findIndex((q) => q.id === validated.id);
  const now = new Date().toISOString();
  const toSave: BankQuestion = {
    ...validated,
    updated_at: now,
    created_at: validated.created_at || now,
  };

  if (existingIndex >= 0) {
    batch.questions[existingIndex] = toSave;
  } else {
    batch.questions.push(toSave);
  }

  batch.updated_at = now;
  await mkdir(path.dirname(batchFilePath), { recursive: true });
  await this.writeJsonAtomic(batchFilePath, batch);

  if (validated.archetype_id === "verdict_true_false") {
    const legacyPath = getQuestionBankWritePath.call(
      this,
      "verdict_fact_myth",
      validated.domain_id,
      `${validated.subtopic_id}.json`,
    );
    if (existsSync(legacyPath)) {
      await this.writeJsonAtomic(legacyPath, batch);
    }
  }

  // Recalculate index
  await recalculateQuestionBankIndex.call(this);
  return toSave;
}

/**
 * Removes a question from its batch and recalculates index statistics.
 */
export async function deleteQuestionBankQuestion(
  this: RepositoryRuntime,
  questionId: string,
): Promise<boolean> {
  const batches = await listQuestionBankBatches.call(this);
  let foundAndDeleted = false;

  for (const batch of batches) {
    const idx = batch.questions.findIndex((q) => q.id === questionId);
    if (idx >= 0) {
      batch.questions.splice(idx, 1);
      batch.updated_at = new Date().toISOString();

      const candidatePaths = [
        path.join(this.roots.runtime, QUESTION_BANK_DIR, batch.archetype_id, batch.domain_id, `${batch.subtopic_id}.json`),
        path.join(this.rootDirectory, ".quiz-studio", QUESTION_BANK_DIR, batch.archetype_id, batch.domain_id, `${batch.subtopic_id}.json`),
      ];
      if (batch.archetype_id === "verdict_true_false") {
        candidatePaths.push(
          path.join(this.roots.runtime, QUESTION_BANK_DIR, "verdict_fact_myth", batch.domain_id, `${batch.subtopic_id}.json`),
          path.join(this.rootDirectory, ".quiz-studio", QUESTION_BANK_DIR, "verdict_fact_myth", batch.domain_id, `${batch.subtopic_id}.json`),
        );
      }

      for (const filePath of candidatePaths) {
        if (existsSync(filePath)) {
          await this.writeJsonAtomic(filePath, batch);
        }
      }

      foundAndDeleted = true;
    }
  }

  if (foundAndDeleted) {
    await recalculateQuestionBankIndex.call(this);
    return true;
  }

  return false;
}

/**
 * Clears all batches from the question bank directory and resets the index.
 */
export async function clearQuestionBank(
  this: RepositoryRuntime,
): Promise<{ cleared_batches_count: number }> {
  const runtimeBankRoot = path.join(this.roots.runtime, QUESTION_BANK_DIR);
  const defaultProjectRuntime = path.join(this.rootDirectory, ".quiz-studio");
  const isRedirectedRuntime = path.resolve(this.roots.runtime) !== path.resolve(defaultProjectRuntime);

  const candidateRoots: string[] = [runtimeBankRoot];
  if (!isRedirectedRuntime) {
    const projectBankRoot = path.join(defaultProjectRuntime, QUESTION_BANK_DIR);
    if (projectBankRoot !== runtimeBankRoot && existsSync(projectBankRoot)) {
      candidateRoots.push(projectBankRoot);
    }
  }

  let clearedBatchesCount = 0;

  for (const bankRoot of candidateRoots) {
    if (!existsSync(bankRoot)) continue;
    let entries: string[] = [];
    try {
      entries = (await readdir(bankRoot, { withFileTypes: true }))
        .filter((d) => d.isDirectory())
        .map((d) => d.name);
    } catch {
      continue;
    }

    for (const entry of entries) {
      const subDir = path.join(bankRoot, entry);
      try {
        await rm(subDir, { recursive: true, force: true });
        clearedBatchesCount++;
      } catch {
        // Ignored
      }
    }

    const indexPath = path.join(bankRoot, "index.json");
    const emptyIndex: BankIndex = {
      schema_version: 2,
      target_total: 20000,
      current_total: 0,
      by_archetype: {},
      by_domain: {},
      updated_at: new Date().toISOString(),
    };
    try {
      await this.writeJsonAtomic(indexPath, emptyIndex);
    } catch {
      // Ignored
    }
  }

  return { cleared_batches_count: clearedBatchesCount };
}

export const clearAllQuestionBankQuestions = clearQuestionBank;
