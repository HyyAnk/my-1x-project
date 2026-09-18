import type { ShortReelRecord } from "@studio/shared";
import { executeSinglePromptText, type LLMClient } from "../utils/promptSanitizer.js";
import {
  MASCOT_ARCHETYPES_CATALOG,
  selectRandomArchetypes,
  selectRandomVariation,
  type MascotArchetypeDefinition,
} from "../quiz/thumbnail/thumbnailArchetypes.js";

export interface ReelCoverPersona {
  archetypeId: number;
  archetypeName: string;
  role: string;
  costume?: string;
  prop?: string;
  expression: string;
  poseDescription: string;
  dramaticHook?: string;
}

export interface PlanReelCoverInput {
  record: ShortReelRecord;
  llmClient?: LLMClient | null;
  signal?: AbortSignal;
  archetypesOverride?: MascotArchetypeDefinition[];
  rng?: () => number;
}

interface AiCoverPlanResponse {
  variations?: Array<{
    id?: number;
    archetypeId?: number;
    archetypeName?: string;
    role?: string;
    costume?: string;
    prop?: string;
    expression?: string;
    poseDescription?: string;
    dramaticHook?: string;
  }>;
}

function sanitizeUntrusted(text: string | undefined | null): string {
  if (!text) return "";
  return JSON.stringify(text).slice(1, -1).replace(/</g, "\\u003c").replace(/>/g, "\\u003e");
}

export function buildReelCoverPlannerPrompt(record: ShortReelRecord, archetypes: readonly MascotArchetypeDefinition[]): string {
  const mascotName = sanitizeUntrusted(record.visual_context?.mascot_name || "Mascot");
  const topicTitle = sanitizeUntrusted(record.topic.title);
  const premise = sanitizeUntrusted(record.topic.premise);
  const question = sanitizeUntrusted(record.source.question_text);
  const narrative = sanitizeUntrusted(record.script?.segments[0]?.narrative || "");

  const archetypesSection = archetypes
    .map((a, i) => `Variation ${i + 1} (Archetype ID ${a.id}: "${a.name}"):\n- Core Emotional/Behavioral Direction: ${a.guideline}`)
    .join("\n\n");

  return [
    "You are an elite short-form vertical video cover visual director.",
    "Plan dramatic, high-CTR 9:16 portrait thumbnail character variations for a viral quiz short reel.",
    "",
    "[QUIZ SHORT REEL CONTEXT]:",
    "<context>",
    `Mascot Character: "${mascotName}"`,
    `Topic: "${topicTitle}"`,
    `Premise: "${premise}"`,
    `Challenge Question: "${question}"`,
    `Opening Scene Narrative: "${narrative}"`,
    "</context>",
    "",
    "[SELECTED EMOTIONAL & BEHAVIORAL ARCHETYPES]:",
    archetypesSection,
    "",
    "[INSTRUCTIONS]:",
    "Generate distinct mascot persona variations matching each assigned archetype above.",
    "STRICT RULES:",
    "- Tailor costumes, props, and actions specifically to this quiz challenge topic.",
    "- DO NOT rely on generic pointing poses or static standing postures.",
    "- Express high dramatic energy, intense curiosity, or comedic surprise suitable for 9:16 vertical video covers.",
    "- DO NOT reveal the correct answer in any visual element.",
    "",
    "Respond with ONLY valid JSON matching this schema:",
    "{",
    '  "variations": [',
    "    {",
    '      "id": 1,',
    '      "archetypeId": 1,',
    '      "archetypeName": "<Archetype Name>",',
    '      "role": "<Contextual role tailored to topic>",',
    '      "costume": "<Specific costume tailored to topic, or none>",',
    '      "prop": "<Contextual prop or thematic item>",',
    '      "expression": "<High-intensity facial expression fitting the archetype>",',
    '      "poseDescription": "<Dynamic action and full-body posture embodying the archetype>",',
    '      "dramaticHook": "<Brief visual climax description>"',
    "    }",
    "  ]",
    "}",
  ].join("\n");
}

function parseAiCoverPlanJson(rawOutput: string): AiCoverPlanResponse | null {
  try {
    const jsonMatch = rawOutput.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || rawOutput.match(/(\{[\s\S]*\})/);
    const jsonString = jsonMatch ? jsonMatch[1] : rawOutput.trim();
    return JSON.parse(jsonString) as AiCoverPlanResponse;
  } catch {
    return null;
  }
}

export function createFallbackPersona(archetype: MascotArchetypeDefinition, mascotName?: string): ReelCoverPersona {
  return {
    archetypeId: archetype.id,
    archetypeName: archetype.name,
    role: `${mascotName || "Character"} as ${archetype.name}`,
    expression: archetype.guideline,
    poseDescription: `${mascotName || "Character"} in a dynamic full-body posture embodying ${archetype.name}: ${archetype.guideline}`,
  };
}

/**
 * Plans a diverse, high-CTR mascot persona and dramatic situation for a Short-Reel cover.
 * Combines random psychological archetype sampling with optional LLM creative contextualization.
 */
export async function planReelCoverWithAI(input: PlanReelCoverInput): Promise<ReelCoverPersona> {
  const rng = input.rng ?? Math.random;
  const candidatePool = input.archetypesOverride || selectRandomArchetypes(MASCOT_ARCHETYPES_CATALOG, 3, rng);
  const fallbackArchetype = candidatePool[0] ?? MASCOT_ARCHETYPES_CATALOG[0];
  const fallbackPersona = createFallbackPersona(fallbackArchetype, input.record.visual_context?.mascot_name);

  if (!input.llmClient) {
    return fallbackPersona;
  }

  try {
    const plannerPrompt = buildReelCoverPlannerPrompt(input.record, candidatePool);
    const rawResponse = await executeSinglePromptText(input.llmClient, plannerPrompt, {
      signal: input.signal,
      timeoutMs: 30000,
      modelOverride: "flash",
    });

    const parsed = parseAiCoverPlanJson(rawResponse);
    const variations = parsed?.variations;

    if (!variations || variations.length === 0) {
      return fallbackPersona;
    }

    const validVariations: ReelCoverPersona[] = variations
      .filter((v) => v && (v.poseDescription || v.expression || v.role))
      .map((v, idx) => ({
        archetypeId: v.archetypeId || candidatePool[idx]?.id || idx + 1,
        archetypeName: v.archetypeName || candidatePool[idx]?.name || `Archetype ${idx + 1}`,
        role: v.role || fallbackPersona.role,
        costume: v.costume || undefined,
        prop: v.prop || undefined,
        expression: v.expression || fallbackPersona.expression,
        poseDescription: v.poseDescription || fallbackPersona.poseDescription,
        dramaticHook: v.dramaticHook || undefined,
      }));

    if (validVariations.length === 0) {
      return fallbackPersona;
    }

    const picked = selectRandomVariation(validVariations, rng);
    return picked?.selected ?? validVariations[0] ?? fallbackPersona;
  } catch {
    return fallbackPersona;
  }
}
