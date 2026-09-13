import type { Episode, QuizImageStyle } from "@studio/shared";
import { QUIZ_STYLE_CONTRACTS } from "../quiz/assets/promptCompiler.js";
import { FRANCHISE_ANCHOR_MANDATE_LINES, VISUAL_ANCHOR_MANDATE_LINES } from "../quiz/bank/prompts/archetypePromptGuidelines.js";
import type { OutputContractInput } from "./taskInstructions.js";

function resolveVisualStyleContract(episode: Episode | null) {
  const resolvedStyle: QuizImageStyle = episode?.quiz_config?.resolved_visual_style ?? "pixar_3d";
  return QUIZ_STYLE_CONTRACTS[resolvedStyle] || QUIZ_STYLE_CONTRACTS.pixar_3d;
}

export function buildDirectQuizOutputContract(input: OutputContractInput): string {
  const { episode, quizQuestionCount } = input;
  const quizConfig = episode?.quiz_config;
  const isTrueFalse = quizConfig?.quiz_format === "true_false";
  const styleContract = resolveVisualStyleContract(episode);
  const targetLanguage = input.channelLanguage?.trim() || "en";
  const choiceCountDesc = isTrueFalse
    ? "exactly 2 choices with ids 'choice-true' and 'choice-false' (texts: 'True' / 'False')"
    : "strictly exactly 3 choices with ids 'choice-a', 'choice-b', and 'choice-c'";
  const questionPhrasingRule = isTrueFalse
    ? "Question phrasing & punctuation: Every question MUST end with a question mark '?'. Never write a flat declarative statement ending with a period. Phrase it either as an interrogative challenge (e.g. 'Did player two steer the ducks in Duck Hunt?', 'Do classic arcade light guns shoot real laser beams?') or as an engaging True/False question prompt (e.g. 'Is it true that player two could steer the ducks in Duck Hunt?')."
    : "Question phrasing & punctuation: Every question MUST always be an interrogative sentence ending with a question mark '?'. Never omit the question mark or end with a period.";
  const questionExample = isTrueFalse
    ? "Ultra-concise question ending with '?' (under 10 words, e.g. 'Did player two steer the ducks in Duck Hunt?' or 'Is it true that...?')"
    : "Ultra-concise child-friendly question ending with '?' (under 10 words, clear interrogative phrasing)";

  const lines = [
    `Return ONLY a raw, valid JSON object matching QuizV2 schema (no markdown fences, no thought or commentary).`,
    `The JSON object MUST contain:`,
    `- "schema_version": 2`,
    `- "episode_id": "${episode?.episode_id ?? "episode"}"`,
    `- "age_band": "${quizConfig?.age_band ?? "7-9"}"`,
    `- "language": "${targetLanguage}"`,
    `- "questions": array of exactly ${quizQuestionCount} question objects numbered sequentially 1 to ${quizQuestionCount}.`,
    ``,
    `Each question in the "questions" array MUST follow this exact schema:`,
    `{`,
    `  "id": "question-01" (padded 2 digits),`,
    `  "number": 1 (sequential integer starting from 1),`,
    `  "format": "${quizConfig?.quiz_format ?? "text_multiple_choice"}",`,
    `  "difficulty": 1 to 5 (graded progressive difficulty),`,
    `  "question": "${questionExample}",`,
    `  "choices": [`,
    `    { "id": "choice-a", "text": "Short distinct choice text" },`,
    `    { "id": "choice-b", "text": "Short distinct choice text" },`,
    `    { "id": "choice-c", "text": "Short distinct choice text" }`,
    `  ],`,
    `  "correct_choice_id": "choice-a" (must exactly match one of the choice ids),`,
    `  "explanation": "Strictly 1 punchy, child-friendly fun fact under 10 words and under 70 characters",`,
    `  "fun_fact": "Same concise fun fact or interesting trivia nugget",`,
    `  "source_ids": ["C01"] (Claim ID matching question number),`,
    `  "visual_opportunity": "Detailed illustration prompt: explicitly name the subject/character and parent franchise (e.g. 'Eren Yeager in Attack Titan form from Attack on Titan', 'Tanjiro Kamado from Demon Slayer'). Include signature anatomy/costume details and anchor in an authentic, iconic world-specific environment (e.g. 'standing before the colossal stone Wall Maria in Shiganshina district with billowing transformation steam and yellow lightning sparks'). Clean artwork ONLY, zero text, zero UI.",`,
    `  "validation": { "semantic_status": "validated", "source_coverage": true, "fact_locked": true }`,
    `}`,
    ``,
    ...FRANCHISE_ANCHOR_MANDATE_LINES,
    ``,
    ...VISUAL_ANCHOR_MANDATE_LINES,
    ``,
    `Critical Rules:`,
    `1. Choice count: ${choiceCountDesc}. Never add extra choices.`,
    `2. ${questionPhrasingRule}`,
    `3. Franchise Anchoring: When generating questions about anime, manga, gaming, comics, movies, or fictional characters, ALWAYS explicitly name the parent franchise in the question hook per the FRANCHISE ANCHOR MANDATE.`,
    `4. Answer distribution: Vary and balance the correct_choice_id across questions (never place the correct answer in the same letter position for two consecutive questions).`,
    `5. Age appropriateness: Tailor question vocabulary and concepts strictly for age band "${quizConfig?.age_band ?? "7-9"}".`,
    `6. Visual Opportunity Entity & Setting Mandate: The "visual_opportunity" field is used directly by AI image generators to illustrate this question. You MUST construct it using the 4-part visual formula:`,
    `   a. ENTITY & FRANCHISE IDENTITY: ALWAYS explicitly name the specific character/entity and their parent franchise or lore universe (e.g. 'Eren Yeager in Attack Titan form from Attack on Titan', 'Izuku Midoriya (Deku) in U.A. hero costume from My Hero Academia', 'Son Goku in Super Saiyan form from Dragon Ball Z'). NEVER write vague generic descriptions like 'a muscular giant', 'a superhero', or 'a swordsman'.`,
    `   b. SIGNATURE PHYSICAL ANATOMY & COSTUME: Detail iconic identifying traits, gear, and silhouette (e.g. jagged lipless teeth, pointed titan ears, glowing green eyes, green-checkered haori, hanafuda earrings).`,
    `   c. ICONIC ENVIRONMENT & CONTEXT: Anchor the subject in its authentic, lore-accurate setting (e.g. the 50-meter stone Wall Maria, Shiganshina district rooftops, billowing heat steam, yellow lightning transformation sparks) rather than a generic or blank backdrop.`,
    `   d. SCENE PURITY & ZERO STYLE POLLUTION: Focus purely on scene content, subject action, and atmospheric environment. NEVER copy/paste generic camera buzzwords (such as 'wildlife and nature photography style') or UI elements (cards, text, buttons, countdown timers).`,
    `7. VISUAL PROMPT LANGUAGE: The "visual_opportunity" field MUST ALWAYS be written 100% in English, even when "${targetLanguage}" is requested for the question and choices, because AI image generation models require English prompts.`,
    `8. ABSOLUTE LANGUAGE INTEGRITY: Write every question, choice text, explanation, and fun_fact 100% in "${targetLanguage}". Never mix any other language into the content.`,
  ];

  return lines.join("\n");
}
