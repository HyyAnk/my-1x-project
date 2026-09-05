import {
  BankQuestionSchema,
  bankRequiredChoiceCountForArchetype,
  type BankGameplayArchetypeId,
  type BankQuestion,
  type QuizAgeBand,
  type QuizQuestionFormat,
  type TopicCandidate,
} from "@studio/shared";
import type { RepositoryService } from "../../repository.js";
import { executeSinglePromptText, type LLMClient } from "../../utils/promptSanitizer.js";
import { ARCHETYPE_GUIDELINES, parseBatchGenerationOutput } from "./batchGeneratorPrompt.js";
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

export function normalizeAgeBand(band?: string): QuizAgeBand {
  if (band === "4-6" || band === "7-9" || band === "10-12" || band === "family") {
    return band;
  }
  if (band === "kids") return "7-9";
  return "family";
}

function makeJitFallbackQuestion(
  topic: TopicCandidate,
  archetypeId: BankGameplayArchetypeId,
  domainId: string,
  subtopicId: string,
  difficulty: number,
  index: number,
  lang?: string,
): BankQuestion {
  const isVerdict = archetypeId === "verdict_true_false" || archetypeId === "verdict_fact_myth";
  const isVersus = archetypeId === "versus_faceoff";
  const format: QuizQuestionFormat = isVerdict
    ? "true_false"
    : archetypeId === "visual_spotting"
      ? "odd_one_out"
      : "multiple_choice";
  const count = bankRequiredChoiceCountForArchetype(archetypeId);
  const now = new Date().toISOString();

  let questionText = `${topic.title}: key question #${index + 1}?`;
  if (index === 0 && topic.hook) {
    questionText = topic.hook.length > 75 ? `${topic.hook.slice(0, 72)}...` : topic.hook;
  } else if (topic.premise) {
    const descriptor = difficulty <= 2 ? "core fact" : difficulty <= 3 ? "challenge fact" : "climax fact";
    questionText = `${topic.title}: ${descriptor}?`;
  }
  if (isVerdict && !questionText.toLowerCase().includes("true or false")) {
    questionText = `${questionText.replace(/\?*$/, "")}. True or False?`;
  }

  const choices = isVerdict
    ? [
        { id: "A", text: "True", is_correct: index % 2 === 0 },
        { id: "B", text: "False", is_correct: index % 2 !== 0 },
      ]
    : isVersus
      ? [
          { id: "A", text: `${topic.title} Contender A`, is_correct: true },
          { id: "B", text: `${topic.title} Contender B`, is_correct: false },
        ]
      : [
          { id: "A", text: `${topic.title} Choice A`, is_correct: true },
          { id: "B", text: `${topic.title} Choice B`, is_correct: false },
          { id: "C", text: `${topic.title} Choice C`, is_correct: false },
        ];

  const visualIntent = archetypeId === "speed_blitz" ? "none" : "question_illustration";
  const candidate: BankQuestion = {
    id: `JIT-${archetypeId.slice(0, 3).toUpperCase()}-${domainId.slice(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
    archetype_id: archetypeId,
    domain_id: domainId,
    subtopic_id: subtopicId,
    language: lang || "en",
    question: questionText,
    format,
    choices: choices.slice(0, count),
    correct_choice_id: choices.find((c) => c.is_correct)?.id ?? "A",
    explanation: `${topic.title} is verified through scientific and historical evidence.`,
    fun_fact: `Surprising bonus insight regarding ${topic.title} in ${domainId}.`,
    visual_spec: {
      intent: visualIntent,
      prompt: `Cinematic 8k photograph illustrating ${topic.title}, dramatic lighting`,
      aspect_ratio: "16:9",
    },
    age_band: normalizeAgeBand(topic.age_band),
    difficulty,
    thinking_seconds: ARCHETYPE_GUIDELINES[archetypeId]?.defaultThinkingSeconds ?? 5,
    tags: [subtopicId, archetypeId, domainId],
    status: "approved",
    created_at: now,
    updated_at: now,
  };

  return BankQuestionSchema.parse(candidate);
}

export function generateJitQuestionsFallback(
  topic: TopicCandidate,
  archetypeId: BankGameplayArchetypeId,
  domainId: string,
  subtopicId: string,
  targetDifficulties: number[],
  lang?: string,
): BankQuestion[] {
  return targetDifficulties.map((diff, idx) =>
    makeJitFallbackQuestion(topic, archetypeId, domainId, subtopicId, diff, idx, lang),
  );
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
  const guideline = ARCHETYPE_GUIDELINES[archetypeId] || ARCHETYPE_GUIDELINES.deep_trivia;
  const prompt = [
    `You are an expert Quiz Designer for YouTube Shorts & TikTok.`,
    `Generate exactly ${targetDifficulties.length} high-retention questions for topic: "${topic.title}".`,
    `Premise: "${topic.premise || topic.title}".`,
    `Hook: "${topic.hook || topic.title}".`,
    `Theme hint: "${topic.theme_hint || topic.title}".`,
    `Archetype: "${archetypeId}" (format: "${guideline.format}", choiceCount: ${guideline.choiceCount}).`,
    `Domain: "${domainId}", Subtopic: "${subtopicId}". Language: "${lang || "en"}".`,
    `Target difficulties: ${targetDifficulties.join(", ")}.`,
    `Output ONLY a valid JSON array of question objects with fields:`,
    `archetype_id, domain_id, subtopic_id, question, format, choices, correct_choice_id, explanation, fun_fact, visual_spec, difficulty, thinking_seconds, tags.`,
  ].join("\n");

  const raw = await executeSinglePromptText(llmClient, prompt, { timeoutMs: 30_000 });
  const parsed = parseBatchGenerationOutput(raw, {
    archetypeId,
    domainId,
    subtopicId,
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
  let generated: BankQuestion[] = [];
  if (deps.llmClient) {
    try {
      generated = await generateJitQuestionsWithLLM(
        deps.llmClient,
        deps.topic,
        archetypeId,
        domainId,
        subtopicId,
        missingDiffs,
        deps.targetLanguage,
      );
    } catch {
      generated = [];
    }
  }

  if (generated.length < missingDiffs.length) {
    const neededDiffs = missingDiffs.slice(generated.length);
    const fallback = generateJitQuestionsFallback(
      deps.topic,
      archetypeId,
      domainId,
      subtopicId,
      neededDiffs,
      deps.targetLanguage,
    );
    generated = [...generated, ...fallback];
  }

  return generated;
}

export async function ensureTopicQuestionsWithJitFallback(
  deps: EnsureTopicQuestionsWithJitDeps,
): Promise<EnsureTopicQuestionsResult> {
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
    deps.topic.title.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40) ||
    "general";

  const missingDiffs = determineMissingDifficulties(existingQuestions, targetCount);
  const jitQuestions = await resolveMissingQuestions(deps, archetypeId, domainId, subtopicId, missingDiffs);

  if (deps.repository && typeof deps.repository.saveQuestionBankQuestion === "function") {
    for (const q of jitQuestions) {
      try {
        await deps.repository.saveQuestionBankQuestion(q);
      } catch {
        // Safe persistence fallback
      }
    }
  }

  const combined = [...existingQuestions, ...jitQuestions];
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
