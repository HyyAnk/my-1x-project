import type { QuizShort, QuizV2 } from "@studio/shared";
import { executeSinglePromptText, type LLMClient } from "../../utils/promptSanitizer.js";
import {
  MASCOT_ARCHETYPES_CATALOG,
  selectRandomArchetypes,
  selectRandomVariation,
  type MascotArchetypeDefinition,
} from "./thumbnailArchetypes.js";
import { sanitizeThumbnailHook } from "./thumbnailHookGuardrail.js";
import { parseQuizShortCoverPlanResponse, type QuizShortCoverPersona } from "./quizShortCoverPlanResponse.js";

export type { QuizShortCoverPersona } from "./quizShortCoverPlanResponse.js";

/** The first question drives the cover: it is the hook the viewer must answer within seconds. */
export type QuizShortHookQuestion = {
  question: string;
  choices: string[];
  correctChoiceText: string;
  /** Short uppercase banner text derived from the question, never the answer. */
  hookText: string;
};

export interface PlanQuizShortCoverInput {
  quizShort: QuizShort;
  quiz: QuizV2;
  mascotName?: string | null;
  llmClient?: LLMClient | null;
  signal?: AbortSignal;
  archetypesOverride?: MascotArchetypeDefinition[];
  rng?: () => number;
  /** Which quiz question the hook is written from; defaults to question one. */
  questionIndex?: number;
  /** Hooks of earlier covers that the new plan must not repeat. */
  avoidHooks?: readonly string[];
}

function sanitizeUntrusted(text: string | undefined | null): string {
  if (!text) return "";
  return JSON.stringify(text).slice(1, -1).replace(/</g, "\\u003c").replace(/>/g, "\\u003e");
}

export function resolveQuizShortHookQuestionIndex(quiz: Pick<QuizV2, "questions">, requested?: number): number {
  if (requested === undefined || !Number.isInteger(requested) || requested < 0) return 0;
  return Math.min(requested, Math.max(0, quiz.questions.length - 1));
}

export function resolveQuizShortHookQuestion(
  quiz: QuizV2,
  quizShort: Pick<QuizShort, "topic">,
  questionIndex?: number,
): QuizShortHookQuestion {
  const first = quiz.questions[resolveQuizShortHookQuestionIndex(quiz, questionIndex)];
  if (!first) {
    return { question: quizShort.topic.hook, choices: [], correctChoiceText: "", hookText: sanitizeThumbnailHook(quizShort.topic.hook) };
  }
  const correct = first.choices.find((choice) => choice.id === first.correct_choice_id);
  return {
    question: first.question,
    choices: first.choices.map((choice) => choice.text),
    correctChoiceText: correct?.text ?? "",
    hookText: sanitizeThumbnailHook(first.question, sanitizeThumbnailHook(quizShort.topic.hook)),
  };
}

/** Badge text such as "5 QUESTIONS", always built from the real question count. */
export function formatQuizShortQuestionBadge(questionCount: number): string {
  return `${questionCount} ${questionCount === 1 ? "QUESTION" : "QUESTIONS"}`;
}

