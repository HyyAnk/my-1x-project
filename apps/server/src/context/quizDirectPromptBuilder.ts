import {
  FRANCHISE_ANCHOR_MANDATE_LINES,
  GRAPHIC_IDENTITY_MANDATE_LINES,
  VISUAL_ANCHOR_MANDATE_LINES,
} from "../quiz/bank/prompts/archetypePromptGuidelines.js";
import { KID_SAFE_CONTENT_POLICY_LINES } from "../quiz/bank/prompts/kidAudiencePolicy.js";
import type { OutputContractInput } from "./taskInstructions.js";
import { resolveQuizPromptGameplay } from "./quizPromptGameplay.js";

export function buildDirectQuizOutputContract(input: OutputContractInput): string {
  const { episode, quizQuestionCount } = input;
  const quizConfig = episode?.quiz_config;
  const { isVersus, isMystery, isYesNo, questionFormat } = resolveQuizPromptGameplay(quizConfig);
  const targetLanguage = input.channelLanguage?.trim() || "en";
  const choiceCountDesc = isMystery
    ? "strictly exactly 1 choice with id 'choice-a' (the single canonical correct answer revealed after suspense)"
    : isVersus
      ? "exactly 2 choices with ids 'choice-a' and 'choice-b' (the two compared entities, not Yes / No labels)"
      : isYesNo
        ? "exactly 2 choices with ids 'choice-yes' and 'choice-no' (texts: 'Yes' / 'No')"
        : "strictly exactly 3 choices with ids 'choice-a', 'choice-b', and 'choice-c'";
  const questionPhrasingRule = isYesNo
    ? "Question phrasing & punctuation: Every question MUST be a natural, kid-friendly direct question (starting with Is / Are / Do / Does / Can / Did / Was / Were / Has) ending with ' Yes or No?' (e.g. 'Can penguins fly in the sky? Yes or No?'). Never write a flat statement to be judged true or false."
    : "Question phrasing & punctuation: Every question MUST always be an interrogative sentence ending with a question mark '?'. Never omit the question mark or end with a period.";
  const questionExample = isYesNo
    ? "Ultra-concise question ending with ' Yes or No?' (under 10 words, e.g. 'Can penguins fly? Yes or No?')"
    : "Ultra-concise child-friendly question ending with '?' (under 10 words, clear interrogative phrasing)";

  const choicesJson = isMystery
    ? `    { "id": "choice-a", "text": "Canonical correct answer text" }`
    : isVersus
      ? `    { "id": "choice-a", "text": "First compared entity" },\n    { "id": "choice-b", "text": "Second compared entity" }`
      : isYesNo
        ? `    { "id": "choice-yes", "text": "Yes" },\n    { "id": "choice-no", "text": "No" }`
        : `    { "id": "choice-a", "text": "Short distinct choice text" },\n    { "id": "choice-b", "text": "Short distinct choice text" },\n    { "id": "choice-c", "text": "Short distinct choice text" }`;

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
    `  "format": "${questionFormat}",`,
    ...(quizConfig?.archetype ? [`  "gameplay_id": "${quizConfig.archetype}",`] : isVersus ? [`  "gameplay_id": "versus_faceoff",`] : []),
    `  "answer_mode": "${isMystery ? "single_reveal" : "choice_selection"}",`,
    `  "difficulty": 1 to 5 (graded progressive difficulty),`,
    `  "question": "${questionExample}",`,
    `  "choices": [`,
    `${choicesJson}`,
    `  ],`,
    `  "correct_choice_id": "${isYesNo ? "choice-yes" : "choice-a"}" (must exactly match the id of the factually correct choice${isYesNo ? "; balance the episode with a roughly even mix of Yes and No answers" : ""}),`,
    `  "explanation": "Strictly 1 punchy, child-friendly fun fact under 10 words and under 70 characters",`,
    `  "fun_fact": "Same concise fun fact or interesting trivia nugget",`,
    `  "source_ids": ["C01"] (Claim ID matching question number),`,
    `  "visual_opportunity": "Detailed illustration prompt: for Brand Logos, Superhero Insignias, Emblems, Flags, or Graphic Symbols, explicitly specify the official isolated vector emblem/logo centered on a clean solid white background with zero products and zero 3D scenery per GRAPHIC IDENTITY MANDATE. For characters/creatures, name the subject/character and parent franchise with signature anatomy/costume details anchored in an authentic setting per VISUAL ANCHOR MANDATE. Clean artwork ONLY, zero text, zero UI.",`,
    `  "validation": { "semantic_status": "validated", "source_coverage": true, "fact_locked": true }`,
    `}`,
    ``,
    ...FRANCHISE_ANCHOR_MANDATE_LINES,
    ``,
    ...GRAPHIC_IDENTITY_MANDATE_LINES,
    ``,
    ...VISUAL_ANCHOR_MANDATE_LINES,
    ``,
    ...KID_SAFE_CONTENT_POLICY_LINES,
    ``,
    `Critical Rules:`,
    `1. Choice count: ${choiceCountDesc}. Never add extra choices.`,
    `2. ${questionPhrasingRule}`,
    `3. Franchise Anchoring: When generating questions about anime, manga, gaming, comics, movies, or fictional characters, ALWAYS explicitly name the parent franchise in the question hook using its short umbrella title (never include movie subtitles) per the FRANCHISE ANCHOR MANDATE.`,
    isMystery
      ? `4. Answer distribution: Always use choice-a for the single reveal answer.`
      : `4. Answer distribution: Vary and balance the correct_choice_id across questions (never place the correct answer in the same letter position for two consecutive questions).`,
    `5. Age appropriateness: Tailor question vocabulary and concepts strictly for age band "${quizConfig?.age_band ?? "7-9"}".`,
    `6. Visual Opportunity Entity & Setting Mandate: The "visual_opportunity" field is used directly by AI image generators to illustrate this question. You MUST construct it using the appropriate formula:`,
    `   a. GRAPHIC IDENTITIES (Brand Logos, Superhero Insignias, Emblems, Flags, Symbols): Illustrate the official, isolated vector logo, emblem, or symbol directly on a solid clean white background per the GRAPHIC IDENTITY MANDATE. NEVER draw commercial products (shoes, cans, cars, boxes), human models, or 3D room scenes.`,
    `   b. CHARACTERS & CREATURES: ALWAYS explicitly name the specific character/entity and their parent franchise or lore universe (e.g. 'Pikachu crackling with Thunderbolt sparks from Pokemon', 'Mario in his red cap and blue overalls from Super Mario Bros.'). Detail iconic identifying traits, gear, and silhouette. Anchor in an authentic, lore-accurate setting rather than an empty studio.`,
    `   c. SCENE PURITY & ZERO STYLE POLLUTION: Focus purely on scene content and target subject/emblem. NEVER copy/paste generic camera buzzwords (such as 'wildlife and nature photography style') or UI elements (cards, text, buttons, countdown timers).`,
    `7. VISUAL PROMPT LANGUAGE: The "visual_opportunity" field MUST ALWAYS be written 100% in English, even when "${targetLanguage}" is requested for the question and choices, because AI image generation models require English prompts.`,
    `8. ABSOLUTE LANGUAGE INTEGRITY: Write every question, choice text, explanation, and fun_fact 100% in "${targetLanguage}". Never mix any other language into the content.`,
    `9. STRICT JSON ESCAPING & QUOTATION: Inside all JSON string values (question, choices, explanation, fun_fact, visual_opportunity), NEVER use unescaped double quotes ("). Always use single quotes (') for all titles, names, spoken dialogue, quotes, and nicknames (e.g. 'Pac-Man', 'The King', never "Pac-Man"). Every property name must be enclosed in double quotes followed strictly by a colon ':' without trailing commas.`,
  ];

  return lines.join("\n");
}
