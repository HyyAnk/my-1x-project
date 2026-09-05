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

export function parseBatchGenerationOutput(
  rawOutput: string,
  meta: {
    archetypeId: BankGameplayArchetypeId;
    domainId: string;
    subtopicId: string;
    difficulty?: number;
    ageBand?: "kids" | "family" | "teen" | "mature";
  },
): BankQuestion[] {
  let cleaned = rawOutput.trim();

  // Strip markdown code fences if present
  const jsonMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (jsonMatch) {
    cleaned = jsonMatch[1].trim();
  }

  // Attempt JSON parsing
  let items: unknown;
  try {
    items = JSON.parse(cleaned);
  } catch {
    const arrayMatch = cleaned.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (arrayMatch) {
      try {
        items = JSON.parse(arrayMatch[0]);
      } catch {
        return [];
      }
    } else {
      return [];
    }
  }

  if (!Array.isArray(items)) {
    if (items && typeof items === "object" && Array.isArray((items as { questions?: unknown[] }).questions)) {
      items = (items as { questions: unknown[] }).questions;
    } else {
      return [];
    }
  }

  const result: BankQuestion[] = [];
  const now = new Date().toISOString();

  for (const item of items as Record<string, unknown>[]) {
    if (!item || typeof item !== "object") continue;

    const rawQuestion = typeof item.question === "string" ? item.question : "";
    const rawChoices = Array.isArray(item.choices) ? (item.choices as any[]) : [];
    const sanitizedQuestion = sanitizeBankQuestionText(rawQuestion, meta.archetypeId, rawChoices);

    const candidate: Record<string, unknown> = {
      ...item,
      question: sanitizedQuestion,
      id:
        typeof item.id === "string" && item.id.trim()
          ? item.id.trim()
          : makeUniqueBankId(meta.archetypeId, meta.domainId, meta.subtopicId),
      entity_id: typeof item.entity_id === "string" && item.entity_id.trim() ? item.entity_id.trim() : undefined,
      archetype_id: meta.archetypeId,
      domain_id: meta.domainId,
      subtopic_id: meta.subtopicId,
      status: "approved",
      difficulty: typeof item.difficulty === "number" ? item.difficulty : (meta.difficulty ?? 2),
      age_band: typeof item.age_band === "string" ? item.age_band : (meta.ageBand ?? "family"),
      created_at: now,
      updated_at: now,
    };

    if (candidate.visual_spec && typeof candidate.visual_spec === "object") {
      const vs = { ...(candidate.visual_spec as Record<string, unknown>) };
      if (vs.intent !== "choice_illustration" && vs.intent !== "none") {
        vs.intent = "question_illustration";
      }
      candidate.visual_spec = vs;
    }

    const expectedCount = ARCHETYPE_GUIDELINES[meta.archetypeId]?.choiceCount ?? 3;
    if (Array.isArray(candidate.choices)) {
      if (candidate.choices.length > expectedCount) {
        const correctChoice = (candidate.choices as any[]).find(
          (c) => c && typeof c === "object" && (c.id === candidate.correct_choice_id || c.is_correct === true),
        );
        const distractors = (candidate.choices as any[]).filter((c) => c !== correctChoice);
        const neededDistractors = distractors.slice(0, expectedCount - 1);
        candidate.choices = correctChoice ? [correctChoice, ...neededDistractors] : candidate.choices.slice(0, expectedCount);
      } else if (candidate.choices.length < expectedCount) {
        while (candidate.choices.length < expectedCount) {
          const nextId = String.fromCharCode(65 + candidate.choices.length);
          (candidate.choices as any[]).push({
            id: nextId,
            text: `Alternative ${nextId}`,
            is_correct: false,
          });
        }
      }
    }

    const parsed = BankQuestionSchema.safeParse(candidate);
    if (parsed.success) {
      result.push(parsed.data);
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
    difficulty?: number;
    ageBand?: "kids" | "family" | "teen" | "mature";
  },
): BankQuestion[] {
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
        return [];
      }
    } else {
      return [];
    }
  }

  if (!Array.isArray(items)) {
    if (items && typeof items === "object" && Array.isArray((items as { questions?: unknown[] }).questions)) {
      items = (items as { questions: unknown[] }).questions;
    } else {
      return [];
    }
  }

  const result: BankQuestion[] = [];
  const now = new Date().toISOString();
  const targetMap = new Map<string, TargetEntityForGeneration>();
  for (const t of targets) {
    targetMap.set(t.entity_id, t);
  }

  const rawItems = items as Record<string, unknown>[];
  for (let i = 0; i < rawItems.length; i++) {
    const item = rawItems[i];
    if (!item || typeof item !== "object") continue;

    // Resolve matched target entity: by entity_id first, then by index fallback
    let entityId = typeof item.entity_id === "string" ? item.entity_id.trim() : "";
    let matchedTarget = targetMap.get(entityId);

    if (!matchedTarget && i < targets.length) {
      matchedTarget = targets[i];
      entityId = matchedTarget.entity_id;
    }

    const domainId = matchedTarget ? matchedTarget.domain_id : (item.domain_id as string) || "general";
    const subtopicId = matchedTarget ? matchedTarget.subtopic_id : (item.subtopic_id as string) || "general";

    const rawQuestion = typeof item.question === "string" ? item.question : "";
    const rawChoices = Array.isArray(item.choices) ? (item.choices as any[]) : [];
    const sanitizedQuestion = sanitizeBankQuestionText(rawQuestion, meta.archetypeId, rawChoices);

    const candidate: Record<string, unknown> = {
      ...item,
      question: sanitizedQuestion,
      id:
        typeof item.id === "string" && item.id.trim()
          ? item.id.trim()
          : makeUniqueBankId(meta.archetypeId, domainId, subtopicId),
      entity_id: entityId || undefined,
      archetype_id: meta.archetypeId,
      domain_id: domainId,
      subtopic_id: subtopicId,
      status: "approved",
      difficulty: typeof item.difficulty === "number" ? item.difficulty : (meta.difficulty ?? 2),
      age_band: typeof item.age_band === "string" ? item.age_band : (meta.ageBand ?? "family"),
      created_at: now,
      updated_at: now,
    };

    if (candidate.visual_spec && typeof candidate.visual_spec === "object") {
      const vs = { ...(candidate.visual_spec as Record<string, unknown>) };
      if (vs.intent !== "choice_illustration" && vs.intent !== "none") {
        vs.intent = "question_illustration";
      }
      candidate.visual_spec = vs;
    }

    const expectedCount = ARCHETYPE_GUIDELINES[meta.archetypeId]?.choiceCount ?? 3;
    if (Array.isArray(candidate.choices)) {
      if (candidate.choices.length > expectedCount) {
        const correctChoice = (candidate.choices as any[]).find(
          (c) => c && typeof c === "object" && (c.id === candidate.correct_choice_id || c.is_correct === true),
        );
        const distractors = (candidate.choices as any[]).filter((c) => c !== correctChoice);
        const neededDistractors = distractors.slice(0, expectedCount - 1);
        candidate.choices = correctChoice ? [correctChoice, ...neededDistractors] : candidate.choices.slice(0, expectedCount);
      } else if (candidate.choices.length < expectedCount) {
        while (candidate.choices.length < expectedCount) {
          const nextId = String.fromCharCode(65 + candidate.choices.length);
          const poolDistractor = matchedTarget?.distractor_pool?.find(
            (d) => !(candidate.choices as any[]).some((c) => c.text === d),
          );
          (candidate.choices as any[]).push({
            id: nextId,
            text: poolDistractor || `Option ${nextId}`,
            is_correct: false,
          });
        }
      }
    }

    const parsed = BankQuestionSchema.safeParse(candidate);
    if (parsed.success) {
      result.push(parsed.data);
    }
  }

  return result;
}
