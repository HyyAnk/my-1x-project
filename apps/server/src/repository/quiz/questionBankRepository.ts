import { mkdir, readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import {
  BankIndexSchema,
  BankQuestionSchema,
  BankSubtopicBatchSchema,
  BankTaxonomySchema,
  BankTranslationContentSchema,
  normalizeLanguageCode,
  type BankIndex,
  type BankQuestion,
  type BankQuestionWithCooldown,
  type BankSubtopicBatch,
  type BankTaxonomy,
  type BankTranslationContent,
} from "@studio/shared";
import { calculateQuestionSimilarity, normalizeQuestionText } from "../../quiz/qa/questionHistory.js";
import type { RepositoryRuntime } from "../runtime.js";

const QUESTION_BANK_DIR = "question_bank";
const COOLDOWN_DAYS_DEFAULT = 30;

export function getQuestionBankPath(this: RepositoryRuntime, ...segments: string[]): string {
  const runtimePath = path.join(this.roots.runtime, QUESTION_BANK_DIR, ...segments);
  if (existsSync(runtimePath)) return runtimePath;
  const projectPath = path.join(this.rootDirectory, ".quiz-studio", QUESTION_BANK_DIR, ...segments);
  if (existsSync(projectPath)) return projectPath;
  return runtimePath;
}

export function getQuestionBankWritePath(this: RepositoryRuntime, ...segments: string[]): string {
  const runtimeBank = path.join(this.roots.runtime, QUESTION_BANK_DIR);
  const projectBank = path.join(this.rootDirectory, ".quiz-studio", QUESTION_BANK_DIR);
  if (existsSync(runtimeBank)) return path.join(runtimeBank, ...segments);
  if (existsSync(projectBank)) return path.join(projectBank, ...segments);
  return path.join(runtimeBank, ...segments);
}

export async function readQuestionBankTaxonomy(this: RepositoryRuntime): Promise<BankTaxonomy> {
  const taxonomyPath = getQuestionBankPath.call(this, "taxonomy.json");
  try {
    const raw = JSON.parse(await readFile(taxonomyPath, "utf8")) as unknown;
    return BankTaxonomySchema.parse(raw);
  } catch {
    return {
      schema_version: 2,
      updated_at: new Date().toISOString(),
      domains: [],
    };
  }
}

export async function readQuestionBankIndex(this: RepositoryRuntime): Promise<BankIndex> {
  const indexPath = getQuestionBankPath.call(this, "index.json");
  try {
    const raw = JSON.parse(await readFile(indexPath, "utf8")) as unknown;
    const parsed = BankIndexSchema.parse(raw);
    if (parsed.current_total > 0) {
      return parsed;
    }
  } catch {
    // Missing or invalid
  }

  try {
    return await recalculateQuestionBankIndex.call(this);
  } catch {
    return {
      schema_version: 2,
      target_total: 10000,
      current_total: 0,
      by_archetype: {},
      by_domain: {},
      updated_at: new Date().toISOString(),
    };
  }
}

export async function listQuestionBankBatches(
  this: RepositoryRuntime,
  filter?: { archetypeId?: string; domainId?: string },
): Promise<BankSubtopicBatch[]> {
  const candidateRoots = new Set<string>();
  candidateRoots.add(path.join(this.roots.runtime, QUESTION_BANK_DIR));
  candidateRoots.add(path.join(this.rootDirectory, ".quiz-studio", QUESTION_BANK_DIR));

  const batchesMap = new Map<string, BankSubtopicBatch>();

  for (const bankRoot of candidateRoots) {
    let archetypeDirs: string[] = [];
    try {
      archetypeDirs = (await readdir(bankRoot, { withFileTypes: true }))
        .filter((d) => d.isDirectory())
        .map((d) => d.name);
    } catch {
      continue;
    }

    for (const archDir of archetypeDirs) {
      if (filter?.archetypeId && archDir !== filter.archetypeId) continue;
      const archPath = path.join(bankRoot, archDir);

      let domainDirs: string[] = [];
      try {
        domainDirs = (await readdir(archPath, { withFileTypes: true }))
          .filter((d) => d.isDirectory())
          .map((d) => d.name);
      } catch {
        continue;
      }

      for (const domDir of domainDirs) {
        if (filter?.domainId && domDir !== filter.domainId) continue;
        const domPath = path.join(archPath, domDir);

        let batchFiles: string[] = [];
        try {
          batchFiles = (await readdir(domPath, { withFileTypes: true }))
            .filter((f) => f.isFile() && f.name.endsWith(".json"))
            .map((f) => f.name);
        } catch {
          continue;
        }

        for (const file of batchFiles) {
          const filePath = path.join(domPath, file);
          try {
            const content = JSON.parse(await readFile(filePath, "utf8")) as unknown;
            const parsed = BankSubtopicBatchSchema.safeParse(content);
            if (parsed.success) {
              const key = `${parsed.data.archetype_id}:${parsed.data.domain_id}:${parsed.data.subtopic_id}`;
              if (!batchesMap.has(key)) {
                batchesMap.set(key, parsed.data);
              }
            }
          } catch {
            // Ignore unparseable files
          }
        }
      }
    }
  }

  return Array.from(batchesMap.values());
}

export async function recalculateQuestionBankIndex(this: RepositoryRuntime): Promise<BankIndex> {
  const batches = await listQuestionBankBatches.call(this);
  const by_archetype: Record<string, number> = {};
  const by_domain: Record<string, number> = {};
  let current_total = 0;

  for (const batch of batches) {
    const qCount = batch.questions.length;
    current_total += qCount;
    by_archetype[batch.archetype_id] = (by_archetype[batch.archetype_id] || 0) + qCount;
    by_domain[batch.domain_id] = (by_domain[batch.domain_id] || 0) + qCount;
  }

  let target_total = 10000;
  try {
    const prevPath = getQuestionBankPath.call(this, "index.json");
    const raw = JSON.parse(await readFile(prevPath, "utf8")) as Record<string, unknown>;
    if (typeof raw?.target_total === "number" && raw.target_total > 0) {
      target_total = raw.target_total;
    }
  } catch {
    // Default to 10000
  }

  const updatedIndex: BankIndex = {
    schema_version: 2,
    target_total,
    current_total,
    by_archetype,
    by_domain,
    updated_at: new Date().toISOString(),
  };

  const indexPath = getQuestionBankWritePath.call(this, "index.json");
  await mkdir(path.dirname(indexPath), { recursive: true });
  await this.writeJsonAtomic(indexPath, updatedIndex);
  return updatedIndex;
}


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

  const total = filtered.length;
  const offset = params.offset || 0;
  const limit = params.limit || 50;
  const paginated = filtered.slice(offset, offset + limit);

  return { questions: paginated, total };
}

