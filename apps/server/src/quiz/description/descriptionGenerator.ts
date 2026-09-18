import { nowIso, VideoDescriptionSchema, type Channel, type Episode, type QuizV2, type VideoDescription } from "@studio/shared";
import { executeSinglePromptText, type LLMClient } from "../../utils/promptSanitizer.js";
import { retryWithBackoff } from "../../utils/retryWithBackoff.js";
import { compileVideoDescriptionPrompt } from "./descriptionPromptCompiler.js";
import { assembleFullDescription } from "./descriptionFormatter.js";
import { calculateScoringTiers } from "./scoringTiers.js";
import { normalizeTargetLanguage, type ProductLocalizationArtifact } from "../bank/localization/productLocalization.js";
import { buildFallbackDescription, resolveDescriptionDefaults } from "./descriptionFallbackLocales.js";
import { parseDescriptionJsonResponse, assembleDescriptionFields } from "./descriptionResponseParser.js";

export { parseDescriptionJsonResponse } from "./descriptionResponseParser.js";

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
 * Generates an SEO-optimized video description for a Quiz episode using LLM.
 */
export async function generateVideoDescription(deps: GenerateVideoDescriptionDeps): Promise<VideoDescription> {
  const { client, channel, episode, quiz, toneHint, modelOverride, timeoutMs, signal, targetLanguage, localization } = deps;
  const questionCount = quiz.questions.length;
  const normLang = normalizeTargetLanguage(targetLanguage || localization?.target_language || channel.language || "en");
  const tiers = calculateScoringTiers(questionCount);

  const prompt = compileVideoDescriptionPrompt({ quiz, channel, episode, toneHint, targetLanguage: normLang, localization });

  let rawJson: Record<string, unknown>;
  try {
    const rawOutput = await retryWithBackoff(
      () => executeSinglePromptText(client, prompt, { modelOverride: modelOverride || "flash", signal, timeoutMs: timeoutMs ?? 10_000 }),
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
  const fields = assembleDescriptionFields(rawJson, episode, normLang, defaults);

  const { fullText, charCount } = assembleFullDescription({
    hookLines: fields.hookLines,
    semanticParagraph: fields.semanticParagraph,
    scoringCta: fields.scoringCta,
    suggestedPlaylistCategory: fields.suggestedPlaylistCategory,
    hashtags: fields.hashtags,
    language: normLang,
  });

  return VideoDescriptionSchema.parse({
    topic_category: fields.topicCategory,
    primary_keyword: fields.primaryKeyword,
    keyword_variations: fields.keywordVariations,
    question_count: questionCount,
    hook_lines: fields.hookLines,
    semantic_paragraph: fields.semanticParagraph,
    scoring_cta: fields.scoringCta,
    suggested_playlist_category: fields.suggestedPlaylistCategory,
    hashtags: fields.hashtags,
    full_description_text: fullText,
    char_count: charCount,
    language: targetLanguage || localization?.target_language || channel.language || normLang,
    generated_at: nowIso(),
  });
}
