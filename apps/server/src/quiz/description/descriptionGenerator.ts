import {
  nowIso,
  VideoDescriptionSchema,
  type Channel,
  type Episode,
  type QuizV2,
  type VideoDescription,
} from "@studio/shared";
import { executeSinglePromptText, type LLMClient } from "../../utils/promptSanitizer.js";
import { compileVideoDescriptionPrompt } from "./descriptionPromptCompiler.js";
import { assembleFullDescription, normalizeHashtags } from "./descriptionFormatter.js";
import { calculateScoringTiers, formatScoringRange } from "./scoringTiers.js";

export interface GenerateVideoDescriptionDeps {
  client: LLMClient;
  channel: Channel;
  episode: Episode;
  quiz: QuizV2;
  toneHint?: string;
  modelOverride?: string;
  timeoutMs?: number;
  signal?: AbortSignal;
}

/**
 * Extracts and parses JSON from raw LLM string response.
 */
export function parseDescriptionJsonResponse(rawText: string): Record<string, unknown> {
  let cleaned = rawText.trim();
  // Strip markdown code fences if present
  cleaned = cleaned.replace(/^```(?:json)?\r?\n([\s\S]*?)\r?\n```$/i, "$1").trim();
  // If there's still text around JSON, match first { to last }
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }
  return JSON.parse(cleaned) as Record<string, unknown>;
}

/**
 * Generates an SEO-optimized video description for a Quiz episode using LLM.
 */
