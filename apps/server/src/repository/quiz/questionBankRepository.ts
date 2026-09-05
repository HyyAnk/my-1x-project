import { mkdir, readdir, readFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import {
  BankIndexSchema,
  BankQuestionSchema,
  BankSubtopicBatchSchema,
  BankTaxonomySchema,
  BankTranslationContentSchema,
  normalizeLanguageCode,
  type BankDomainMeta,
  type BankIndex,
  type BankQuestion,
  type BankQuestionWithCooldown,
  type BankSubtopicBatch,
  type BankTaxonomy,
  type BankTranslationContent,
  type MatrixCoverageStats,
} from "@studio/shared";
import { calculateQuestionSimilarity, normalizeQuestionText } from "../../quiz/qa/questionHistory.js";
import { calculateMatrixCoverageStats } from "../../quiz/bank/matrixCoverageService.js";
import type { RepositoryRuntime } from "../runtime.js";

const QUESTION_BANK_DIR = "question_bank";
const COOLDOWN_DAYS_DEFAULT = 30;

export function getQuestionBankPath(this: RepositoryRuntime, ...segments: string[]): string {
  const runtimePath = path.join(this.roots.runtime, QUESTION_BANK_DIR, ...segments);
  if (existsSync(runtimePath)) return runtimePath;

  const defaultProjectRuntime = path.join(this.rootDirectory, ".quiz-studio");
  const isRedirectedRuntime = path.resolve(this.roots.runtime) !== path.resolve(defaultProjectRuntime);

  if (isRedirectedRuntime) {
    if (segments[0] === "taxonomy.json") {
      const projectPath = path.join(defaultProjectRuntime, QUESTION_BANK_DIR, ...segments);
      if (existsSync(projectPath)) return projectPath;
    }
    return runtimePath;
  }

  const projectPath = path.join(defaultProjectRuntime, QUESTION_BANK_DIR, ...segments);
  if (existsSync(projectPath)) return projectPath;
  return runtimePath;
}

export function getQuestionBankWritePath(this: RepositoryRuntime, ...segments: string[]): string {
  const runtimeBank = path.join(this.roots.runtime, QUESTION_BANK_DIR);
  const defaultProjectRuntime = path.join(this.rootDirectory, ".quiz-studio");
  const isRedirectedRuntime = path.resolve(this.roots.runtime) !== path.resolve(defaultProjectRuntime);

  if (isRedirectedRuntime) {
    return path.join(runtimeBank, ...segments);
  }

  const projectBank = path.join(defaultProjectRuntime, QUESTION_BANK_DIR);
  if (existsSync(projectBank)) return path.join(projectBank, ...segments);
  return path.join(runtimeBank, ...segments);
}

export const CANONICAL_DOMAIN_META: Record<string, { title: string; description: string; icon: string }> = {
  careers_occupations: {
    title: "Careers & Occupations",
    description: "Professions, skilled trades, emergency services, and extreme careers.",
    icon: "Briefcase",
  },
  countries_nations: {
    title: "Countries & Nations",
    description: "World geography, iconic landmarks, flags, and cultural heritage.",
    icon: "Globe",
  },
  food_gastronomy: {
    title: "Food & Gastronomy",
    description: "Culinary traditions, global cuisine, pastries, ingredients, and street food.",
    icon: "Utensils",
  },
  human_body: {
    title: "Human Body & Biology",
    description: "Anatomy, biological systems, senses, organs, and physiology.",
    icon: "Heart",
  },
  mythology_creatures: {
    title: "Mythology & Creatures",
    description: "Mythological pantheons, legendary beasts, folklore, and epic lore.",
    icon: "Flame",
  },
  nature_animals: {
    title: "Nature & Animals",
    description: "Wildlife, animal superpowers, marine ecosystems, and biodiversity.",
    icon: "PawPrint",
  },
  pop_culture_classics: {
    title: "Pop Culture & Classics",
    description: "Cinema legends, animation, gaming icons, classic literature, and art.",
    icon: "Film",
  },
  space_earth: {
    title: "Space & Earth",
    description: "Cosmic wonders, astronomy, planetary science, and natural phenomena.",
    icon: "Compass",
  },
  vehicles_technology: {
    title: "Vehicles & Technology",
    description: "Aviation, automotive, robotics, computing breakthroughs, and transport.",
    icon: "Cpu",
  },
};

function formatTitleFromId(id: string): string {
  return id
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export async function syncTaxonomyFromKnowledgeBase(runtime: RepositoryRuntime): Promise<BankDomainMeta[]> {
  const candidateDirs = [
    path.join(runtime.rootDirectory, ".quiz-studio", "knowledge_base", "entities"),
    path.join(runtime.roots.runtime, "knowledge_base", "entities"),
  ];

  let entitiesDir = candidateDirs[0];
  for (const dir of candidateDirs) {
    if (existsSync(dir)) {
      entitiesDir = dir;
      break;
    }
  }

  if (!existsSync(entitiesDir)) {
    return [];
  }

  let files: string[] = [];
  try {
    files = (await readdir(entitiesDir, { withFileTypes: true }))
      .filter((f) => f.isFile() && f.name.endsWith(".json"))
      .map((f) => f.name);
  } catch {
    return [];
  }

  const domainMap = new Map<
    string,
    {
      id: string;
      title: string;
      description: string;
      icon: string;
      subtopicsMap: Map<string, { id: string; title: string; description: string }>;
    }
  >();

  for (const file of files) {
    const defaultDomainId = path.basename(file, ".json");
    const filePath = path.join(entitiesDir, file);
    try {
      const content = JSON.parse(await readFile(filePath, "utf8"));
      if (!Array.isArray(content)) continue;

      for (const ent of content) {
        const domainId = (typeof ent.domain_id === "string" && ent.domain_id.trim()) || defaultDomainId;
        if (!domainMap.has(domainId)) {
          const canonical = CANONICAL_DOMAIN_META[domainId];
          domainMap.set(domainId, {
            id: domainId,
            title: canonical?.title || formatTitleFromId(domainId),
            description: canonical?.description || `Questions and concepts covering ${formatTitleFromId(domainId)}.`,
            icon: canonical?.icon || "Sparkle",
            subtopicsMap: new Map(),
          });
        }

        const domainEntry = domainMap.get(domainId)!;
        if (typeof ent.subtopic_id === "string" && ent.subtopic_id.trim()) {
          const subId = ent.subtopic_id.trim();
          if (!domainEntry.subtopicsMap.has(subId)) {
            domainEntry.subtopicsMap.set(subId, {
              id: subId,
              title: formatTitleFromId(subId),
              description: "",
            });
          }
        }
      }
    } catch {
      // Ignore unparseable or inaccessible files
    }
  }

  return Array.from(domainMap.values()).map((d) => ({
    id: d.id,
    title: d.title,
    description: d.description,
    icon: d.icon,
    subtopics: Array.from(d.subtopicsMap.values()),
  }));
}

export async function readQuestionBankTaxonomy(this: RepositoryRuntime): Promise<BankTaxonomy> {
  const dynamicDomains = await syncTaxonomyFromKnowledgeBase(this);

  const taxonomyPath = getQuestionBankPath.call(this, "taxonomy.json");
  let fileTaxonomy: BankTaxonomy | null = null;
  try {
    const raw = JSON.parse(await readFile(taxonomyPath, "utf8")) as unknown;
    fileTaxonomy = BankTaxonomySchema.parse(raw);
  } catch {
    fileTaxonomy = null;
  }

  const mergedDomainsMap = new Map<string, BankDomainMeta>();

  for (const dom of dynamicDomains) {
    mergedDomainsMap.set(dom.id, { ...dom });
  }

  if (fileTaxonomy) {
    for (const fileDom of fileTaxonomy.domains) {
      if (mergedDomainsMap.has(fileDom.id)) {
        const existing = mergedDomainsMap.get(fileDom.id)!;
        const subMap = new Map(existing.subtopics.map((s) => [s.id, s]));
        for (const s of fileDom.subtopics) {
          if (!subMap.has(s.id)) {
            subMap.set(s.id, s);
          } else {
            const currSub = subMap.get(s.id)!;
            subMap.set(s.id, {
              id: s.id,
              title: currSub.title || s.title,
              description: s.description || currSub.description,
            });
          }
        }
        mergedDomainsMap.set(fileDom.id, {
          id: fileDom.id,
          title: fileDom.title || existing.title,
          description: fileDom.description || existing.description,
          icon: fileDom.icon || existing.icon,
          subtopics: Array.from(subMap.values()),
        });
      } else if (dynamicDomains.length === 0) {
        mergedDomainsMap.set(fileDom.id, fileDom);
      }
    }
  }

  const domains = Array.from(mergedDomainsMap.values());

  return {
    schema_version: 2,
    updated_at: new Date().toISOString(),
    domains,
  };
}

export async function readQuestionBankIndex(this: RepositoryRuntime): Promise<BankIndex> {
  const indexPath = getQuestionBankPath.call(this, "index.json");
  try {
    const raw = JSON.parse(await readFile(indexPath, "utf8")) as unknown;
    const parsed = BankIndexSchema.parse(raw);
    if (parsed.current_total > 0) {
      return {
        ...parsed,
        target_total: parsed.target_total >= 20000 ? parsed.target_total : 20000,
      };
    }
  } catch {
    // Missing or invalid
  }

  try {
    return await recalculateQuestionBankIndex.call(this);
  } catch {
    return {
      schema_version: 2,
      target_total: 20000,
      current_total: 0,
      by_archetype: {},
      by_domain: {},
      updated_at: new Date().toISOString(),
    };
  }
}

function matchesArchetypeFilter(dirArchetype: string, filterArchetype?: string): boolean {
  if (!filterArchetype) return true;
  if (dirArchetype === filterArchetype) return true;
  if (
    (filterArchetype === "verdict_true_false" || filterArchetype === "verdict_fact_myth") &&
    (dirArchetype === "verdict_true_false" || dirArchetype === "verdict_fact_myth")
  ) {
    return true;
  }
  return false;
}

export async function listQuestionBankBatches(
  this: RepositoryRuntime,
  filter?: { archetypeId?: string; domainId?: string },
): Promise<BankSubtopicBatch[]> {
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

  const batchesMap = new Map<string, { data: BankSubtopicBatch; isRuntime: boolean; archDir: string }>();

  for (const bankRoot of candidateRoots) {
    const isRuntime = bankRoot === runtimeBankRoot;
    let archetypeDirs: string[] = [];
    try {
      archetypeDirs = (await readdir(bankRoot, { withFileTypes: true }))
        .filter((d) => d.isDirectory())
        .map((d) => d.name);
    } catch {
      continue;
    }

    for (const archDir of archetypeDirs) {
      if (!matchesArchetypeFilter(archDir, filter?.archetypeId)) continue;
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
              const data = parsed.data;
              if (data.archetype_id === "verdict_fact_myth") {
                data.archetype_id = "verdict_true_false";
              }
              data.questions = data.questions.map((q) => {
                if (q.archetype_id === "verdict_fact_myth") {
                  return { ...q, archetype_id: "verdict_true_false" };
                }
                return q;
              });
              const key = `${data.archetype_id}:${data.domain_id}:${data.subtopic_id}`;
              const existing = batchesMap.get(key);
              if (!existing) {
                batchesMap.set(key, { data, isRuntime, archDir });
              } else if (isRuntime && !existing.isRuntime) {
                batchesMap.set(key, { data, isRuntime, archDir });
              } else if (isRuntime === existing.isRuntime && archDir === "verdict_true_false" && existing.archDir !== "verdict_true_false") {
                batchesMap.set(key, { data, isRuntime, archDir });
              }
            }
          } catch {
            // Ignore unparseable files
          }
        }
      }
    }
  }

  return Array.from(batchesMap.values()).map((v) => v.data);
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
    if (batch.archetype_id === "verdict_true_false") {
      by_archetype.verdict_fact_myth = (by_archetype.verdict_fact_myth || 0) + qCount;
    }
    by_domain[batch.domain_id] = (by_domain[batch.domain_id] || 0) + qCount;
  }

  let target_total = 20000;
  try {
    const prevPath = getQuestionBankPath.call(this, "index.json");
    const raw = JSON.parse(await readFile(prevPath, "utf8")) as Record<string, unknown>;
    if (typeof raw?.target_total === "number" && raw.target_total >= 20000) {
      target_total = raw.target_total;
    }
  } catch {
    // Default to 20000
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

  if (params.archetypeId === "verdict_fact_myth") {
    allQuestions = allQuestions.map((q) => {
      if (q.archetype_id === "verdict_true_false") {
        return { ...q, archetype_id: "verdict_fact_myth" as any };
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

      if (batch.archetype_id === "verdict_true_false") {
        const legacyPath = getQuestionBankWritePath.call(
          this,
          "verdict_fact_myth",
          batch.domain_id,
          `${batch.subtopic_id}.json`,
        );
        if (existsSync(legacyPath)) {
          await this.writeJsonAtomic(legacyPath, batch);
        }
      }

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

export async function getQuestionBankMatrixCoverage(
  this: RepositoryRuntime,
): Promise<MatrixCoverageStats> {
  const batches = await listQuestionBankBatches.call(this);
  const questions: BankQuestion[] = [];
  for (const batch of batches) {
    questions.push(...batch.questions);
  }
  return calculateMatrixCoverageStats(questions);
}
