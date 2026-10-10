import { VIDEO_TITLE_KEYWORD_WINDOW_CHARS } from "@studio/shared";
import { QUIZ_SHORT_TITLE_MAX_CHARS, QUIZ_SHORT_TITLE_SUFFIX } from "./quizShortTitleRules.js";

const BODY_BUDGET = QUIZ_SHORT_TITLE_MAX_CHARS - QUIZ_SHORT_TITLE_SUFFIX.length;

/**
 * Prompt rules for the Quiz Short title: a punchy hook under 70 characters that ends with
 * " #Shorts". No question-count requirement; the cover badge already carries the count.
 */
export function buildQuizShortTitleRuleLines(language: string, madeForKids: boolean): string[] {
  return [
    `[TITLE FORMULA (keyword-first + curiosity hook, built for the Shorts feed)]:`,
    `<Primary Keyword>: <Short Challenge Hook>${QUIZ_SHORT_TITLE_SUFFIX}`,
    `Adapt the word order naturally to ${language}. Example in English: "Planet Quiz: Can You Beat All 5?${QUIZ_SHORT_TITLE_SUFFIX}".`,
    ``,
    `[MANDATORY RULES]:`,
    `1. PRIMARY KEYWORD: Pick the 2-4 word phrase viewers type into search for this topic. It MUST appear verbatim and start within the first ${VIDEO_TITLE_KEYWORD_WINDOW_CHARS} characters.`,
    `2. LENGTH: The whole title including "${QUIZ_SHORT_TITLE_SUFFIX.trim()}" must stay within ${QUIZ_SHORT_TITLE_MAX_CHARS} characters, so write at most ${BODY_BUDGET} characters before the suffix.`,
    `3. SUFFIX: End the title with exactly "${QUIZ_SHORT_TITLE_SUFFIX}". No other hashtags anywhere.`,
    `4. HOOK: One short curiosity or challenge phrase about question one (e.g. "Can You Beat All 5?", "Only 1 in 10 Get This"). Never invent statistics presented as facts.`,
    `5. NO SPOILERS: Never state or hint at any correct answer.`,
    `6. HONEST: The title must match the real content. No misleading clickbait.`,
    `7. FORMATTING: Title Case in English, natural casing in other languages. No ALL CAPS words except real acronyms. No emoji, channel name, "Part/Episode" numbering, or the characters < and >.`,
    `8. AUDIENCE: ${madeForKids ? `Friendly and encouraging. No fear or shock words such as "impossible", "insane" or "only geniuses".` : `Do not add "for kids", "toddler" or "preschool".`}`,
    `9. LANGUAGE INTEGRITY: Write the title and keyword 100% in ${language}; the suffix "${QUIZ_SHORT_TITLE_SUFFIX.trim()}" always stays in English.`,
  ];
}
