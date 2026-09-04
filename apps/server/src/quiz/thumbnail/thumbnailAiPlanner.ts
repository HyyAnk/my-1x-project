import type { MascotProfile, ThumbnailAspectRatio, ThumbnailLayoutType } from "@studio/shared";
import { executeSinglePromptText, type LLMClient } from "../../utils/promptSanitizer.js";
import {
  MASCOT_ARCHETYPES_CATALOG,
  selectRandomArchetypes,
  selectRandomVariation,
  type MascotArchetypeDefinition,
} from "./thumbnailArchetypes.js";
import { resolveThumbnailLayout } from "./thumbnailLayoutResolver.js";
import type {
  MascotPersonaVariation,
  MascotThemedPersona,
  QuizSubjectAnchor,
  QuizThumbnailPlan,
  ResolveThumbnailInput,
} from "./thumbnailTypes.js";

export type PlanThumbnailWithAiInput = ResolveThumbnailInput & {
  llmClient?: LLMClient | null;
  signal?: AbortSignal;
  archetypesOverride?: MascotArchetypeDefinition[];
};

interface AiThumbnailPlanOutput {
  hook_text?: string;
  badge_text?: string;
  layout?: ThumbnailLayoutType;
  environment_atmosphere?: string;
  lighting_palette?: string;
  mascot_persona?: Partial<MascotThemedPersona>;
  mascot_persona_variations?: Array<{
    id?: number;
    archetypeId?: number;
    archetypeName?: string;
    role?: string;
    costume?: string;
    prop?: string;
    expression?: string;
    poseDescription?: string;
  }>;
  subject_anchors?: Array<{ label?: string; visualPrompt?: string; badge?: string }>;
}

export function buildAiPlannerPrompt(
  input: PlanThumbnailWithAiInput,
  directedArchetypes?: MascotArchetypeDefinition[],
): string {
  const sampleQuestions = (input.questions || []).slice(0, 4).map((q, i) => ({
    number: i + 1,
    question: q.question,
    choices: q.choices,
    answer: q.answer,
  }));

  const archetypes = directedArchetypes || input.archetypesOverride || selectRandomArchetypes(MASCOT_ARCHETYPES_CATALOG, 5);

  const archetypesSection = archetypes
    .map(
      (a, index) =>
        `  Variation ${index + 1} (Archetype ID ${a.id}: "${a.name}"):\n  - Core Psychological/Behavioral Direction: ${a.guideline}`,
    )
    .join("\n\n");

  return [
    "You are an elite YouTube Creative Director & Thumbnail Visual Strategist for high-CTR family & kids edutainment videos.",
    "Analyze the following Quiz Episode script and output a vibrant, cheerful, high-contrast, clutter-free Pixar 3D thumbnail plan.",
    "",
    "[EPISODE CONTEXT]:",
    `- Topic Title: "${input.topicTitle}"`,
    `- Topic Summary: "${input.topicSummary || "N/A"}"`,
    `- Target Language: "${input.language || "English"}"`,
    `- Question Format: "${input.questionFormat || "standard"}"`,
    "- Sample Questions & Choices:",
    JSON.stringify(sampleQuestions, null, 2),
    "",
    "[CRITICAL INSTRUCTIONS]:",
    `1. hook_text: Catchy headline (2-4 words MAX in ${input.language || "English"}). Specifically about the episode's subject. NEVER output generic "GENERAL KNOWLEDGE".`,
    `2. badge_text: High-impact curiosity trigger badge (1-3 words + 1 relevant emoji in ${input.language || "English"}). Dynamically pick ONE psychological hook fitting this episode (such as extreme failure rate/stakes, IQ/genius tier, time pressure, or direct challenge). DO NOT always repeat "99% FAIL!". Be creative and contextually relevant.`,
    "3. layout: Select best layout: [\"mega_grid\", \"split_vs\", \"mystery_silhouette\", \"odd_one_out\", \"difficulty_tier\", \"true_false\"].",
    "4. environment_atmosphere: A clean minimalist, soft-focus Pixar 3D studio background specifically tailored to this episode's topic with heavy depth of field, smooth warm gradients, and ZERO busy landscape clutter.",
    "5. lighting_palette: Rich saturated warm studio lighting with luminous rim lighting on foreground characters.",
    "6. mascot_persona_variations: Generate exactly 5 completely distinct, topic-tailored mascot variations corresponding to the 5 randomly selected emotional/behavioral archetypes below.",
    "   STRICT ZERO-COPY & ANTI-BIAS RULES:",
    "   - DO NOT repeat postures across variations.",
    "   - DO NOT rely on generic pointing poses.",
    "   - DO NOT copy archetype descriptions verbatim; invent authentic, topic-specific costumes, expressions, props, and actions.",
    "",
    "[SELECTED MASCOT ARCHETYPES FOR THIS EPISODE]:",
    archetypesSection,
    "",
    "7. subject_anchors: 2 to 4 concrete 3D visual objects. STRICT: Objects must float cleanly with ZERO numbers (NO 1, 2, 3, 4), ZERO card boxes, ZERO white frames.",
    "",
    "Respond with ONLY valid JSON matching this schema:",
    "{",
    '  "hook_text": "<Catchy 2-4 word headline in target language>",',
    '  "badge_text": "<High-CTR curiosity badge>",',
    '  "layout": "mega_grid",',
    '  "environment_atmosphere": "<Topic-tailored soft-focus 3D environment description>",',
    '  "lighting_palette": "<Warm studio lighting palette with rim light>",',
    '  "mascot_persona_variations": [',
    "    {",
    '      "id": 1,',
    '      "archetypeId": 1,',
    '      "archetypeName": "<Archetype Name>",',
    '      "role": "<Contextual role tailored to topic>",',
    '      "costume": "<Specific costume tailored to topic>",',
    '      "prop": "<Contextual prop or none>",',
    '      "expression": "<Specific expressive facial emotion embodying the archetype>",',
    '      "poseDescription": "<Dynamic full-body posture/action embodying the archetype without generic pointing>"',
    "    }",
    "  ],",
    '  "subject_anchors": [',
    '    { "label": "Option 1", "visualPrompt": "<Clean standalone 3D visual object>" },',
    '    { "label": "Option 2", "visualPrompt": "<Clean standalone 3D visual object>" }',
    "  ]",
    "}",
  ].join("\n");
}

