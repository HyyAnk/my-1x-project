import {
  FRANCHISE_ANCHOR_MANDATE_LINES,
  GRAPHIC_IDENTITY_MANDATE_LINES,
  VISUAL_ANCHOR_MANDATE_LINES,
} from "../quiz/bank/prompts/archetypePromptGuidelines.js";
import type { OutputContractInput } from "./taskInstructions.js";
import { resolveQuizPromptGameplay } from "./quizPromptGameplay.js";

export function buildDirectQuizOutputContract(input: OutputContractInput): string {
  const { episode, quizQuestionCount } = input;
  const quizConfig = episode?.quiz_config;
  const { isVersus, isMystery, isTrueFalse, questionFormat } = resolveQuizPromptGameplay(quizConfig);
  const targetLanguage = input.channelLanguage?.trim() || "en";
  const choiceCountDesc = isMystery
    ? "strictly exactly 1 choice with id 'choice-a' (the single canonical correct answer revealed after suspense)"
    : isVersus
      ? "exactly 2 choices with ids 'choice-a' and 'choice-b' (the two compared entities, not True / False labels)"
      : isTrueFalse
        ? "exactly 2 choices with ids 'choice-true' and 'choice-false' (texts: 'True' / 'False')"
        : "strictly exactly 3 choices with ids 'choice-a', 'choice-b', and 'choice-c'";
  const questionPhrasingRule = isTrueFalse
    ? "Question phrasing & punctuation: Every question MUST end with a question mark '?'. Never write a flat declarative statement ending with a period. Phrase it either as an interrogative challenge (e.g. 'Did player two steer the ducks in Duck Hunt?', 'Do classic arcade light guns shoot real laser beams?') or as an engaging True/False question prompt (e.g. 'Is it true that player two could steer the ducks in Duck Hunt?')."
    : "Question phrasing & punctuation: Every question MUST always be an interrogative sentence ending with a question mark '?'. Never omit the question mark or end with a period.";
  const questionExample = isTrueFalse
    ? "Ultra-concise question ending with '?' (under 10 words, e.g. 'Did player two steer the ducks in Duck Hunt?' or 'Is it true that...?')"
    : "Ultra-concise child-friendly question ending with '?' (under 10 words, clear interrogative phrasing)";

  const choicesJson = isMystery
    ? `    { "id": "choice-a", "text": "Canonical correct answer text" }`
    : isVersus
      ? `    { "id": "choice-a", "text": "First compared entity" },\n    { "id": "choice-b", "text": "Second compared entity" }`
      : isTrueFalse
        ? `    { "id": "choice-true", "text": "True" },\n    { "id": "choice-false", "text": "False" }`
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
    `  "correct_choice_id": "${isTrueFalse ? "choice-true" : "choice-a"}" (must exactly match one of the choice ids),`,
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
    `   b. CHARACTERS & CREATURES: ALWAYS explicitly name the specific character/entity and their parent franchise or lore universe (e.g. 'Eren Yeager in Attack Titan form from Attack on Titan', 'Izuku Midoriya (Deku) in U.A. hero costume from My Hero Academia'). Detail iconic identifying traits, gear, and silhouette. Anchor in an authentic, lore-accurate setting rather than an empty studio.`,
    `   c. SCENE PURITY & ZERO STYLE POLLUTION: Focus purely on scene content and target subject/emblem. NEVER copy/paste generic camera buzzwords (such as 'wildlife and nature photography style') or UI elements (cards, text, buttons, countdown timers).`,
    `7. VISUAL PROMPT LANGUAGE: The "visual_opportunity" field MUST ALWAYS be written 100% in English, even when "${targetLanguage}" is requested for the question and choices, because AI image generation models require English prompts.`,
    `8. ABSOLUTE LANGUAGE INTEGRITY: Write every question, choice text, explanation, and fun_fact 100% in "${targetLanguage}". Never mix any other language into the content.`,
  ];

  return lines.join("\n");
}
