import { buildEditorialPlannerPrompt } from "./editorial/editorialPlannerPrompt.js";
import { applyEditorialDesign } from "./editorial/editorialPlan.js";
import { EditorialAiPlanSchema } from "./editorial/editorialAiPlanSchema.js";
import { refineEditorialPlan } from "./editorial/refinement/editorialPlanRefiner.js";
import { executeSinglePromptText, type LLMClient } from "../../utils/promptSanitizer.js";
import { MASCOT_ARCHETYPES_CATALOG, selectRandomArchetypes, type MascotArchetypeDefinition } from "./thumbnailArchetypes.js";
import { resolveThumbnailLayout } from "./thumbnailLayoutResolver.js";
import { mergeAiPlanOutput, withTopicHeadlineFallback } from "./thumbnailAiPlanMerge.js";
import { parseAiPlanJson } from "./thumbnailAiPlanParser.js";
import type { AiThumbnailPlanOutput, PlanThumbnailWithAiInput } from "./thumbnailAiPlanTypes.js";
import type { QuizThumbnailPlan } from "./thumbnailTypes.js";

export type { PlanThumbnailWithAiInput } from "./thumbnailAiPlanTypes.js";
export { GENERIC_CLICHE_PATTERN } from "./thumbnailAiPlanMerge.js";
export { parseAiPlanJson } from "./thumbnailAiPlanParser.js";

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
    return withTopicHeadlineFallback(input, fallbackPlan);
  }

  try {
    return await planWithLlm(input, input.llmClient, fallbackPlan);
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
    return withTopicHeadlineFallback(input, fallbackPlan);
  }
}

async function planWithLlm(
  input: PlanThumbnailWithAiInput,
  llmClient: LLMClient,
  fallbackPlan: QuizThumbnailPlan,
): Promise<QuizThumbnailPlan> {
  input.logger?.info("Executing AI thumbnail planner prompt", {
    profileId: input.channelId,
    workerId: input.episodeId,
    step: "thumbnail_ai_planner",
    topic: input.topicTitle,
  });
  const directedArchetypes = input.archetypesOverride || selectRandomArchetypes(MASCOT_ARCHETYPES_CATALOG, 5);
  const plannerPrompt = buildAiPlannerPrompt(input, directedArchetypes);
  const rawResponse = await executeSinglePromptText(llmClient, plannerPrompt, {
    signal: input.signal,
    timeoutMs: 300_000,
    modelOverride: "flash",
  });

  const rawPlan = parseAiPlanJson(rawResponse);
  const parsed: AiThumbnailPlanOutput | null | undefined = input.editorial ? EditorialAiPlanSchema.safeParse(rawPlan).data : rawPlan;
  if (!parsed) {
    return withTopicHeadlineFallback(input, fallbackPlan);
  }

  input.signal?.throwIfAborted();
  const plan = mergeAiPlanOutput(input, parsed, fallbackPlan, directedArchetypes);

  input.logger?.ok("AI thumbnail planner generated plan successfully", {
    profileId: input.channelId,
    workerId: input.episodeId,
    step: "thumbnail_ai_planner",
    hook: plan.hookText,
    costume: plan.mascotPersona.costume,
  });

  return input.editorial ? applyEditorialDesign(plan, input) : plan;
}