function parseAiPlanJson(rawOutput: string): AiThumbnailPlanOutput | null {
  try {
    const jsonMatch = rawOutput.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || rawOutput.match(/(\{[\s\S]*\})/);
    const jsonString = jsonMatch ? jsonMatch[1] : rawOutput.trim();
    return JSON.parse(jsonString) as AiThumbnailPlanOutput;
  } catch {
    return null;
  }
}

export async function planThumbnailWithAI(input: PlanThumbnailWithAiInput): Promise<QuizThumbnailPlan> {
  const fallbackPlan = resolveThumbnailLayout(input);

  if (!input.llmClient) {
    return fallbackPlan;
  }

  try {
    const directedArchetypes = input.archetypesOverride || selectRandomArchetypes(MASCOT_ARCHETYPES_CATALOG, 5);
    const plannerPrompt = buildAiPlannerPrompt(input, directedArchetypes);
    const rawResponse = await executeSinglePromptText(input.llmClient, plannerPrompt, {
      signal: input.signal,
      timeoutMs: 30000,
      modelOverride: "flash",
    });

    const parsed = parseAiPlanJson(rawResponse);
    if (!parsed || !parsed.hook_text) {
      return fallbackPlan;
    }

    const layout = input.layoutOverride || parsed.layout || fallbackPlan.layout;
    const hookText = input.customHookText || parsed.hook_text || fallbackPlan.hookText;
    const isSpecificBadgeOverride = input.badgeOverride && input.badgeOverride !== "auto";
    const badgeText = isSpecificBadgeOverride ? fallbackPlan.badgeText : (parsed.badge_text || fallbackPlan.badgeText);
    const environmentAtmosphere = parsed.environment_atmosphere || fallbackPlan.environmentAtmosphere;
    const lightingPalette = parsed.lighting_palette || fallbackPlan.lightingPalette;

    // Process 5 persona variations and select 1 with true randomness
    const rawVariations = parsed.mascot_persona_variations || [];
    const variations: MascotPersonaVariation[] = rawVariations
      .filter((v) => v && (v.poseDescription || v.role || v.expression))
      .map((v, idx) => ({
        id: v.id || idx + 1,
        archetypeId: v.archetypeId || directedArchetypes[idx]?.id || idx + 1,
        archetypeName: v.archetypeName || directedArchetypes[idx]?.name || `Archetype ${idx + 1}`,
        role: v.role || fallbackPlan.mascotPersona.role,
        costume: v.costume || fallbackPlan.mascotPersona.costume,
        prop: v.prop || fallbackPlan.mascotPersona.prop,
        expression: v.expression || fallbackPlan.mascotPersona.expression,
        poseDescription: v.poseDescription || fallbackPlan.mascotPersona.poseDescription,
      }));

    let mascotPersona: MascotThemedPersona = fallbackPlan.mascotPersona;
    let selectedVariationId: number | undefined;

    if (variations.length > 0) {
      const picked = selectRandomVariation(variations);
      if (picked) {
        mascotPersona = {
          role: picked.selected.role,
          costume: picked.selected.costume,
          prop: picked.selected.prop,
          expression: picked.selected.expression,
          poseDescription: picked.selected.poseDescription,
        };
        selectedVariationId = picked.selected.id;
      }
    } else if (parsed.mascot_persona) {
      mascotPersona = {
        role: parsed.mascot_persona.role || fallbackPlan.mascotPersona.role,
        costume: parsed.mascot_persona.costume || fallbackPlan.mascotPersona.costume,
        prop: parsed.mascot_persona.prop || fallbackPlan.mascotPersona.prop,
        expression: parsed.mascot_persona.expression || fallbackPlan.mascotPersona.expression,
        poseDescription: parsed.mascot_persona.poseDescription || fallbackPlan.mascotPersona.poseDescription,
      };
    }

    const subjectAnchors: QuizSubjectAnchor[] =
      parsed.subject_anchors && parsed.subject_anchors.length >= 2
        ? parsed.subject_anchors.map((a, i) => ({
            label: a.label || `Option ${i + 1}`,
            visualPrompt: a.visualPrompt || `3D visual of Option ${i + 1}`,
            badge: a.badge,
          }))
        : fallbackPlan.subjectAnchors;

    return {
      ...fallbackPlan,
      layout,
      hookText,
      badgeText,
      environmentAtmosphere,
      lightingPalette,
      mascotPersona,
      mascotVariations: variations.length > 0 ? variations : undefined,
      selectedVariationId,
      subjectAnchors,
    };
  } catch {
    return fallbackPlan;
  }
}