export async function getQuestionBankQuestion(
  this: RepositoryRuntime,
  questionId: string,
  channelId?: string,
): Promise<BankQuestionWithCooldown | null> {
  const result = await queryQuestionBankQuestions.call(this, { channelId, limit: 10000 });
  const found = result.questions.find((q) => q.id === questionId);
  return found || null;
}

export async function saveQuestionBankQuestion(
  this: RepositoryRuntime,
  question: BankQuestion,
): Promise<BankQuestion> {
  const validated = BankQuestionSchema.parse(question);
  const batchFilePath = getQuestionBankWritePath.call(
    this,
    validated.archetype_id,
    validated.domain_id,
    `${validated.subtopic_id}.json`,
  );

  let batch: BankSubtopicBatch;
  try {
    const existingReadPath = getQuestionBankPath.call(
      this,
      validated.archetype_id,
      validated.domain_id,
      `${validated.subtopic_id}.json`,
    );
    const raw = JSON.parse(await readFile(existingReadPath, "utf8")) as unknown;
    batch = BankSubtopicBatchSchema.parse(raw);
  } catch {
    batch = {
      schema_version: 2,
      archetype_id: validated.archetype_id,
      domain_id: validated.domain_id,
      subtopic_id: validated.subtopic_id,
      subtopic_title: validated.subtopic_id.replaceAll("_", " "),
      updated_at: new Date().toISOString(),
      questions: [],
    };
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

  // Recalculate index
  await recalculateQuestionBankIndex.call(this);
  return toSave;
}

export async function saveQuestionBankTranslation(
  this: RepositoryRuntime,
  questionId: string,
  translation: BankTranslationContent,
): Promise<BankQuestion | null> {
  const validatedTranslation = BankTranslationContentSchema.parse(translation);
  const normLang = normalizeLanguageCode(validatedTranslation.language);

  const batches = await listQuestionBankBatches.call(this);
  for (const batch of batches) {
    const qIndex = batch.questions.findIndex((q) => q.id === questionId);
    if (qIndex >= 0) {
      const question = batch.questions[qIndex];
      const now = new Date().toISOString();
      const existingTranslations = question.translations || {};

      const updatedQuestion: BankQuestion = {
        ...question,
        translations: {
          ...existingTranslations,
          [normLang]: {
            ...validatedTranslation,
            language: normLang,
            translated_at: validatedTranslation.translated_at || now,
          },
        },
        updated_at: now,
      };

      batch.questions[qIndex] = updatedQuestion;
      batch.updated_at = now;

      const batchFilePath = getQuestionBankWritePath.call(
        this,
        batch.archetype_id,
        batch.domain_id,
        `${batch.subtopic_id}.json`,
      );
      await mkdir(path.dirname(batchFilePath), { recursive: true });
      await this.writeJsonAtomic(batchFilePath, batch);

      return updatedQuestion;
    }
  }

  return null;
}

export async function deleteQuestionBankQuestion(
  this: RepositoryRuntime,
  questionId: string,
): Promise<boolean> {
  const batches = await listQuestionBankBatches.call(this);
  for (const batch of batches) {
    const idx = batch.questions.findIndex((q) => q.id === questionId);
    if (idx >= 0) {
      batch.questions.splice(idx, 1);
      batch.updated_at = new Date().toISOString();
      const batchFilePath = getQuestionBankPath.call(
        this,
        batch.archetype_id,
        batch.domain_id,
        `${batch.subtopic_id}.json`,
      );
      await this.writeJsonAtomic(batchFilePath, batch);
      await recalculateQuestionBankIndex.call(this);
      return true;
    }
  }
  return false;
}
