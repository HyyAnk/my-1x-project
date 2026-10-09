import type { ThumbnailLayoutType } from "@studio/shared";
import { ThumbnailLayoutTypeSchema } from "@studio/shared";
import { buildEditorialPlannerPrompt } from "./editorial/editorialPlannerPrompt.js";
import { applyEditorialDesign } from "./editorial/editorialPlan.js";
import { EditorialAiPlanSchema } from "./editorial/editorialAiPlanSchema.js";
import { refineEditorialPlan } from "./editorial/refinement/editorialPlanRefiner.js";
import type { StudioLogger } from "../../logger.js";
import { executeSinglePromptText, type LLMClient } from "../../utils/promptSanitizer.js";
import {
  MASCOT_ARCHETYPES_CATALOG,
  selectRandomArchetypes,
  selectRandomVariation,
  type MascotArchetypeDefinition,
} from "./thumbnailArchetypes.js";
import { resolveThumbnailLayout } from "./thumbnailLayoutResolver.js";
import { sanitizeThumbnailHook } from "./thumbnailHookGuardrail.js";
import { deriveTopicHeadlineFallback, isGenericQuizTitle } from "./thumbnailTopicHookExtractor.js";
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
  logger?: StudioLogger;
  channelId?: string;
  episodeId?: string;
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

export function buildAiPlannerPrompt(input: PlanThumbnailWithAiInput, directedArchetypes?: MascotArchetypeDefinition[]): string {
  if (input.editorial) return buildEditorialPlannerPrompt(input);
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
    `1. hook_text: Ultra-punchy headline (2 to 6 words MAX, strictly under 30 characters in ${input.language || "English"}). Specifically about the episode's subject. High CTR, bold, concise. NEVER output generic "GENERAL KNOWLEDGE" or "TRUE OR FALSE" or "TRUE OR FALSE?" or "YES OR NO" or "YES OR NO?". For yes_no format, the headline MUST be about the topic (e.g., "ARCADE MYTHS?", "ANIMAL FACTS?"). NEVER output long sentences, descriptions, or question bodies.`,
    `2. badge_text: High-impact curiosity trigger badge (1-3 words + 1 relevant emoji in ${input.language || "English"}). Dynamically pick ONE psychological hook fitting this episode (such as extreme failure rate/stakes, IQ/genius tier, time pressure, or direct challenge). DO NOT always repeat "99% FAIL!". Be creative and contextually relevant.`,
    '3. layout: Select best layout: ["mega_grid", "split_vs", "mystery_silhouette", "odd_one_out", "difficulty_tier", "yes_no"].',
    "4. environment_atmosphere: A clean minimalist, soft-focus Pixar 3D studio background specifically tailored to this episode's topic with heavy depth of field, smooth warm gradients, and ZERO busy landscape clutter.",
    "5. lighting_palette: Rich saturated warm studio lighting with luminous rim lighting on foreground characters.",
    "6. mascot_persona_variations: Generate exactly 5 completely distinct, topic-tailored mascot variations corresponding to the 5 randomly selected emotional/behavioral archetypes below.",
    "   STRICT ZERO-COPY & ANTI-BIAS RULES:",
    "   - DO NOT repeat postures across variations.",
    "   - DO NOT rely on generic pointing poses.",
    "   - DO NOT copy archetype descriptions verbatim; invent authentic, topic-specific costumes, expressions, props, and actions.",
    "   - STRICT CULTURAL & THEMATIC AUTHENTICITY: Analyze the specific cultural setting, era, or theme deeply. NEVER default to a generic wizard robe, wizard hat, or lab coat unless the topic is specifically about wizardry or chemistry. If Norse/Viking: Viking warrior leather tunic, fur mantle, runic armor, miniature Thor's hammer Mjolnir; if Greek: Olympian chiton with laurel wreath; if Samurai: braided armor; if Pirates: captain coat.",
    "   - STRICT FOR yes_no: The mascot must NEVER hold Yes/No paddles or checkmark/cross signs. Only the two tactile arcade buttons at the base display the options.",
    "",
    "[SELECTED MASCOT ARCHETYPES FOR THIS EPISODE]:",
    archetypesSection,
    "",
    "7. subject_anchors: 2 to 4 concrete 3D visual objects directly derived from the episode's topic and sample questions (e.g. for Norse: Thor's hammer Mjolnir, Viking Longship, Valkyrie Helmet, Runic Stone; NEVER unrelated Egyptian pharaohs or generic objects). STRICT: Objects must float cleanly with ZERO numbers (NO 1, 2, 3, 4), ZERO card boxes, ZERO white frames.",
    "",
    "Respond with ONLY valid JSON matching this schema:",
    "{",
    '  "hook_text": "<Ultra-punchy 2-6 word headline, strictly under 30 characters, in target language>",',
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

export function parseAiPlanJson(rawOutput: string): AiThumbnailPlanOutput | null {
  if (!rawOutput || typeof rawOutput !== "string") return null;

  try {
    const fenceMatch = rawOutput.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    let candidate = fenceMatch ? fenceMatch[1].trim() : "";

    if (!candidate) {
      const firstBrace = rawOutput.indexOf("{");
      const lastBrace = rawOutput.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        candidate = rawOutput.slice(firstBrace, lastBrace + 1).trim();
      } else {
        candidate = rawOutput.trim();
      }
    }

    try {
      return JSON.parse(candidate) as AiThumbnailPlanOutput;
    } catch {
      // Clean common LLM formatting flaws: trailing commas, single-line comments, control characters
      const cleaned = candidate
        .replace(/,\s*([}\]])/g, "$1")
        .replace(/\/\/[^\n\r]*/g, "")
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");

      return JSON.parse(cleaned) as AiThumbnailPlanOutput;
    }
  } catch {
    return null;
  }
}

