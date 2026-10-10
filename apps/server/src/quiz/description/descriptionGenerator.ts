import {
  nowIso,
  VideoDescriptionSchema,
  type Channel,
  type Episode,
  type QuizTimeline,
  type QuizV2,
  type VideoDescription,
} from "@studio/shared";
import type { LLMClient } from "../../utils/promptSanitizer.js";
import { compileVideoDescriptionPrompt } from "./descriptionPromptCompiler.js";
import { assembleFullDescription } from "./descriptionFormatter.js";
import { calculateScoringTiers } from "./scoringTiers.js";
import { normalizeTargetLanguage, type ProductLocalizationArtifact } from "../bank/localization/productLocalization.js";
import { buildFallbackDescription, resolveDescriptionDefaults } from "./descriptionFallbackLocales.js";
import { assembleDescriptionFields } from "./descriptionResponseParser.js";
import { requestDescriptionJson } from "./descriptionLlmRequest.js";
import { buildQuizAnswerKeys } from "./descriptionSpoilerGuard.js";
import { composeScoringCta, resolveScoringTierLabels } from "./scoringCtaComposer.js";
import { enforceAudienceCta, resolveAudiencePolicy } from "./descriptionAudiencePolicy.js";
import { buildDescriptionChapters } from "./descriptionChapters.js";
import { getDescriptionSectionLocale } from "./descriptionSectionLocales.js";
import { buildChannelFooter } from "./descriptionChannelFooter.js";
import { enrichFallbackDescription } from "./descriptionFallbackEnrichment.js";
import { resolveLockedPrimaryKeyword, type DescriptionTitleContext } from "./descriptionTitleAlignment.js";

export { parseDescriptionJsonResponse } from "./descriptionResponseParser.js";

export interface GenerateVideoDescriptionDeps {
  client: LLMClient;
  channel: Channel;
  episode: Episode;
  quiz: QuizV2;
  /** Compiled timeline used to derive chapters; chapters are omitted when absent. */
  timeline?: QuizTimeline | null;
  toneHint?: string;
  modelOverride?: string;
  timeoutMs?: number;
  signal?: AbortSignal;
  targetLanguage?: string;
  localization?: ProductLocalizationArtifact | null;
  /** The episode's YouTube title; generated first so the description reinforces its keyword. */
  videoTitle?: DescriptionTitleContext | null;
}

/**
 * Generates an SEO-optimized, spoiler-free video description for a Quiz episode using LLM.
 */
export async function generateVideoDescription(deps: GenerateVideoDescriptionDeps): Promise<VideoDescription> {
  const { client, channel, episode, quiz, timeline, toneHint, modelOverride, timeoutMs, signal, targetLanguage, localization, videoTitle } =
    deps;
  const questionCount = quiz.questions.length;
  const normLang = normalizeTargetLanguage(targetLanguage || localization?.target_language || channel.language || "en");
  const tiers = calculateScoringTiers(questionCount);
  const audience = resolveAudiencePolicy(episode.quiz_config?.age_band ?? quiz.age_band);

  const prompt = compileVideoDescriptionPrompt({ quiz, channel, episode, toneHint, targetLanguage: normLang, localization, videoTitle });

  let rawJson: Record<string, unknown>;
  try {
    rawJson = await requestDescriptionJson({
      client,
      prompt,
      answerKeys: buildQuizAnswerKeys(quiz, localization),
      modelOverride,
      signal,
      timeoutMs: timeoutMs ?? 10_000,
    });
  } catch (error) {
    console.warn(
      `[descriptionGenerator] LLM description failed, using grounded fallback template for episode "${episode.episode_id}":`,
      error instanceof Error ? error.message : error,
    );
    const fallback = buildFallbackDescription(normLang, episode, questionCount, tiers, localization, error);
    rawJson = enrichFallbackDescription(fallback, { normLang, episode, quiz, localization });
  }

  const defaults = resolveDescriptionDefaults(normLang, episode, tiers, localization);
  const fields = assembleDescriptionFields(rawJson, episode, normLang, defaults);
  const { labels, delimiter } = resolveScoringTierLabels(normLang);
  const scoringCta = enforceAudienceCta(composeScoringCta(fields.scoringCta, tiers, normLang, labels, delimiter), audience, normLang);
  const sectionLocale = getDescriptionSectionLocale(normLang);
  const chapters = timeline ? buildDescriptionChapters(timeline, sectionLocale.chapterLabels) : [];
  const channelFooter = buildChannelFooter({
    profile: channel.publishing_profile,
    channelName: episode.quiz_config?.channel_brand_name || channel.display_name,
    categories: [fields.suggestedPlaylistCategory, fields.topicCategory],
    labels: sectionLocale.footerLabels,
  });

  const { fullText, charCount } = assembleFullDescription({
    hookLines: fields.hookLines,
    semanticParagraph: fields.semanticParagraph,
    scoringCta,
    suggestedPlaylistCategory: fields.suggestedPlaylistCategory,
    hashtags: fields.hashtags,
    chapters,
    channelFooter,
    language: normLang,
  });

  return VideoDescriptionSchema.parse({
    topic_category: fields.topicCategory,
    primary_keyword: resolveLockedPrimaryKeyword(videoTitle) ?? fields.primaryKeyword,
    keyword_variations: fields.keywordVariations,
    question_count: questionCount,
    hook_lines: fields.hookLines,
    semantic_paragraph: fields.semanticParagraph,
    scoring_cta: scoringCta,
    suggested_playlist_category: fields.suggestedPlaylistCategory,
    hashtags: fields.hashtags,
    chapters,
    made_for_kids: audience.madeForKids,
    full_description_text: fullText,
    char_count: charCount,
    language: targetLanguage || localization?.target_language || channel.language || normLang,
    generated_at: nowIso(),
  });
}
