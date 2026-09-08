import { BankQuestionSchema, type BankGameplayArchetypeId, type BankQuestion } from "@studio/shared";
import { ARCHETYPE_GUIDELINES } from "./archetypePromptGuidelines.js";
import type { TargetEntityForGeneration } from "./reverseMatrixPromptBuilder.js";

function makeUniqueBankId(archetypeId: string, domainId: string, subtopicId: string): string {
  const archPrefix = archetypeId.slice(0, 3).toUpperCase();
  const domPrefix = domainId.slice(0, 3).toUpperCase();
  const subPrefix = subtopicId.slice(0, 3).toUpperCase();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `${archPrefix}-${domPrefix}-${subPrefix}-${randomSuffix}`;
}

/**
 * Logs the raw output tail when LLM output cannot be parsed, so silent
 * question loss is observable in server logs.
 */
function warnUnparseableOutput(context: string, rawOutput: string): void {
  console.warn(`[batchPromptOutputParser] Unparseable LLM output (${context}). Output tail: ${rawOutput.slice(-400)}`);
}

/**
 * Cleans formulaic redundancies from generated question text.
 * Specifically removes trailing ': Option A or Option B?' from versus_faceoff
 * where options match choice texts.
 */
export function sanitizeBankQuestionText(
  questionText: string,
  archetypeId?: BankGameplayArchetypeId,
  choices?: Array<{ text: string }>,
): string {
  if (!questionText || typeof questionText !== "string") return questionText;
  let cleaned = questionText.trim();

  if (archetypeId === "versus_faceoff" && choices && choices.length === 2) {
    const c0 = choices[0]?.text?.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const c1 = choices[1]?.text?.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (c0 && c1) {
      const trailingPattern = new RegExp(
        `[:\\-\\s]+(?:${c0}\\s*(?:or|vs\\.?|and)\\s*${c1}|${c1}\\s*(?:or|vs\\.?|and)\\s*${c0})\\s*\\??$`,
        "i",
      );
      if (trailingPattern.test(cleaned)) {
        cleaned = cleaned.replace(trailingPattern, "").trim();
        if (!cleaned.endsWith("?")) cleaned += "?";
      }
    }
  }

  return cleaned;
}

interface RawChoice {
  id?: string;
  text?: string;
  is_correct?: boolean;
  explanation?: string;
  [key: string]: unknown;
}

const VIETNAMESE_LANGUAGE_CODES = new Set(["vi", "vie", "vietnamese"]);

/** Resolves an explicit generation target to a persisted base language code. */
export function normalizeGenerationLanguage(language?: string): string | undefined {
  if (language === undefined || language.trim() === "") return "en";
  const normalizedInput = language.trim().toLowerCase().replaceAll("_", "-");
  const baseInput = normalizedInput.split("-", 1)[0];
  if (VIETNAMESE_LANGUAGE_CODES.has(normalizedInput) || VIETNAMESE_LANGUAGE_CODES.has(baseInput)) {
    throw new Error("Vietnamese generation targets are not supported");
  }
  if (normalizedInput === "en" || normalizedInput === "eng" || normalizedInput === "english" || baseInput === "en") return "en";
  throw new Error(`Bank generation requires English; received '${language}'`);
}

function extractJsonArray(rawOutput: string, context: string): Record<string, unknown>[] | null {
  let cleaned = rawOutput.trim();
  const jsonMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (jsonMatch) {
    cleaned = jsonMatch[1].trim();
  }

  let items: unknown;
  try {
    items = JSON.parse(cleaned);
  } catch {
    const arrayMatch = cleaned.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (arrayMatch) {
      try {
        items = JSON.parse(arrayMatch[0]);
      } catch {
        warnUnparseableOutput(context, rawOutput);
        return null;
      }
    } else {
      warnUnparseableOutput(context, rawOutput);
      return null;
    }
  }

  if (!Array.isArray(items)) {
    if (items && typeof items === "object" && Array.isArray((items as { questions?: unknown[] }).questions)) {
      items = (items as { questions: unknown[] }).questions;
    } else {
      warnUnparseableOutput(context, rawOutput);
      return null;
    }
  }

  return (items as unknown[]).filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null);
}

