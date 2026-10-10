import { nowIso, VideoDescriptionSchema, type Channel, type QuizShort, type QuizV2, type VideoDescription } from "@studio/shared";
import type { LLMClient } from "../../utils/promptSanitizer.js";
import { normalizeTargetLanguage, type ProductLocalizationArtifact } from "../bank/localization/productLocalization.js";
import { resolveAudiencePolicy } from "./descriptionAudiencePolicy.js";
import { requestDescriptionJson } from "./descriptionLlmRequest.js";
import { buildQuizAnswerKeys } from "./descriptionSpoilerGuard.js";
import { resolveLockedPrimaryKeyword, type DescriptionTitleContext } from "./descriptionTitleAlignment.js";
import { resolveQuizShortDescriptionLocale, type QuizShortDescriptionLocale } from "./quizShortDescriptionFallbackLocales.js";
import { assembleQuizShortDescription } from "./quizShortDescriptionFormatter.js";
import { compileQuizShortDescriptionPrompt } from "./quizShortDescriptionPromptCompiler.js";
import { composeScoringCta, resolveScoringTierLabels } from "./scoringCtaComposer.js";
import { calculateScoringTiers } from "./scoringTiers.js";

export interface GenerateQuizShortDescriptionDeps {
  client: LLMClient;
  channel: Channel;
  quizShort: QuizShort;
  quiz: QuizV2;
  toneHint?: string;
  modelOverride?: string;
  timeoutMs?: number;
  signal?: AbortSignal;
  targetLanguage?: string;
  localization?: ProductLocalizationArtifact | null;
  videoTitle?: DescriptionTitleContext | null;
}

type QuizShortDescriptionFields = {
  topicCategory: string;
  primaryKeyword: string;
  keywordVariations: string[];
  hookLines: string;
  teaser: string;
  scoreCta: string;
  hashtags: string[];
};

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function hookQuestionText(quiz: QuizV2, localization: ProductLocalizationArtifact | null | undefined): string {
  const first = quiz.questions[0];
  if (!first) return "";
  const localized =
    localization?.status === "applied" ? localization.quiz_questions?.find((item) => item.question_id === first.id) : undefined;
  return localized?.question || first.question;
}

function buildFallbackFields(deps: GenerateQuizShortDescriptionDeps, locale: QuizShortDescriptionLocale): QuizShortDescriptionFields {
  const title = deps.quizShort.topic.title;
  return {
    topicCategory: title,
    primaryKeyword: title,
    keywordVariations: [],
    hookLines: locale.buildHookLines(title, deps.quiz.questions.length),
    teaser: locale.buildTeaser(hookQuestionText(deps.quiz, deps.localization)),
    scoreCta: locale.scoreCta,
    hashtags: locale.hashtags,
  };
}

/** Takes the model fields when present and fills every gap from the locale template. */
function mergeFields(rawJson: Record<string, unknown>, fallback: QuizShortDescriptionFields): QuizShortDescriptionFields {
  const hashtags = Array.isArray(rawJson.hashtags) ? rawJson.hashtags.map(text).filter(Boolean) : [];
  return {
    topicCategory: text(rawJson.topic_category) || fallback.topicCategory,
    primaryKeyword: text(rawJson.primary_keyword) || fallback.primaryKeyword,
    keywordVariations: Array.isArray(rawJson.keyword_variations) ? rawJson.keyword_variations.map(text).filter(Boolean) : [],
    hookLines: text(rawJson.hook_lines) || fallback.hookLines,
    teaser: text(rawJson.teaser) || fallback.teaser,
    scoreCta: text(rawJson.score_cta) || fallback.scoreCta,
    hashtags: hashtags.length > 0 ? hashtags : fallback.hashtags,
  };
}

async function requestFields(deps: GenerateQuizShortDescriptionDeps, normLang: string, fallback: QuizShortDescriptionFields) {
  const prompt = compileQuizShortDescriptionPrompt({ ...deps, targetLanguage: normLang });
  try {
    const rawJson = await requestDescriptionJson({
      client: deps.client,
      prompt,
      answerKeys: buildQuizAnswerKeys(deps.quiz, deps.localization),
      modelOverride: deps.modelOverride,
      signal: deps.signal,
      timeoutMs: deps.timeoutMs ?? 10_000,
    });
    return { fields: mergeFields(rawJson, fallback), source: "llm" as const };
  } catch (error) {
    console.warn(
      `[quizShortDescriptionGenerator] LLM description failed, using grounded fallback for quiz short "${deps.quizShort.quiz_short_id}":`,
      error instanceof Error ? error.message : error,
    );
    return { fields: fallback, source: "fallback" as const };
  }
}

/**
 * Generates the Quiz Short description: hook, one teaser about question one, the score CTA and
 * three to five hashtags including #Shorts and #quiz, within 600 characters and without chapters.
 */
export async function generateQuizShortDescription(deps: GenerateQuizShortDescriptionDeps): Promise<VideoDescription> {
  const { channel, quizShort, quiz, localization } = deps;
  const languageLabel = deps.targetLanguage || localization?.target_language || channel.language || "en";
  const normLang = normalizeTargetLanguage(languageLabel);
  const locale = resolveQuizShortDescriptionLocale(normLang);
  const { fields } = await requestFields(deps, normLang, buildFallbackFields(deps, locale));

  const assembled = assembleQuizShortDescription(fields);
  const tiers = calculateScoringTiers(quiz.questions.length);
  const { labels, delimiter } = resolveScoringTierLabels(normLang);
  const scoringCta = composeScoringCta({ ...labels, cta_text: fields.scoreCta }, tiers, normLang, labels, delimiter);

  return VideoDescriptionSchema.parse({
    topic_category: fields.topicCategory,
    primary_keyword: resolveLockedPrimaryKeyword(deps.videoTitle) ?? fields.primaryKeyword,
    keyword_variations: fields.keywordVariations,
    question_count: quiz.questions.length,
    hook_lines: fields.hookLines,
    semantic_paragraph: fields.teaser,
    scoring_cta: scoringCta,
    suggested_playlist_category: fields.topicCategory,
    hashtags: assembled.hashtags,
    chapters: [],
    made_for_kids: resolveAudiencePolicy(quizShort.quiz_config?.age_band ?? quiz.age_band).madeForKids,
    full_description_text: assembled.fullText,
    char_count: assembled.charCount,
    language: languageLabel,
    generated_at: nowIso(),
  });
}
