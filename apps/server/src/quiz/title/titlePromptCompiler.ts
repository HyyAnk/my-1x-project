import { VIDEO_TITLE_KEYWORD_WINDOW_CHARS, VIDEO_TITLE_MAX_CHARS, VIDEO_TITLE_VISIBLE_CHARS, type Channel, type Episode, type QuizV2 } from "@studio/shared";
import type { ProductLocalizationArtifact } from "../bank/localization/productLocalization.js";
import { resolveAudiencePolicy } from "../description/descriptionAudiencePolicy.js";
import { buildSpoilerFreeQuestionSummaries } from "../description/descriptionPromptCompiler.js";
import type { TitleIssue } from "./videoTitle.types.js";

const MAX_RECENT_TITLES_IN_PROMPT = 15;

export interface CompileVideoTitlePromptInput {
  quiz: QuizV2;
  channel: Channel;
  episode: Episode;
  language: string;
  localization?: ProductLocalizationArtifact | null;
  thumbnailHookText?: string | null;
  recentTitles: string[];
  toneHint?: string;
}

function buildContextLines(input: CompileVideoTitlePromptInput, madeForKids: boolean): string[] {
  const { channel, episode, quiz, language, thumbnailHookText, toneHint } = input;
  return [
    `[CHANNEL & EPISODE CONTEXT]:`,
    `- Channel: "${channel.display_name}"`,
    `- Language: ${language}`,
    `- Working Topic Title (internal, rewrite it for search): "${episode.topic.title}"`,
    `- Topic Hook: "${episode.topic.hook}"`,
    `- Exact Question Count: ${quiz.questions.length}`,
    `- Audience: ${madeForKids ? "Made for Kids (children under 13)" : "General audience"}`,
    `- Thumbnail Text (already printed on the thumbnail): ${thumbnailHookText?.trim() ? `"${thumbnailHookText.trim()}"` : "none"}`,
    ...(toneHint ? [`- Tone Hint / Angle: "${toneHint}"`] : []),
  ];
}

function buildRecentTitleLines(recentTitles: string[]): string[] {
  const titles = recentTitles.slice(0, MAX_RECENT_TITLES_IN_PROMPT);
  if (titles.length === 0) return [];
  return [``, `[RECENT TITLES ON THIS CHANNEL (your title must clearly differ from all of them)]:`, ...titles.map((title) => `- ${title}`)];
}

function buildRuleLines(questionCount: number, language: string, madeForKids: boolean): string[] {
  return [
    `[TITLE FORMULA (keyword-first + number + challenge hook)]:`,
    `<Primary Keyword> Quiz: ${questionCount} <Topic> Questions <Challenge Hook>`,
    `Adapt the word order naturally to ${language}. Example in English: "World Geography Quiz: ${questionCount} Questions Only Experts Get Right".`,
    ``,
    `[MANDATORY RULES]:`,
    `1. PRIMARY KEYWORD: Pick the 2-4 word phrase viewers actually type into YouTube search for this topic (e.g. "world geography quiz"). It MUST appear verbatim and start within the first ${VIDEO_TITLE_KEYWORD_WINDOW_CHARS} characters.`,
    `2. LENGTH: Aim for 45-${VIDEO_TITLE_VISIBLE_CHARS} characters so nothing is cut off on mobile. Never exceed ${VIDEO_TITLE_MAX_CHARS} characters.`,
    `3. NUMBER: Include the exact question count (${questionCount}) as digits. Never invent statistics or percentages.`,
    `4. CHALLENGE HOOK: Close with a short curiosity or challenge phrase (e.g. "Can You Score ${questionCount}/${questionCount}?", "How Many Can You Get Right?").`,
    `5. NO SPOILERS: Never state or hint at any correct answer.`,
    `6. HONEST: The title must match the real content. No misleading clickbait or claims the quiz cannot back up.`,
    `7. FORMATTING: Title Case in English, natural casing in other languages. No ALL CAPS words except real acronyms. No emoji, hashtags, channel name, "Part/Episode" numbering, or the characters < and >.`,
    `8. COMPLEMENT THE THUMBNAIL: Do not repeat the thumbnail text verbatim. The title carries the search keyword; the thumbnail carries the emotion.`,
    `9. AUDIENCE: ${madeForKids ? `Friendly and encouraging. No fear or shock words such as "impossible", "insane" or "only geniuses". "for Kids" is allowed when it is part of the search phrase.` : `Do not add "for kids", "toddler" or "preschool".`}`,
    `10. LANGUAGE INTEGRITY: Write the title and keyword 100% in ${language}. Never mix languages.`,
  ];
}

/**
 * Compiles the prompt for a single search-optimized YouTube title built from the
 * keyword-first + number + challenge hook formula.
 */
export function compileVideoTitlePrompt(input: CompileVideoTitlePromptInput): string {
  const audience = resolveAudiencePolicy(input.episode.quiz_config?.age_band ?? input.quiz.age_band);
  const questionCount = input.quiz.questions.length;
  return [
    `You are an elite YouTube SEO strategist for educational quiz channels.`,
    `Write exactly ONE YouTube video title for the quiz episode below.`,
    ``,
    ...buildContextLines(input, audience.madeForKids),
    ``,
    `[FACT-CHECKED QUESTIONS (answers intentionally withheld)]:`,
    buildSpoilerFreeQuestionSummaries(input.quiz, input.localization),
    ...buildRecentTitleLines(input.recentTitles),
    ``,
    ...buildRuleLines(questionCount, input.language, audience.madeForKids),
    ``,
    `Return ONLY a valid JSON object matching this exact schema:`,
    `{"title": "The YouTube title", "primary_keyword": "exact keyword phrase as it appears in the title"}`,
  ].join("\n");
}

export function buildTitleCorrectionPrompt(basePrompt: string, issues: TitleIssue[]): string {
  return [
    basePrompt,
    ``,
    `[CORRECTION REQUIRED]: Your previous title failed these checks:`,
    ...issues.map((issue) => `- ${issue.code}: ${issue.detail}`),
    `Rewrite the title so it passes every check while following the formula.`,
  ].join("\n");
}