function normalizeChoices(
  rawChoices: unknown,
  expectedCount: number,
  correctChoiceId?: unknown,
  distractorPool?: string[],
): RawChoice[] | undefined {
  if (!Array.isArray(rawChoices)) return undefined;
  const choices: RawChoice[] = rawChoices.filter((c): c is RawChoice => typeof c === "object" && c !== null);

  if (choices.length > expectedCount) {
    const correctChoice = choices.find((c) => c.id === correctChoiceId || c.is_correct === true);
    const distractors = choices.filter((c) => c !== correctChoice);
    const neededDistractors = distractors.slice(0, expectedCount - 1);
    return correctChoice ? [correctChoice, ...neededDistractors] : choices.slice(0, expectedCount);
  }

  if (choices.length < expectedCount) {
    const result = [...choices];
    while (result.length < expectedCount) {
      const nextId = String.fromCharCode(65 + result.length);
      const poolDistractor = distractorPool?.find((d) => !result.some((c) => c.text === d));
      result.push({
        id: nextId,
        text: poolDistractor || (distractorPool ? `Option ${nextId}` : `Alternative ${nextId}`),
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
  if (vs.intent !== "choice_illustration" && vs.intent !== "none") {
    vs.intent = "question_illustration";
  }
  return vs;
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
  const items = extractJsonArray(rawOutput, meta.archetypeId);
  if (!items) return [];

  const generationLanguage = normalizeGenerationLanguage(meta.language);

  const result: BankQuestion[] = [];
  const now = new Date().toISOString();
  const expectedCount = ARCHETYPE_GUIDELINES[meta.archetypeId]?.choiceCount ?? 3;

  for (const item of items) {
    const rawQuestion = typeof item.question === "string" ? item.question : "";
    const rawChoices = Array.isArray(item.choices)
      ? item.choices.filter(
          (c): c is { text: string } => typeof c === "object" && c !== null && typeof (c as { text?: unknown }).text === "string",
        )
      : [];
    const sanitizedQuestion = sanitizeBankQuestionText(rawQuestion, meta.archetypeId, rawChoices);

    const normalizedChoices = normalizeChoices(item.choices, expectedCount, item.correct_choice_id);

    const candidate: Record<string, unknown> = {
      ...item,
      question: sanitizedQuestion,
      choices: normalizedChoices ?? item.choices,
      id:
        typeof item.id === "string" && item.id.trim() ? item.id.trim() : makeUniqueBankId(meta.archetypeId, meta.domainId, meta.subtopicId),
      entity_id: typeof item.entity_id === "string" && item.entity_id.trim() ? item.entity_id.trim() : undefined,
      archetype_id: meta.archetypeId,
      domain_id: meta.domainId,
      subtopic_id: meta.subtopicId,
      status: "approved",
      difficulty: typeof item.difficulty === "number" ? item.difficulty : (meta.difficulty ?? 2),
      age_band: typeof item.age_band === "string" ? item.age_band : (meta.ageBand ?? "family"),
      created_at: now,
      updated_at: now,
      ...(generationLanguage ? { language: generationLanguage } : {}),
    };

    const visualSpec = normalizeVisualSpec(candidate.visual_spec);
    if (visualSpec) {
      candidate.visual_spec = visualSpec;
    }

    const parsed = BankQuestionSchema.safeParse(candidate);
    if (parsed.success) {
      result.push(parsed.data);
    } else {
      console.warn(
        `[batchPromptOutputParser] Dropped question failing schema validation: ${String(candidate.question).slice(0, 80)} — ${parsed.error.issues[0]?.message ?? "unknown issue"}`,
      );
    }
  }

  return result;
}

/**
 * Parses and validates raw LLM output from reverse matrix generation, correlating questions to target entities.
 */
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
  const items = extractJsonArray(rawOutput, `reverse/${meta.archetypeId}`);
  if (!items) return [];

  const generationLanguage = normalizeGenerationLanguage(meta.language);

  const result: BankQuestion[] = [];
  const now = new Date().toISOString();
  const targetMap = new Map<string, TargetEntityForGeneration>();
  for (const t of targets) {
    targetMap.set(t.entity_id, t);
  }
  const expectedCount = ARCHETYPE_GUIDELINES[meta.archetypeId]?.choiceCount ?? 3;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    // Resolve matched target entity: by entity_id first, then by index fallback
    let entityId = typeof item.entity_id === "string" ? item.entity_id.trim() : "";
    let matchedTarget = targetMap.get(entityId);

    if (!matchedTarget && i < targets.length) {
      matchedTarget = targets[i];
      entityId = matchedTarget.entity_id;
    }

    const domainId = matchedTarget ? matchedTarget.domain_id : typeof item.domain_id === "string" ? item.domain_id : "general";
    const subtopicId = matchedTarget ? matchedTarget.subtopic_id : typeof item.subtopic_id === "string" ? item.subtopic_id : "general";

    const rawQuestion = typeof item.question === "string" ? item.question : "";
    const rawChoices = Array.isArray(item.choices)
      ? item.choices.filter(
          (c): c is { text: string } => typeof c === "object" && c !== null && typeof (c as { text?: unknown }).text === "string",
        )
      : [];
    const sanitizedQuestion = sanitizeBankQuestionText(rawQuestion, meta.archetypeId, rawChoices);

    const normalizedChoices = normalizeChoices(item.choices, expectedCount, item.correct_choice_id, matchedTarget?.distractor_pool);

    const candidate: Record<string, unknown> = {
      ...item,
      question: sanitizedQuestion,
      choices: normalizedChoices ?? item.choices,
      id: typeof item.id === "string" && item.id.trim() ? item.id.trim() : makeUniqueBankId(meta.archetypeId, domainId, subtopicId),
      entity_id: entityId || undefined,
      archetype_id: meta.archetypeId,
      domain_id: domainId,
      subtopic_id: subtopicId,
      status: "approved",
      difficulty: typeof item.difficulty === "number" ? item.difficulty : (meta.difficulty ?? 2),
      age_band: typeof item.age_band === "string" ? item.age_band : (meta.ageBand ?? "family"),
      created_at: now,
      updated_at: now,
      ...(generationLanguage ? { language: generationLanguage } : {}),
    };

    const visualSpec = normalizeVisualSpec(candidate.visual_spec);
    if (visualSpec) {
      candidate.visual_spec = visualSpec;
    }

    const parsed = BankQuestionSchema.safeParse(candidate);
    if (parsed.success) {
      result.push(parsed.data);
    } else {
      console.warn(
        `[batchPromptOutputParser] Dropped question failing schema validation: ${String(candidate.question).slice(0, 80)} — ${parsed.error.issues[0]?.message ?? "unknown issue"}`,
      );
    }
  }

  return result;
}
