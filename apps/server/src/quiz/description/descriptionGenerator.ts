import { nowIso, VideoDescriptionSchema, type Channel, type Episode, type QuizV2, type VideoDescription } from "@studio/shared";
import { executeSinglePromptText, type LLMClient } from "../../utils/promptSanitizer.js";
import { retryWithBackoff } from "../../utils/retryWithBackoff.js";
import { compileVideoDescriptionPrompt } from "./descriptionPromptCompiler.js";
import { assembleFullDescription, normalizeHashtags } from "./descriptionFormatter.js";
import { calculateScoringTiers, formatScoringRange } from "./scoringTiers.js";
import { normalizeTargetLanguage, type ProductLocalizationArtifact } from "../bank/localization/productLocalization.js";
import { RepositoryError } from "../../repository/errors.js";

export interface GenerateVideoDescriptionDeps {
  client: LLMClient;
  channel: Channel;
  episode: Episode;
  quiz: QuizV2;
  toneHint?: string;
  modelOverride?: string;
  timeoutMs?: number;
  signal?: AbortSignal;
  targetLanguage?: string;
  localization?: ProductLocalizationArtifact | null;
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

function buildFallbackDescription(
  normLang: string,
  episode: GenerateVideoDescriptionDeps["episode"],
  questionCount: number,
  tiers: ReturnType<typeof calculateScoringTiers>,
  localization?: GenerateVideoDescriptionDeps["localization"],
  error?: unknown,
): Record<string, unknown> {
  const tier1Range = formatScoringRange(tiers.tier1.min, tiers.tier1.max, normLang);
  const tier2Range = formatScoringRange(tiers.tier2.min, tiers.tier2.max, normLang);
  const tier3Range = formatScoringRange(tiers.tier3.min, tiers.tier3.max, normLang);
  const hookTitle = localization?.thumbnail_text || episode.topic.title;

  if (normLang === "en") {
    const fallbackHook = `${episode.topic.title} - ${questionCount} Question Challenge!\nTest your knowledge and see how many you can answer correctly.`;
    const fallbackSemantic = `${episode.topic.hook} Discover exciting trivia questions and fascinating facts in this video challenge.`;

    return {
      topic_category: episode.topic.title,
      primary_keyword: episode.topic.title.toLowerCase(),
      keyword_variations: [episode.topic.premise],
      hook_lines: fallbackHook,
      semantic_paragraph: fallbackSemantic,
      scoring_cta: {
        beginner: `${tier1Range}: Beginner`,
        intermediate: `${tier2Range}: Intermediate`,
        expert: `${tier3Range}: Master`,
        cta_text: "How many did you get right? Comment below!",
      },
      suggested_playlist_category: episode.topic.title,
      hashtags: ["#quiz", "#trivia", "#knowledge", "#test"],
    };
  }

  if (normLang === "de") {
    const fallbackHook = `${hookTitle} - ${questionCount} Fragen!\nTeste dein Wissen und finde heraus, wie viele du richtig beantworten kannst.`;
    const fallbackSemantic = localization?.video_description || `${episode.topic.title} Quiz.`;

    return {
      topic_category: episode.topic.title,
      primary_keyword: hookTitle.toLowerCase(),
      keyword_variations: [],
      hook_lines: fallbackHook,
      semantic_paragraph: fallbackSemantic,
      scoring_cta: {
        beginner: `${tier1Range}: Anfänger`,
        intermediate: `${tier2Range}: Fortgeschritten`,
        expert: `${tier3Range}: Meister`,
        cta_text: "Wie viele hast du richtig? Kommentiere unten!",
      },
      suggested_playlist_category: episode.topic.title,
      hashtags: ["#quiz", "#trivia", "#wissen"],
    };
  }

  if (normLang === "fr") {
    const fallbackHook = `${hookTitle} - Défi ${questionCount} Questions !\nTestez vos connaissances et voyez combien vous pouvez en réussir.`;
    const fallbackSemantic = localization?.video_description || `${episode.topic.title} Quiz.`;

    return {
      topic_category: episode.topic.title,
      primary_keyword: hookTitle.toLowerCase(),
      keyword_variations: [],
      hook_lines: fallbackHook,
      semantic_paragraph: fallbackSemantic,
      scoring_cta: {
        beginner: `${tier1Range} : Débutant`,
        intermediate: `${tier2Range} : Intermédiaire`,
        expert: `${tier3Range} : Expert`,
        cta_text: "Combien en avez-vous réussi ? Commentez ci-dessous !",
      },
      suggested_playlist_category: episode.topic.title,
      hashtags: ["#quiz", "#trivia", "#connaissance"],
    };
  }

  throw new RepositoryError(
    `DESCRIPTION_LOCALIZATION_FAILED: Provider failed and no verified fallback available for target language: "${normLang}"`,
    "DESCRIPTION_LOCALIZATION_FAILED",
    { cause: error },
  );
}

function resolveDescriptionDefaults(
  normLang: string,
  episode: GenerateVideoDescriptionDeps["episode"],
  tiers: ReturnType<typeof calculateScoringTiers>,
  localization?: GenerateVideoDescriptionDeps["localization"],
) {
  const tier1Range = formatScoringRange(tiers.tier1.min, tiers.tier1.max, normLang);
  const tier2Range = formatScoringRange(tiers.tier2.min, tiers.tier2.max, normLang);
  const tier3Range = formatScoringRange(tiers.tier3.min, tiers.tier3.max, normLang);
  const hookTitle = localization?.thumbnail_text || episode.topic.title;

  const defaultHookLines =
    normLang === "de"
      ? `${hookTitle}\nTeste jetzt dein Wissen!`
      : normLang === "fr"
        ? `${hookTitle}\nTestez vos connaissances maintenant !`
        : normLang === "en"
          ? `${episode.topic.title}\nTest your memory and knowledge now!`
          : undefined;

  const defaultSemantic =
    normLang === "de"
      ? localization?.video_description || `${episode.topic.hook} Teste dein Wissen mit spannenden Fragen!`
      : normLang === "fr"
        ? localization?.video_description || `${episode.topic.hook} Mettez votre esprit au défi avec des questions captivantes !`
        : normLang === "en"
          ? `${episode.topic.hook} Challenge your mind with engaging questions!`
          : undefined;

  const defaultBeginner =
    normLang === "de" ? `${tier1Range}: Anfänger` : normLang === "fr" ? `${tier1Range} : Débutant` : `${tier1Range}: Beginner`;
  const defaultIntermediate =
    normLang === "de"
      ? `${tier2Range}: Fortgeschritten`
      : normLang === "fr"
        ? `${tier2Range} : Intermédiaire`
        : `${tier2Range}: Intermediate`;
  const defaultExpert =
    normLang === "de" ? `${tier3Range}: Meister` : normLang === "fr" ? `${tier3Range} : Expert` : `${tier3Range}: Master`;
  const defaultCtaText =
    normLang === "de"
      ? "Wie viele hast du richtig? Kommentiere unten!"
      : normLang === "fr"
        ? "Combien en avez-vous réussi ? Commentez ci-dessous !"
        : "How many did you get right? Comment below!";

  return {
    defaultHookLines,
    defaultSemantic,
    defaultBeginner,
    defaultIntermediate,
    defaultExpert,
    defaultCtaText,
  };
}

function assembleDescriptionFields(
  rawJson: Record<string, unknown>,
  episode: GenerateVideoDescriptionDeps["episode"],
  normLang: string,
  defaults: ReturnType<typeof resolveDescriptionDefaults>,
) {
  const topicCategory = typeof rawJson.topic_category === "string" ? rawJson.topic_category.trim() : episode.topic.title;
  const primaryKeyword = typeof rawJson.primary_keyword === "string" ? rawJson.primary_keyword.trim() : episode.topic.title;
  const keywordVariations = Array.isArray(rawJson.keyword_variations)
    ? (rawJson.keyword_variations as string[]).map((k) => String(k).trim()).filter(Boolean)
    : [];

  if (!defaults.defaultHookLines && (!rawJson.hook_lines || typeof rawJson.hook_lines !== "string" || !rawJson.hook_lines.trim())) {
    throw new RepositoryError(
      `DESCRIPTION_LOCALIZATION_FAILED: Missing hook lines for ${normLang} description`,
      "DESCRIPTION_LOCALIZATION_FAILED",
    );
  }
  const hookLines =
    typeof rawJson.hook_lines === "string" && rawJson.hook_lines.trim() ? rawJson.hook_lines.trim() : defaults.defaultHookLines!;

  if (
    !defaults.defaultSemantic &&
    (!rawJson.semantic_paragraph || typeof rawJson.semantic_paragraph !== "string" || !rawJson.semantic_paragraph.trim())
  ) {
    throw new RepositoryError(
      `DESCRIPTION_LOCALIZATION_FAILED: Missing semantic paragraph for ${normLang} description`,
      "DESCRIPTION_LOCALIZATION_FAILED",
    );
  }
  const semanticParagraph =
    typeof rawJson.semantic_paragraph === "string" && rawJson.semantic_paragraph.trim()
      ? rawJson.semantic_paragraph.trim()
      : defaults.defaultSemantic!;

  const rawScoring = (rawJson.scoring_cta && typeof rawJson.scoring_cta === "object" ? rawJson.scoring_cta : {}) as Record<string, unknown>;

  const scoringCta = {
    beginner: typeof rawScoring.beginner === "string" && rawScoring.beginner.trim() ? rawScoring.beginner.trim() : defaults.defaultBeginner,
    intermediate:
      typeof rawScoring.intermediate === "string" && rawScoring.intermediate.trim()
        ? rawScoring.intermediate.trim()
        : defaults.defaultIntermediate,
    expert: typeof rawScoring.expert === "string" && rawScoring.expert.trim() ? rawScoring.expert.trim() : defaults.defaultExpert,
    cta_text: typeof rawScoring.cta_text === "string" && rawScoring.cta_text.trim() ? rawScoring.cta_text.trim() : defaults.defaultCtaText,
  };

  const suggestedPlaylistCategory =
    typeof rawJson.suggested_playlist_category === "string" ? rawJson.suggested_playlist_category.trim() : topicCategory;

  const rawTags = Array.isArray(rawJson.hashtags)
    ? (rawJson.hashtags as string[]).map((t) => String(t).trim()).filter(Boolean)
    : ["#quiz", "#trivia"];
  const hashtags = normalizeHashtags(rawTags);

  return {
    topicCategory,
    primaryKeyword,
    keywordVariations,
    hookLines,
    semanticParagraph,
    scoringCta,
    suggestedPlaylistCategory,
    hashtags,
  };
}

/**
 * Generates an SEO-optimized video description for a Quiz episode using LLM.
 */
export async function generateVideoDescription(deps: GenerateVideoDescriptionDeps): Promise<VideoDescription> {
  const { client, channel, episode, quiz, toneHint, modelOverride, timeoutMs, signal, targetLanguage, localization } = deps;
  const questionCount = quiz.questions.length;
  const normLang = normalizeTargetLanguage(targetLanguage || localization?.target_language || channel.language || "en");
  const tiers = calculateScoringTiers(questionCount);

  const prompt = compileVideoDescriptionPrompt({
    quiz,
    channel,
    episode,
    toneHint,
    targetLanguage: normLang,
    localization,
  });

  let rawJson: Record<string, unknown>;

  try {
    const rawOutput = await retryWithBackoff(
      () =>
        executeSinglePromptText(client, prompt, {
          modelOverride: modelOverride || "flash",
          signal,
          timeoutMs: timeoutMs ?? 10_000,
        }),
      { attempts: 3, baseDelayMs: 1500 },
    );
    rawJson = parseDescriptionJsonResponse(rawOutput);
  } catch (error) {
    console.warn(
      `[descriptionGenerator] LLM description failed, using grounded fallback template for episode "${episode.episode_id}":`,
      error instanceof Error ? error.message : error,
    );
    rawJson = buildFallbackDescription(normLang, episode, questionCount, tiers, localization, error);
  }

  const defaults = resolveDescriptionDefaults(normLang, episode, tiers, localization);
  const {
    topicCategory,
    primaryKeyword,
    keywordVariations,
    hookLines,
    semanticParagraph,
    scoringCta,
    suggestedPlaylistCategory,
    hashtags,
  } = assembleDescriptionFields(rawJson, episode, normLang, defaults);

  const { fullText, charCount } = assembleFullDescription({
    hookLines,
    semanticParagraph,
    scoringCta,
    suggestedPlaylistCategory,
    hashtags,
    language: normLang,
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
    language: targetLanguage || localization?.target_language || channel.language || normLang,
    generated_at: nowIso(),
  });
}