export function buildQuizShortCoverPlannerPrompt(input: PlanQuizShortCoverInput, archetypes: readonly MascotArchetypeDefinition[]): string {
  const hook = resolveQuizShortHookQuestion(input.quiz, input.quizShort, input.questionIndex);
  const avoidHooks = (input.avoidHooks ?? []).filter((text) => text.trim().length > 0);
  const archetypesSection = archetypes
    .map((a, i) => `Variation ${i + 1} (Archetype ID ${a.id}: "${a.name}"):\n- Core Emotional/Behavioral Direction: ${a.guideline}`)
    .join("\n\n");
  return [
    "You are a vertical video cover visual director for a kid-safe educational quiz channel.",
    "Plan friendly, high-energy 9:16 portrait cover character variations for a Quiz Short.",
    "",
    "[QUIZ SHORT CONTEXT]:",
    "<context>",
    `Mascot Character: "${sanitizeUntrusted(input.mascotName || "Mascot")}"`,
    `Topic: "${sanitizeUntrusted(input.quizShort.topic.title)}"`,
    `Premise: "${sanitizeUntrusted(input.quizShort.topic.premise)}"`,
    `Hook Question: "${sanitizeUntrusted(hook.question)}"`,
    `Previous Hook Banners (do not repeat): ${avoidHooks.map((text) => `"${sanitizeUntrusted(text)}"`).join(", ") || "none"}`,
    `Visible Choices: ${hook.choices.map((choice) => `"${sanitizeUntrusted(choice)}"`).join(", ") || "none"}`,
    `Question Count Badge: "${formatQuizShortQuestionBadge(input.quiz.questions.length)}"`,
    "</context>",
    "",
    "[SELECTED EMOTIONAL & BEHAVIORAL ARCHETYPES]:",
    archetypesSection,
    "",
    "[INSTRUCTIONS]:",
    "Generate distinct mascot persona variations matching each assigned archetype above.",
    "STRICT RULES:",
    "- Tailor costumes, props, and actions to the hook question's subject.",
    "- Kid-safe only: no fear, horror, violence, weapons, or shock imagery. Curiosity, wonder and playful suspense instead.",
    "- Write everything in English.",
    "- DO NOT reveal, name or hint at the correct answer in any visual element.",
    "- DO NOT rely on generic pointing poses or static standing postures.",
    "- For each variation write a DIFFERENT hook banner: 3 to 6 words, uppercase, a curiosity teaser about the hook question.",
    "- Hook banners must not repeat any previous hook banner listed above and must never contain the answer.",
    "",
    "Respond with ONLY valid JSON matching this schema:",
    "{",
    '  "variations": [',
    "    {",
    '      "id": 1,',
    '      "archetypeId": 1,',
    '      "archetypeName": "<Archetype Name>",',
    '      "role": "<Contextual role tailored to the hook question>",',
    '      "costume": "<Specific costume tailored to the topic, or none>",',
    '      "prop": "<Contextual prop or thematic item>",',
    '      "expression": "<Expressive, friendly facial expression fitting the archetype>",',
    '      "poseDescription": "<Dynamic action and full-body posture embodying the archetype>",',
    '      "dramaticHook": "<Brief visual climax description>",',
    '      "hookText": "<3 to 6 word uppercase curiosity banner>"',
    "    }",
    "  ]",
    "}",
  ].join("\n");
}

export function createFallbackQuizShortCoverPersona(
  archetype: MascotArchetypeDefinition,
  mascotName?: string | null,
): QuizShortCoverPersona {
  const name = mascotName || "Character";
  return {
    archetypeId: archetype.id,
    archetypeName: archetype.name,
    role: `${name} as ${archetype.name}`,
    expression: archetype.guideline,
    poseDescription: `${name} in a dynamic full-body posture embodying ${archetype.name}: ${archetype.guideline}`,
  };
}

/**
 * Plans the mascot persona for a Quiz Short cover from the hook question. Falls back to a
 * catalog archetype whenever the planner is unavailable or returns nothing usable.
 */
export async function planQuizShortCoverWithAI(input: PlanQuizShortCoverInput): Promise<QuizShortCoverPersona> {
  const rng = input.rng ?? Math.random;
  const candidatePool = input.archetypesOverride || selectRandomArchetypes(MASCOT_ARCHETYPES_CATALOG, 3, rng);
  const fallbackArchetype = candidatePool[0] ?? MASCOT_ARCHETYPES_CATALOG[0];
  const fallbackPersona = createFallbackQuizShortCoverPersona(fallbackArchetype, input.mascotName);
  if (!input.llmClient) return fallbackPersona;

  try {
    const rawResponse = await executeSinglePromptText(input.llmClient, buildQuizShortCoverPlannerPrompt(input, candidatePool), {
      signal: input.signal,
      timeoutMs: 300_000,
      modelOverride: "flash",
    });
    const variations = parseQuizShortCoverPlanResponse(rawResponse, candidatePool, fallbackPersona);
    if (variations.length === 0) return fallbackPersona;
    return selectRandomVariation(variations, rng)?.selected ?? variations[0];
  } catch {
    return fallbackPersona;
  }
}
