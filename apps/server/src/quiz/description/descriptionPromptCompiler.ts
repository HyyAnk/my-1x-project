import type { Channel, Episode, QuizV2 } from "@studio/shared";
import { calculateScoringTiers, formatScoringRange } from "./scoringTiers.js";
import type { ProductLocalizationArtifact } from "../bank/localization/productLocalization.js";
import { describeAudienceCtaRule, resolveAudiencePolicy } from "./descriptionAudiencePolicy.js";
import {
  buildTitleContextLines,
  describeHookTitleRule,
  describePrimaryKeywordRule,
  type DescriptionTitleContext,
} from "./descriptionTitleAlignment.js";

export interface CompileVideoDescriptionPromptInput {
  quiz: QuizV2;
  channel: Channel;
  episode: Episode;
  toneHint?: string;
  targetLanguage?: string;
  localization?: ProductLocalizationArtifact | null;
  /** The episode's YouTube title, generated before the description so both target the same keyword. */
  videoTitle?: DescriptionTitleContext | null;
}

/**
 * Lists each question with its options but never marks the correct one,
 * so the model cannot leak answers it was never told.
 */
export function buildSpoilerFreeQuestionSummaries(quiz: QuizV2, localization?: ProductLocalizationArtifact | null): string {
  return quiz.questions
    .map((q, index) => {
      const locQ = localization?.status === "applied" ? localization.quiz_questions?.find((lq) => lq.question_id === q.id) : undefined;
      const questionText = locQ?.question || q.question;
      const choiceTexts = q.choices.map((choice) => locQ?.choices.find((c) => c.id === choice.id)?.text || choice.text);
      const options = choiceTexts.length > 2 ? ` | Options: ${choiceTexts.join(" / ")}` : "";
      return `Q${index + 1}: ${questionText}${options}`;
    })
    .join("\n");
}

/**
 * Compiles a structured, high-performing AI prompt to generate an optimized video description.
 * Implements the 12 Quiz Description rules with strict anti-hallucination, anti-spoiler and SEO LSI constraints.
 */
export function compileVideoDescriptionPrompt(input: CompileVideoDescriptionPromptInput): string {
  const { quiz, channel, episode, toneHint, targetLanguage, localization, videoTitle } = input;
  const questionCount = quiz.questions.length;
  const tiers = calculateScoringTiers(questionCount);
  const language = targetLanguage || localization?.target_language || channel.language || "English";
  const audience = resolveAudiencePolicy(episode.quiz_config?.age_band ?? quiz.age_band);

  const tier1Range = formatScoringRange(tiers.tier1.min, tiers.tier1.max, language);
  const tier2Range = formatScoringRange(tiers.tier2.min, tiers.tier2.max, language);
  const tier3Range = formatScoringRange(tiers.tier3.min, tiers.tier3.max, language);

  const isPreschool = episode.quiz_config?.age_band === "4-6" || /preschool|toddler/i.test(channel.target_audience);

  return [
    `You are an elite YouTube SEO strategist and copywriter for educational quiz channels.`,
    `Analyze the fact-checked Quiz script below and generate a high-performing video description.`,
    ``,
    `[CHANNEL & EPISODE CONTEXT]:`,
    `- Channel: "${channel.display_name}"`,
    `- Brand Name: "${episode.quiz_config?.channel_brand_name || channel.display_name}"`,
    `- Language: ${language}`,
    `- Topic Title: "${episode.topic.title}"`,
    ...buildTitleContextLines(videoTitle),
    `- Topic Hook: "${episode.topic.hook}"`,
    `- Total Questions (Exact Ground Truth): ${questionCount}`,
    `- Audience: ${audience.madeForKids ? "Made for Kids (comments disabled)" : "General audience (comments enabled)"}`,
    ...(toneHint ? [`- Tone Hint / Angle: "${toneHint}"`] : []),
    ``,
    `[SCORING TIERS (ranges are added automatically)]:`,
    `- Tier 1 (Beginner): ${tier1Range}`,
    `- Tier 2 (Intermediate): ${tier2Range}`,
    `- Tier 3 (Expert): ${tier3Range}`,
    ``,
    `[FACT-CHECKED QUESTIONS IN SCRIPT (answers intentionally withheld)]:`,
    buildSpoilerFreeQuestionSummaries(quiz, localization),
    ``,
    `[12 MANDATORY GENERATION RULES]:`,
    describePrimaryKeywordRule(videoTitle),
    `2. QUESTION COUNT: Explicitly mention the exact number (${questionCount}) in the hook. Do NOT alter or guess this number.`,
    `3. HOOK (2-3 lines, max 150 chars): Line 1 must contain the primary search keyword verbatim. Line 2 must use a natural synonym or semantic variation. Line 3 sets up the challenge.${describeHookTitleRule(videoTitle)}`,
    `4. LSI SEMANTIC PARAGRAPH: Write a cohesive, natural 3-4 sentence paragraph weaving specific entities and concepts directly from the questions above. Do NOT list items as bullet points. Do NOT invent concepts not in the script.`,
    `5. NO SPOILERS: Never state, hint at, or confirm any answer. Frame every entity as an open question or teaser (e.g. "Which country hides the Great Pyramid?"), never as a fact that resolves a question.`,
    `6. SCORING RANK TITLES: Return ONLY an engaging rank title per tier in ${language} (e.g. "Novice", "Scholar", "Master"). Do NOT write numbers or ranges; they are added automatically.`,
    `7. CALL TO ACTION: ${describeAudienceCtaRule(audience)}`,
    `8. PLAYLIST THEME: State 1 clean playlist category name (plain text only, NEVER invent or write URLs).`,
    `9. HASHTAGS: Provide 3-5 relevant hashtags: 1 niche brand/topic tag, 2 content keyword tags, and 1 general quiz tag (e.g. #quiz, #trivia, #education).`,
    `10. AUDIENCE COMPLIANCE: ${isPreschool ? "Preschool/young child audience allowed." : "Do NOT use sensitive keywords like 'for kids', 'toddler', 'preschool' unless strictly applicable."} Use fresh, engaging phrasing instead of generic template cliches.`,
    `11. ZERO HALLUCINATION: Ground 100% of facts in the provided question list.`,
    `12. ABSOLUTE LANGUAGE INTEGRITY: Write 100% strictly in ${language}. Never mix any other languages. All hook lines, paragraph sentences, rank titles, and comment prompts MUST be written exclusively in ${language}. Keep the full main description under 800 characters.`,
    ``,
    `Return ONLY a valid JSON object matching this exact schema:`,
    `{`,
    `  "topic_category": "Topic Category Name",`,
    `  "primary_keyword": "exact primary keyword phrase",`,
    `  "keyword_variations": ["variation 1", "variation 2"],`,
    `  "question_count": ${questionCount},`,
    `  "hook_lines": "Line 1 with keyword\\nLine 2 with variation\\nLine 3 challenge",`,
    `  "semantic_paragraph": "Natural 3-4 sentence teaser paragraph mentioning actual entities from questions without revealing answers.",`,
    `  "scoring_cta": {`,
    `    "beginner": "Rank Title 1",`,
    `    "intermediate": "Rank Title 2",`,
    `    "expert": "Rank Title 3",`,
    `    "cta_text": "Call to action following rule 7"`,
    `  },`,
    `  "suggested_playlist_category": "Playlist Category Name",`,
    `  "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4"]`,
    `}`,
  ].join("\n");
}
