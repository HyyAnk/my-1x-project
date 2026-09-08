import { type BankGameplayArchetypeId, type BankQuestion, type TopicCandidate } from "@studio/shared";
import { RepositoryError, type RepositoryService } from "../../repository.js";
import { executeSinglePromptText, type LLMClient } from "../../utils/promptSanitizer.js";
import { retryWithBackoff } from "../../utils/retryWithBackoff.js";
import { ARCHETYPE_GUIDELINES, normalizeGenerationLanguage, parseBatchGenerationOutput } from "./batchGeneratorPrompt.js";
import {
  assembleRetentionArc,
  calculateRelevanceScore,
  calculateVisualScore,
  curateQuestionsForTopic,
  resolveTargetArchetype,
  type ScoredBankQuestion,
} from "./questionCurationEngine.js";

export interface EnsureTopicQuestionsWithJitDeps {
  repository: RepositoryService;
  channelId: string;
  topic: TopicCandidate;
  questionCount?: number;
  targetLanguage?: string;
  llmClient?: LLMClient | null;
  forceIncludeCooldown?: boolean;
}

export interface EnsureTopicQuestionsResult {
  questions: BankQuestion[];
  existingCount: number;
  jitGeneratedCount: number;
  source: "bank_only" | "jit_only" | "hybrid";
  retentionArcApplied: boolean;
}

export function determineMissingDifficulties(existingQuestions: BankQuestion[], targetCount: number): number[] {
  const needed = Math.max(0, targetCount - existingQuestions.length);
  if (needed === 0) return [];

  if (targetCount === 3) {
    if (existingQuestions.length === 0) return [1, 3, 4];
    if (existingQuestions.length === 1) {
      const d = existingQuestions[0].difficulty;
      if (d <= 2) return [3, 4];
      if (d >= 4) return [1, 3];
      return [1, 4];
    }
    const diffs = existingQuestions.map((q) => q.difficulty).sort((a, b) => a - b);
    const hasEasy = diffs.some((d) => d <= 2);
    const hasHard = diffs.some((d) => d >= 4);
    if (hasEasy && hasHard) return [3];
    return hasHard ? [1] : [4];
  }

  const ideal = Array.from({ length: targetCount }, (_, i) =>
    Math.min(5, Math.max(1, Math.round(1 + (i * 4) / Math.max(1, targetCount - 1)))),
  );
  const remaining = [...ideal];
  for (const q of existingQuestions) {
    const idx = remaining.findIndex((id) => Math.abs(id - q.difficulty) <= 1);
    if (idx !== -1) remaining.splice(idx, 1);
    else remaining.shift();
  }
  return remaining.slice(0, needed);
}

export async function generateJitQuestionsWithLLM(
  llmClient: LLMClient,
  topic: TopicCandidate,
  archetypeId: BankGameplayArchetypeId,
  domainId: string,
  subtopicId: string,
  targetDifficulties: number[],
  lang?: string,
): Promise<BankQuestion[]> {
  const generationLanguage = normalizeGenerationLanguage(lang);
  const guideline = ARCHETYPE_GUIDELINES[archetypeId] || ARCHETYPE_GUIDELINES.deep_trivia;
  const prompt = [
    `You are an expert Quiz Designer for YouTube Shorts & TikTok.`,
    `Generate exactly ${targetDifficulties.length} high-retention questions for topic: "${topic.title}".`,
    `Premise: "${topic.premise || topic.title}".`,
    `Hook: "${topic.hook || topic.title}".`,
    `Theme hint: "${topic.theme_hint || topic.title}".`,
    `Archetype: "${archetypeId}" (format: "${guideline.format}", choiceCount: ${guideline.choiceCount}).`,
    `Domain: "${domainId}", Subtopic: "${subtopicId}". Language: "${generationLanguage || "en"}".`,
    `Target difficulties: ${targetDifficulties.join(", ")}.`,
    `Output ONLY a valid JSON array of question objects with fields:`,
    `archetype_id, domain_id, subtopic_id, question, format, choices, correct_choice_id, explanation, fun_fact, visual_spec, difficulty, thinking_seconds, tags.`,
  ].join("\n");

  const raw = await retryWithBackoff(() => executeSinglePromptText(llmClient, prompt, { timeoutMs: 30_000 }), {
    attempts: 3,
    baseDelayMs: 1500,
  });
  const parsed = parseBatchGenerationOutput(raw, {
    archetypeId,
    domainId,
    subtopicId,
    language: generationLanguage,
  });

  return parsed.slice(0, targetDifficulties.length);
}

