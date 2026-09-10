import type { Episode, QuizImageStyle } from "@studio/shared";
import { QUIZ_STYLE_CONTRACTS } from "../quiz/assets/promptCompiler.js";
import type { OutputContractInput } from "./taskInstructions.js";
import { GENERAL_COPYRIGHT_CONSTRAINTS, resolveTopicCopyrightGuidance } from "./quizDirectCopyrightGuidance.js";

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
  const copyrightGuidance = resolveTopicCopyrightGuidance(episode);
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
    `  "visual_opportunity": "Anchor illustration prompt for this question: describe the clean hero subject and environment in ${styleContract.continuityPromptBrief}. NEVER include text, UI cards, answer choices, buttons, or countdown timers.",`,
    `  "validation": { "semantic_status": "validated", "source_coverage": true, "fact_locked": true }`,
    `}`,
    ``,
    `Critical Rules:`,
    `1. Choice count: ${choiceCountDesc}. Never add extra choices.`,
    `2. ${questionPhrasingRule}`,
    `3. Answer distribution: Vary and balance the correct_choice_id across questions (never place the correct answer in the same letter position for two consecutive questions).`,
    `4. Age appropriateness: Tailor question vocabulary and concepts strictly for age band "${quizConfig?.age_band ?? "7-9"}".`,
    `5. Visual prompt purity: The "visual_opportunity" field is used by the AI image generator to illustrate this specific question. Focus purely on vibrant character/animal/subject illustration.`,
    `6. ABSOLUTE LANGUAGE INTEGRITY: Write every question, choice text, explanation, and fun_fact 100% in "${targetLanguage}". Never mix any other language into the content.`,
    `7. ${GENERAL_COPYRIGHT_CONSTRAINTS}`,
  ];

  if (copyrightGuidance.hasHighRiskReference && copyrightGuidance.mitigationPrompt) {
    lines.push(``, copyrightGuidance.mitigationPrompt);
  }

  return lines.join("\n");
}