export async function generateVideoDescription(deps: GenerateVideoDescriptionDeps): Promise<VideoDescription> {
  const { client, channel, episode, quiz, toneHint, modelOverride, timeoutMs, signal } = deps;
  const questionCount = quiz.questions.length;
  const language = channel.language || "Vietnamese";
  const tiers = calculateScoringTiers(questionCount);

  const prompt = compileVideoDescriptionPrompt({
    quiz,
    channel,
    episode,
    toneHint,
  });

  let rawJson: Record<string, unknown> = {};

  try {
    const rawOutput = await executeSinglePromptText(client, prompt, {
      modelOverride: modelOverride || "flash",
      signal,
      timeoutMs: timeoutMs ?? 10_000,
    });
    rawJson = parseDescriptionJsonResponse(rawOutput);
  } catch (error) {
    // If LLM fails or returns unparseable text, create a structured fallback grounded in the quiz topic
    const tier1Range = formatScoringRange(tiers.tier1.min, tiers.tier1.max, language);
    const tier2Range = formatScoringRange(tiers.tier2.min, tiers.tier2.max, language);
    const tier3Range = formatScoringRange(tiers.tier3.min, tiers.tier3.max, language);
    const isVi = /vietnamese|vi\b/i.test(language);

    const fallbackHook = isVi
      ? `${episode.topic.title} - Thử thách ${questionCount} câu hỏi!\nCùng kiểm tra độ hiểu biết của bạn ngay sau đây.`
      : `${episode.topic.title} - ${questionCount} Question Challenge!\nTest your knowledge and see how many you can answer correctly.`;

    const fallbackSemantic = isVi
      ? `${episode.topic.hook} Hãy cùng khám phá các câu đố thú vị và bất ngờ trong video này.`
      : `${episode.topic.hook} Discover exciting trivia questions and fascinating facts in this video challenge.`;

    rawJson = {
      topic_category: episode.topic.title,
      primary_keyword: episode.topic.title.toLowerCase(),
      keyword_variations: [episode.topic.premise],
      hook_lines: fallbackHook,
      semantic_paragraph: fallbackSemantic,
      scoring_cta: {
        beginner: `${tier1Range}: ${isVi ? "Mới bắt đầu" : "Beginner"}`,
        intermediate: `${tier2Range}: ${isVi ? "Hiểu biết" : "Intermediate"}`,
        expert: `${tier3Range}: ${isVi ? "Bậc thầy" : "Master"}`,
        cta_text: isVi ? "Bạn đúng được bao nhiêu câu? Hãy bình luận bên dưới nhé!" : "How many did you get right? Comment below!",
      },
      suggested_playlist_category: episode.topic.title,
      hashtags: isVi ? ["#quiz", "#dovui", "#kienthuc", "#trivia"] : ["#quiz", "#trivia", "#knowledge", "#test"],
    };
  }

  const isVi = /vietnamese|vi\b/i.test(language);
  const topicCategory = typeof rawJson.topic_category === "string" ? rawJson.topic_category.trim() : episode.topic.title;
  const primaryKeyword = typeof rawJson.primary_keyword === "string" ? rawJson.primary_keyword.trim() : episode.topic.title;
  const keywordVariations = Array.isArray(rawJson.keyword_variations)
    ? (rawJson.keyword_variations as string[]).map((k) => String(k).trim()).filter(Boolean)
    : [];

  const defaultHookLines = isVi
    ? `${episode.topic.title}\nCùng thử thách trí nhớ ngay!`
    : `${episode.topic.title}\nTest your memory and knowledge now!`;
  const hookLines = typeof rawJson.hook_lines === "string" && rawJson.hook_lines.trim()
    ? rawJson.hook_lines.trim()
    : defaultHookLines;

  const defaultSemantic = isVi
    ? `${episode.topic.hook} Thử thách trí tuệ với những câu hỏi hấp dẫn!`
    : `${episode.topic.hook} Challenge your mind with engaging questions!`;
  const semanticParagraph = typeof rawJson.semantic_paragraph === "string" && rawJson.semantic_paragraph.trim()
    ? rawJson.semantic_paragraph.trim()
    : defaultSemantic;

  const rawScoring = (rawJson.scoring_cta && typeof rawJson.scoring_cta === "object" ? rawJson.scoring_cta : {}) as Record<string, unknown>;
  const tier1Range = formatScoringRange(tiers.tier1.min, tiers.tier1.max, language);
  const tier2Range = formatScoringRange(tiers.tier2.min, tiers.tier2.max, language);
  const tier3Range = formatScoringRange(tiers.tier3.min, tiers.tier3.max, language);

  const scoringCta = {
    beginner: typeof rawScoring.beginner === "string" && rawScoring.beginner.trim()
      ? rawScoring.beginner.trim()
      : `${tier1Range}: ${isVi ? "Tập sự" : "Beginner"}`,
    intermediate: typeof rawScoring.intermediate === "string" && rawScoring.intermediate.trim()
      ? rawScoring.intermediate.trim()
      : `${tier2Range}: ${isVi ? "Tinh anh" : "Intermediate"}`,
    expert: typeof rawScoring.expert === "string" && rawScoring.expert.trim()
      ? rawScoring.expert.trim()
      : `${tier3Range}: ${isVi ? "Bậc thầy" : "Master"}`,
    cta_text: typeof rawScoring.cta_text === "string" && rawScoring.cta_text.trim()
      ? rawScoring.cta_text.trim()
      : (isVi ? "Bạn đạt được bao nhiêu điểm? Hãy bình luận nhé!" : "How many did you get right? Comment below!"),
  };

  const suggestedPlaylistCategory =
    typeof rawJson.suggested_playlist_category === "string" ? rawJson.suggested_playlist_category.trim() : topicCategory;

  const rawTags = Array.isArray(rawJson.hashtags)
    ? (rawJson.hashtags as string[]).map((t) => String(t).trim()).filter(Boolean)
    : ["#quiz", "#trivia"];
  const hashtags = normalizeHashtags(rawTags);

  const { fullText, charCount } = assembleFullDescription({
    hookLines,
    semanticParagraph,
    scoringCta,
    suggestedPlaylistCategory,
    hashtags,
    language,
  });

  return VideoDescriptionSchema.parse({
    topic_category: topicCategory,
    primary_keyword: primaryKeyword,
    keyword_variations: keywordVariations,
    question_count: questionCount,
    hook_lines: hookLines,
    semantic_paragraph: semanticParagraph,
    scoring_cta: scoringCta,
    suggested_playlist_category: suggestedPlaylistCategory,
    hashtags,
    full_description_text: fullText,
    char_count: charCount,
    language,
    generated_at: nowIso(),
  });
}