async function resolveMissingQuestions(
  deps: EnsureTopicQuestionsWithJitDeps,
  archetypeId: BankGameplayArchetypeId,
  domainId: string,
  subtopicId: string,
  missingDiffs: number[],
): Promise<BankQuestion[]> {
  if (!deps.llmClient) {
    return [];
  }

  try {
    const generated = await generateJitQuestionsWithLLM(
      deps.llmClient,
      deps.topic,
      archetypeId,
      domainId,
      subtopicId,
      missingDiffs,
      deps.targetLanguage,
    );
    if (generated.length < missingDiffs.length) {
      console.warn(
        `[questionJitSeeder] LLM returned ${generated.length}/${missingDiffs.length} questions for topic "${deps.topic.title}".`,
      );
    }
    return generated;
  } catch (error) {
    console.warn(
      `[questionJitSeeder] JIT question generation failed for topic "${deps.topic.title}":`,
      error instanceof Error ? error.message : error,
    );
    return [];
  }
}

export async function ensureTopicQuestionsWithJitFallback(deps: EnsureTopicQuestionsWithJitDeps): Promise<EnsureTopicQuestionsResult> {
  const targetCount = deps.questionCount ?? 3;
  const curated = await curateQuestionsForTopic({
    repository: deps.repository,
    channelId: deps.channelId,
    topic: deps.topic,
    questionCount: targetCount,
    targetLanguage: deps.targetLanguage,
    forceIncludeCooldown: deps.forceIncludeCooldown,
  });

  if (curated.missingCount === 0 && curated.selectedQuestions.length >= targetCount) {
    return {
      questions: curated.selectedQuestions.slice(0, targetCount),
      existingCount: targetCount,
      jitGeneratedCount: 0,
      source: "bank_only",
      retentionArcApplied: curated.retentionArcApplied,
    };
  }

  const existingQuestions = curated.selectedQuestions;
  const archetypeId = resolveTargetArchetype(deps.topic) ?? "deep_trivia";
  const domainId = deps.topic.domain_id?.trim() || "nature_animals";
  const subtopicId =
    deps.topic.subtopic_id?.trim() ||
    deps.topic.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 40) ||
    "general";

  const missingDiffs = determineMissingDifficulties(existingQuestions, targetCount);
  const jitQuestions = await resolveMissingQuestions(deps, archetypeId, domainId, subtopicId, missingDiffs);

  const combined = [...existingQuestions, ...jitQuestions];

  if (combined.length < targetCount) {
    throw new RepositoryError(
      `Only ${combined.length}/${targetCount} questions could be resolved for topic "${deps.topic.title}". ` +
        "The question bank has insufficient matches and JIT generation is unavailable or returned too few questions. " +
        "Retry once the LLM engine is reachable, or curate more questions into the bank.",
      "INSUFFICIENT_QUESTIONS",
    );
  }

  if (deps.repository && typeof deps.repository.saveQuestionBankQuestion === "function") {
    for (const q of jitQuestions) {
      try {
        await deps.repository.saveQuestionBankQuestion(q);
      } catch {
        // Safe persistence fallback
      }
    }
  }

  const scoredCombined: ScoredBankQuestion[] = combined.map((q) => ({
    question: q,
    relevanceScore: calculateRelevanceScore(q, deps.topic),
    visualScore: calculateVisualScore(q),
    totalScore: calculateRelevanceScore(q, deps.topic) + calculateVisualScore(q),
  }));

  const { selected, retentionArcApplied } = assembleRetentionArc(scoredCombined, targetCount);

  return {
    questions: selected,
    existingCount: existingQuestions.length,
    jitGeneratedCount: jitQuestions.length,
    source: existingQuestions.length === 0 ? "jit_only" : "hybrid",
    retentionArcApplied,
  };
}
