import { BankQuestionSchema, type BankGameplayArchetypeId, type BankQuestion } from "@studio/shared";
import { ARCHETYPE_GUIDELINES } from "./archetypePromptGuidelines.js";
import { sanitizeBankQuestionText } from "./bankQuestionSanitizer.js";
import { normalizeGenerationLanguage } from "./bankLanguageValidator.js";
import type { TargetEntityForGeneration } from "./reverseMatrixPromptBuilder.js";

export { sanitizeBankQuestionText } from "./bankQuestionSanitizer.js";
export { normalizeGenerationLanguage, VIETNAMESE_LANGUAGE_CODES } from "./bankLanguageValidator.js";

interface RawChoice {
  id?: string;
  text?: string;
  is_correct?: boolean;
  explanation?: string;
  [key: string]: unknown;
}

interface BuildQuestionOptions {
  item: Record<string, unknown>;
  archetypeId: BankGameplayArchetypeId;
  domainId: string;
  subtopicId: string;
  entityId?: string;
  difficulty?: number;
  ageBand?: "kids" | "family" | "teen" | "mature";
  generationLanguage?: string;
  expectedChoiceCount: number;
  distractorPool?: string[];
  now: string;
  isReverse?: boolean;
}

function makeUniqueBankId(archetypeId: string, domainId: string, subtopicId: string): string {
  const prefix = `${archetypeId.slice(0, 3)}-${domainId.slice(0, 3)}-${subtopicId.slice(0, 3)}`.toUpperCase();
  return `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
}

function warnUnparseableOutput(context: string, rawOutput: string): void {
  console.warn(`[batchPromptOutputParser] Unparseable LLM output (${context}). Output tail: ${rawOutput.slice(-400)}`);
}

function extractJsonArray(rawOutput: string, context: string): Record<string, unknown>[] | null {
  let cleaned = rawOutput.trim();
  const jsonMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (jsonMatch) cleaned = jsonMatch[1].trim();

  let items: unknown;
  try {
    items = JSON.parse(cleaned);
  } catch {
    const arrayMatch = cleaned.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (!arrayMatch) {
      warnUnparseableOutput(context, rawOutput);
      return null;
    }
    try {
      items = JSON.parse(arrayMatch[0]);
    } catch {
      warnUnparseableOutput(context, rawOutput);
      return null;
    }
  }

  const list = Array.isArray(items) ? items : (items as { questions?: unknown[] })?.questions;
  if (!Array.isArray(list)) {
    warnUnparseableOutput(context, rawOutput);
    return null;
  }

  return list.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null);
}

function normalizeChoices(
  rawChoices: unknown,
  expectedCount: number,
  correctChoiceId?: unknown,
  distractorPool?: string[],
): RawChoice[] | undefined {
  if (!Array.isArray(rawChoices)) return undefined;
  const choices = rawChoices.filter((c): c is RawChoice => typeof c === "object" && c !== null);

  if (choices.length > expectedCount) {
    const correct = choices.find((c) => c.id === correctChoiceId || c.is_correct === true);
    const distractors = choices.filter((c) => c !== correct);
    return correct ? [correct, ...distractors.slice(0, expectedCount - 1)] : choices.slice(0, expectedCount);
  }

  if (choices.length < expectedCount) {
    const result = [...choices];
    while (result.length < expectedCount) {
      const nextId = String.fromCharCode(65 + result.length);
      const pool = distractorPool?.find((d) => !result.some((c) => c.text === d));
      result.push({
        id: nextId,
        text: pool || (distractorPool ? `Option ${nextId}` : `Alternative ${nextId}`),
        is_correct: false,
      });
    }
    return result;
  }

  return choices;
}

function normalizeVisualSpec(visualSpec: unknown): Record<string, unknown> | undefined {
  if (!visualSpec || typeof visualSpec !== "object") return undefined;
  const vs = { ...(visualSpec as Record<string, unknown>) };
  if (vs.intent !== "choice_illustration" && vs.intent !== "none") vs.intent = "question_illustration";
  return vs;
}

function buildAndValidateBankQuestion(opts: BuildQuestionOptions): BankQuestion | null {
  const { item } = opts;
  const rawQuestion = typeof item.question === "string" ? item.question : "";
  const rawChoices = Array.isArray(item.choices)
    ? item.choices.filter(
        (c): c is { text: string } => typeof c === "object" && c !== null && typeof (c as { text?: unknown }).text === "string",
      )
    : [];
  const sanitizedQuestion = sanitizeBankQuestionText(rawQuestion, opts.archetypeId, rawChoices);

  if (opts.archetypeId === "mystery_reveal" && (!Array.isArray(item.choices) || item.choices.length !== 1)) {
    const prefix = opts.isReverse ? "Reverse mystery reveal" : "Mystery reveal";
    console.warn(
      `[batchPromptOutputParser] ${prefix} question rejected: expected exactly 1 choice, got ${Array.isArray(item.choices) ? item.choices.length : 0}`,
    );
    return null;
  }

  const normalizedChoices =
    opts.archetypeId === "mystery_reveal"
      ? item.choices
      : normalizeChoices(item.choices, opts.expectedChoiceCount, item.correct_choice_id, opts.distractorPool);

  const candidate: Record<string, unknown> = {
    ...item,
    question: sanitizedQuestion,
    choices: normalizedChoices ?? item.choices,
    id: typeof item.id === "string" && item.id.trim() ? item.id.trim() : makeUniqueBankId(opts.archetypeId, opts.domainId, opts.subtopicId),
    entity_id: opts.entityId,
    archetype_id: opts.archetypeId,
    domain_id: opts.domainId,
    subtopic_id: opts.subtopicId,
    status: "approved",
    difficulty: typeof item.difficulty === "number" ? item.difficulty : (opts.difficulty ?? 2),
    age_band: typeof item.age_band === "string" ? item.age_band : (opts.ageBand ?? "family"),
    created_at: opts.now,
    updated_at: opts.now,
    ...(opts.generationLanguage ? { language: opts.generationLanguage } : {}),
  };

  const visualSpec = normalizeVisualSpec(candidate.visual_spec);
  if (visualSpec) candidate.visual_spec = visualSpec;

  const parsed = BankQuestionSchema.safeParse(candidate);
  if (parsed.success) return parsed.data;

  console.warn(
    `[batchPromptOutputParser] Dropped question failing schema validation: ${String(candidate.question).slice(0, 80)} — ${parsed.error.issues[0]?.message ?? "unknown issue"}`,
  );
  return null;
}

function parseGenerationOutputInternal(
  rawOutput: string,
  context: string,
  meta: {
    archetypeId: BankGameplayArchetypeId;
    domainId?: string;
    subtopicId?: string;
    language?: string;
    difficulty?: number;
    ageBand?: "kids" | "family" | "teen" | "mature";
  },
  targets?: TargetEntityForGeneration[],
): BankQuestion[] {
  const items = extractJsonArray(rawOutput, context);
  if (!items) return [];

  const generationLanguage = normalizeGenerationLanguage(meta.language);
  const result: BankQuestion[] = [];
  const now = new Date().toISOString();
  const targetMap = targets ? new Map(targets.map((t) => [t.entity_id, t])) : null;
  const expectedCount = ARCHETYPE_GUIDELINES[meta.archetypeId]?.choiceCount ?? 3;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    let entityId = typeof item.entity_id === "string" && item.entity_id.trim() ? item.entity_id.trim() : undefined;
    let target = targetMap && entityId ? targetMap.get(entityId) : undefined;

    if (targets && !target && i < targets.length) {
      target = targets[i];
      entityId = target.entity_id;
    }

    const domainId = target?.domain_id ?? meta.domainId ?? (typeof item.domain_id === "string" ? item.domain_id : "general");
    const subtopicId = target?.subtopic_id ?? meta.subtopicId ?? (typeof item.subtopic_id === "string" ? item.subtopic_id : "general");

    const question = buildAndValidateBankQuestion({
      item,
      archetypeId: meta.archetypeId,
      domainId,
      subtopicId,
      entityId,
      difficulty: meta.difficulty,
      ageBand: meta.ageBand,
      generationLanguage,
      expectedChoiceCount: expectedCount,
      distractorPool: target?.distractor_pool,
      now,
      isReverse: Boolean(targets),
    });
    if (question) result.push(question);
  }

  return result;
}

export function parseBatchGenerationOutput(
  rawOutput: string,
  meta: {
    archetypeId: BankGameplayArchetypeId;
    domainId: string;
    subtopicId: string;
    language?: string;
    difficulty?: number;
    ageBand?: "kids" | "family" | "teen" | "mature";
  },
): BankQuestion[] {
  return parseGenerationOutputInternal(rawOutput, meta.archetypeId, meta);
}

export function parseReverseBatchGenerationOutput(
  rawOutput: string,
  targets: TargetEntityForGeneration[],
  meta: {
    archetypeId: BankGameplayArchetypeId;
    language?: string;
    difficulty?: number;
    ageBand?: "kids" | "family" | "teen" | "mature";
  },
): BankQuestion[] {
  return parseGenerationOutputInternal(rawOutput, `reverse/${meta.archetypeId}`, meta, targets);
}
