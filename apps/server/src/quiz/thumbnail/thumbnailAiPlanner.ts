import type { MascotProfile, ThumbnailAspectRatio, ThumbnailLayoutType } from "@studio/shared";
import { executeSinglePromptText, type LLMClient } from "../../utils/promptSanitizer.js";
import { resolveThumbnailLayout } from "./thumbnailLayoutResolver.js";
import type { MascotThemedPersona, QuizSubjectAnchor, QuizThumbnailPlan, ResolveThumbnailInput } from "./thumbnailTypes.js";

export type PlanThumbnailWithAiInput = ResolveThumbnailInput & {
  llmClient?: LLMClient | null;
  signal?: AbortSignal;
};

interface AiThumbnailPlanOutput {
  hook_text?: string;
  badge_text?: string;
  layout?: ThumbnailLayoutType;
  environment_atmosphere?: string;
  lighting_palette?: string;
  mascot_persona?: Partial<MascotThemedPersona>;
  subject_anchors?: Array<{ label?: string; visualPrompt?: string; badge?: string }>;
}

function buildAiPlannerPrompt(input: PlanThumbnailWithAiInput): string {
  const sampleQuestions = (input.questions || []).slice(0, 4).map((q, i) => ({
    number: i + 1,
    question: q.question,
    choices: q.choices,
    answer: q.answer,
  }));

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
    `1. hook_text: Catchy headline (2-4 words MAX in ${input.language || "English"}). Specifically about the episode's subject (e.g. if topic is Cookies/Baking -> "WORLD COOKIE TOUR!" or "BAKES OF THE WORLD!"). NEVER output generic "GENERAL KNOWLEDGE".`,
    `2. badge_text: High-CTR curiosity badge (e.g. "99% FAIL! 🔥", "10 SECONDS! ⏱️", "${input.questionCount || 10} QUESTIONS").`,
    "3. layout: Select best layout: [\"mega_grid\", \"split_vs\", \"mystery_silhouette\", \"odd_one_out\", \"difficulty_tier\", \"true_false\"].",
    "4. environment_atmosphere: A clean minimalist, soft-focus Pixar 3D studio background specifically tailored to this episode's topic with heavy depth of field, smooth warm gradients, and ZERO busy landscape clutter (NO dense bushes, NO distracting weeds/rocks, NO messy background particles).",
    "5. lighting_palette: Rich saturated warm studio lighting with luminous rim lighting on foreground characters.",
    "6. mascot_persona: Tailor mascot's role, costume, prop, expression, and pose specifically to the topic with joyful Pixar expressions.",
    "7. subject_anchors: 2 to 4 concrete 3D visual objects. STRICT: Objects must float cleanly with ZERO numbers (NO 1, 2, 3, 4), ZERO card boxes, ZERO white frames.",
    "",
    "Respond with ONLY valid JSON matching this schema:",
    "{",
    "  \"hook_text\": \"WORLD COOKIE TOUR!\",",
    "  \"badge_text\": \"11 QUESTIONS\",",
    "  \"layout\": \"mega_grid\",",
    "  \"environment_atmosphere\": \"Clean minimalist bakery studio with soft warm golden oven glow in heavy soft depth of field\",",
    "  \"lighting_palette\": \"Warm amber, golden apricot, soft luminous rim lighting on characters and pastries\",",
    "  \"mascot_persona\": {",
    "    \"role\": \"Pastry Chef\",",
    "    \"costume\": \"White chef toque and baker apron with flour dusted pockets\",",
    "    \"prop\": \"Wooden rolling pin and tray of golden baked cookies\",",
    "    \"expression\": \"Delighted, proud, mouth-watering excited smile\",",
    "    \"poseDescription\": \"Enthusiastically pointing toward the delicious cookie challenge\"",
    "  },",
    "  \"subject_anchors\": [",
    "    { \"label\": \"Option 1\", \"visualPrompt\": \"3D delicious pastel French Macaron cookie tower\" },",
    "    { \"label\": \"Option 2\", \"visualPrompt\": \"3D golden British Shortbread biscuit with butter glaze\" }",
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
    const plannerPrompt = buildAiPlannerPrompt(input);
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
    const badgeText = input.badgeOverride || parsed.badge_text || fallbackPlan.badgeText;
    const environmentAtmosphere = parsed.environment_atmosphere || fallbackPlan.environmentAtmosphere;
    const lightingPalette = parsed.lighting_palette || fallbackPlan.lightingPalette;

    const mascotPersona: MascotThemedPersona = {
      role: parsed.mascot_persona?.role || fallbackPlan.mascotPersona.role,
      costume: parsed.mascot_persona?.costume || fallbackPlan.mascotPersona.costume,
      prop: parsed.mascot_persona?.prop || fallbackPlan.mascotPersona.prop,
      expression: parsed.mascot_persona?.expression || fallbackPlan.mascotPersona.expression,
      poseDescription: parsed.mascot_persona?.poseDescription || fallbackPlan.mascotPersona.poseDescription,
    };

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
      subjectAnchors,
    };
  } catch {
    return fallbackPlan;
  }
}