export const GENERIC_CLICHE_PATTERN =
  /^(general\s+knowledge|true\s+or\s+false|true\/false|yes\s+or\s+no|yes\/no|vrai\s+ou\s+faux|verdadero\s+o\s+falso|richtig\s+oder\s+falsch|which\s+would\s+you\s+choose|who\s+is\s+this|find\s+the\s+odd\s+one|can\s+you\s+solve\s+level\s+\d+|can\s+you\s+beat\s+level\s+\d+|quiz\s+challenge|knowledge\s+quiz|trivia\s+quiz|trivia\s+challenge)[?!.]*$/i;

export async function planThumbnailWithAI(input: PlanThumbnailWithAiInput): Promise<QuizThumbnailPlan> {
  const plan = await planThumbnailDraft(input);
  return input.editorial ? refineEditorialPlan(plan, input) : plan;
}

async function planThumbnailDraft(input: PlanThumbnailWithAiInput): Promise<QuizThumbnailPlan> {
  input.signal?.throwIfAborted();
  const resolvedPlan = resolveThumbnailLayout(input);
  const fallbackPlan = input.editorial ? applyEditorialDesign(resolvedPlan, { ...input, editorialFallback: true }) : resolvedPlan;

  if (!input.llmClient) {
    input.logger?.warn("AI thumbnail planning skipped: no active LLM client provided. Applying topic-intelligent fallback plan.", {
      profileId: input.channelId,
      workerId: input.episodeId,
      step: "thumbnail_ai_planner",
    });
    if (!input.editorial && GENERIC_CLICHE_PATTERN.test(fallbackPlan.hookText) && input.topicTitle && !isGenericQuizTitle(input.topicTitle)) {
      return {
        ...fallbackPlan,
        hookText: deriveTopicHeadlineFallback(input.topicTitle, fallbackPlan.hookText),
      };
    }
    return fallbackPlan;
  }

  try {
    input.logger?.info("Executing AI thumbnail planner prompt", {
      profileId: input.channelId,
      workerId: input.episodeId,
      step: "thumbnail_ai_planner",
      topic: input.topicTitle,
    });
    const directedArchetypes = input.archetypesOverride || selectRandomArchetypes(MASCOT_ARCHETYPES_CATALOG, 5);
    const plannerPrompt = buildAiPlannerPrompt(input, directedArchetypes);
    const rawResponse = await executeSinglePromptText(input.llmClient, plannerPrompt, {
      signal: input.signal,
      timeoutMs: 300_000,
      modelOverride: "flash",
    });

    const rawPlan = parseAiPlanJson(rawResponse);
    const parsed: AiThumbnailPlanOutput | null | undefined = input.editorial ? EditorialAiPlanSchema.safeParse(rawPlan).data : rawPlan;
    if (!parsed) {
      if (!input.editorial && GENERIC_CLICHE_PATTERN.test(fallbackPlan.hookText) && input.topicTitle && !isGenericQuizTitle(input.topicTitle)) {
        return {
          ...fallbackPlan,
          hookText: deriveTopicHeadlineFallback(input.topicTitle, fallbackPlan.hookText),
        };
      }
      return fallbackPlan;
    }

    input.signal?.throwIfAborted();
    const layout = input.layoutOverride || ThumbnailLayoutTypeSchema.safeParse(parsed.layout).data || fallbackPlan.layout;

    let hookText: string;
    if (input.customHookText && input.customHookText.trim().length > 0) {
      hookText = sanitizeThumbnailHook(input.customHookText, fallbackPlan.hookText);
    } else if (parsed.hook_text && parsed.hook_text.trim().length > 0) {
      const isGenericCliche = !input.editorial && GENERIC_CLICHE_PATTERN.test(parsed.hook_text.trim());
      if (isGenericCliche) {
        hookText = deriveTopicHeadlineFallback(input.topicTitle, fallbackPlan.hookText);
      } else {
        hookText = sanitizeThumbnailHook(parsed.hook_text, fallbackPlan.hookText);
      }
    } else {
      hookText = deriveTopicHeadlineFallback(input.topicTitle, fallbackPlan.hookText);
    }

    const isSpecificBadgeOverride = input.badgeOverride && input.badgeOverride !== "auto";
    const badgeText = isSpecificBadgeOverride ? fallbackPlan.badgeText : parsed.badge_text || fallbackPlan.badgeText;

    const isGenericEnv =
      !parsed.environment_atmosphere ||
      /\b(plain|white background|simple cyclorama|flat gradient|neutral background|solid color)\b/i.test(parsed.environment_atmosphere);
    const environmentAtmosphere = isGenericEnv ? fallbackPlan.environmentAtmosphere : parsed.environment_atmosphere;

    const isGenericLight =
      !parsed.lighting_palette || /\b(standard lighting|plain lighting|default lighting|normal lighting)\b/i.test(parsed.lighting_palette);
    const lightingPalette = isGenericLight ? fallbackPlan.lightingPalette : parsed.lighting_palette;

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

    if (
      (layout === "yes_no") &&
      mascotPersona.prop &&
      /\b(paddle|true|false|yes|no|checkmark|cross|✅|❌)\b/i.test(mascotPersona.prop)
    ) {
      mascotPersona = {
        ...mascotPersona,
        prop: "hand resting thoughtfully under chin in skeptical contemplation",
      };
    }

    const subjectAnchors: QuizSubjectAnchor[] =
      parsed.subject_anchors && parsed.subject_anchors.length >= (input.editorial ? 1 : 2)
        ? parsed.subject_anchors.map((a, i) => ({
            label: a.label || `Option ${i + 1}`,
            visualPrompt: a.visualPrompt || `3D visual of Option ${i + 1}`,
            badge: a.badge,
          }))
        : fallbackPlan.subjectAnchors;

    input.logger?.ok("AI thumbnail planner generated plan successfully", {
      profileId: input.channelId,
      workerId: input.episodeId,
      step: "thumbnail_ai_planner",
      hook: hookText,
      costume: mascotPersona.costume,
    });

    const plan: QuizThumbnailPlan = {
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
    return input.editorial ? applyEditorialDesign(plan, input) : plan;
  } catch (err) {
    input.signal?.throwIfAborted();
    input.logger?.warn(
      `AI thumbnail planning encountered an error; falling back to topic-intelligent plan: ${err instanceof Error ? err.message : String(err)}`,
      {
        profileId: input.channelId,
        workerId: input.episodeId,
        step: "thumbnail_ai_planner",
      },
    );
    if (!input.editorial && GENERIC_CLICHE_PATTERN.test(fallbackPlan.hookText) && input.topicTitle && !isGenericQuizTitle(input.topicTitle)) {
      return {
        ...fallbackPlan,
        hookText: deriveTopicHeadlineFallback(input.topicTitle, fallbackPlan.hookText),
      };
    }
    return fallbackPlan;
  }
}
