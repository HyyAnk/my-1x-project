import type { Channel, QuizShort, QuizV2 } from "@studio/shared";
import type { ProductLocalizationArtifact } from "../bank/localization/productLocalization.js";
import { describeAudienceCtaRule, resolveAudiencePolicy } from "./descriptionAudiencePolicy.js";
import { buildSpoilerFreeQuestionSummaries } from "./descriptionPromptCompiler.js";
import { buildTitleContextLines, describePrimaryKeywordRule, type DescriptionTitleContext } from "./descriptionTitleAlignment.js";
import { QUIZ_SHORT_REQUIRED_HASHTAGS, QUIZ_SHORT_SCORE_CTA_EN } from "./quizShortDescriptionFallbackLocales.js";
import { QUIZ_SHORT_DESCRIPTION_MAX_CHARS, QUIZ_SHORT_MAX_HASHTAGS, QUIZ_SHORT_MIN_HASHTAGS } from "./quizShortDescriptionFormatter.js";

export interface CompileQuizShortDescriptionPromptInput {
  quiz: QuizV2;
  channel: Channel;
  quizShort: Pick<QuizShort, "topic" | "quiz_config">;
  toneHint?: string;
  targetLanguage?: string;
  localization?: ProductLocalizationArtifact | null;
  /** The Quiz Short's title, generated first so both target the same keyword. */
  videoTitle?: DescriptionTitleContext | null;
}

/**
 * Compiles the Quiz Short description prompt: a two-line hook, one teaser sentence about the
 * hook question, the score CTA and three to five hashtags. No chapters, no scoring tiers.
 */
export function compileQuizShortDescriptionPrompt(input: CompileQuizShortDescriptionPromptInput): string {
  const { quiz, channel, quizShort, toneHint, targetLanguage, localization, videoTitle } = input;
  const questionCount = quiz.questions.length;
  const language = targetLanguage || localization?.target_language || channel.language || "English";
  const audience = resolveAudiencePolicy(quizShort.quiz_config?.age_band ?? quiz.age_band);
  const requiredTags = QUIZ_SHORT_REQUIRED_HASHTAGS.join(" and ");

  return [
    `You are an elite YouTube Shorts copywriter for educational quiz channels.`,
    `Write the description of a ${questionCount}-question vertical Quiz Short from the fact-checked questions below.`,
    ``,
    `[CHANNEL & QUIZ SHORT CONTEXT]:`,
    `- Channel: "${channel.display_name}"`,
    `- Brand Name: "${quizShort.quiz_config?.channel_brand_name || channel.display_name}"`,
    `- Language: ${language}`,
    `- Topic Title: "${quizShort.topic.title}"`,
    ...buildTitleContextLines(videoTitle),
    `- Topic Hook: "${quizShort.topic.hook}"`,
    `- Total Questions (Exact Ground Truth): ${questionCount}`,
    `- Audience: ${audience.madeForKids ? "Made for Kids" : "General audience"}`,
    ...(toneHint ? [`- Tone Hint / Angle: "${toneHint}"`] : []),
    ``,
    `[FACT-CHECKED QUESTIONS (answers intentionally withheld; question one is the hook)]:`,
    buildSpoilerFreeQuestionSummaries(quiz, localization),
    ``,
    `[MANDATORY GENERATION RULES]:`,
    describePrimaryKeywordRule(videoTitle),
    `2. HOOK (exactly 2 lines, max 120 chars total): Line 1 contains the primary keyword verbatim. Line 2 sets up the ${questionCount}-question challenge.`,
    `3. TEASER (1 sentence, max 160 chars): Tease question one as an open question. Never list the other questions.`,
    `4. NO SPOILERS: Never state, hint at, or confirm any answer.`,
    `5. SCORE CTA: One sentence inviting viewers to comment how many they got right, in ${language}. English reference: "${QUIZ_SHORT_SCORE_CTA_EN}". ${describeAudienceCtaRule(audience)}`,
    `6. HASHTAGS: ${QUIZ_SHORT_MIN_HASHTAGS} to ${QUIZ_SHORT_MAX_HASHTAGS} hashtags. ${requiredTags} are mandatory; add 1 to 3 topic tags.`,
    `7. NO CHAPTERS, no timestamps, no scoring tiers, no playlist links, no URLs.`,
    `8. LENGTH: The whole description must stay under ${QUIZ_SHORT_DESCRIPTION_MAX_CHARS} characters.`,
    `9. ZERO HALLUCINATION: Ground every fact in the question list above.`,
    `10. LANGUAGE INTEGRITY: Write 100% in ${language}; the hashtags ${requiredTags} always stay as written.`,
    ``,
    `Return ONLY a valid JSON object matching this exact schema:`,
    `{`,
    `  "topic_category": "Topic Category Name",`,
    `  "primary_keyword": "exact primary keyword phrase",`,
    `  "keyword_variations": ["variation 1", "variation 2"],`,
    `  "hook_lines": "Line 1 with keyword\\nLine 2 challenge",`,
    `  "teaser": "One open-question teaser sentence about question one.",`,
    `  "score_cta": "Score CTA sentence following rule 5",`,
    `  "hashtags": ["#Shorts", "#quiz", "#topic"]`,
    `}`,
  ].join("\n");
}
