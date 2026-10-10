import type { MascotArchetypeDefinition } from "./thumbnailArchetypes.js";

export interface QuizShortCoverPersona {
  archetypeId: number;
  archetypeName: string;
  role: string;
  costume?: string;
  prop?: string;
  expression: string;
  poseDescription: string;
  dramaticHook?: string;
  /** A fresh uppercase hook banner proposed by the planner; sanitized before use. */
  hookText?: string;
}

interface RawCoverVariation {
  id?: number;
  archetypeId?: number;
  archetypeName?: string;
  role?: string;
  costume?: string;
  prop?: string;
  expression?: string;
  poseDescription?: string;
  dramaticHook?: string;
  hookText?: string;
}

interface RawCoverPlanResponse {
  variations?: RawCoverVariation[];
}

function parseJson(rawOutput: string): RawCoverPlanResponse | null {
  try {
    const jsonMatch = rawOutput.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || rawOutput.match(/(\{[\s\S]*\})/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[1] : rawOutput.trim()) as RawCoverPlanResponse | null;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function optionalText(value: string | undefined): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function toPersona(
  raw: RawCoverVariation,
  index: number,
  pool: readonly MascotArchetypeDefinition[],
  fallback: QuizShortCoverPersona,
): QuizShortCoverPersona {
  return {
    archetypeId: raw.archetypeId || pool[index]?.id || index + 1,
    archetypeName: raw.archetypeName || pool[index]?.name || `Archetype ${index + 1}`,
    role: optionalText(raw.role) ?? fallback.role,
    costume: optionalText(raw.costume),
    prop: optionalText(raw.prop),
    expression: optionalText(raw.expression) ?? fallback.expression,
    poseDescription: optionalText(raw.poseDescription) ?? fallback.poseDescription,
    dramaticHook: optionalText(raw.dramaticHook),
    hookText: optionalText(raw.hookText),
  };
}

/** Validates the planner JSON at the boundary; variations without any usable text are dropped. */
export function parseQuizShortCoverPlanResponse(
  rawOutput: string,
  pool: readonly MascotArchetypeDefinition[],
  fallback: QuizShortCoverPersona,
): QuizShortCoverPersona[] {
  const variations = parseJson(rawOutput)?.variations;
  if (!Array.isArray(variations)) return [];
  return variations
    .filter((raw): raw is RawCoverVariation =>
      Boolean(raw && typeof raw === "object" && (raw.poseDescription || raw.expression || raw.role)),
    )
    .map((raw, index) => toPersona(raw, index, pool, fallback));
}
