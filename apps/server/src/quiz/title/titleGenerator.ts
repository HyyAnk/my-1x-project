import { nowIso, VideoTitleSchema, type Channel, type QuizProductKind, type QuizV2, type VideoTitle } from "@studio/shared";
import type { LLMClient } from "../../utils/promptSanitizer.js";
import { normalizeTargetLanguage, type ProductLocalizationArtifact } from "../bank/localization/productLocalization.js";
import { buildQuizAnswerKeys } from "../description/descriptionSpoilerGuard.js";
import { finalizeQuizShortTitleDraft } from "./quizShortTitleRules.js";
import { buildFallbackTitle, buildQuizShortFallbackTitle } from "./titleFallbackLocales.js";
import { requestVideoTitle } from "./titleLlmRequest.js";
import { compileVideoTitlePrompt } from "./titlePromptCompiler.js";
import type { TitleDraft, TitleProductContext } from "./videoTitle.types.js";

export interface GenerateVideoTitleDeps {
  client: LLMClient;
  channel: Channel;
  /** The Episode or Quiz Short record. Named `episode` so every existing Episode call site keeps working. */
  episode: TitleProductContext;
  quiz: QuizV2;
  /** Defaults to "episode"; Quiz Shorts use the 70-character "#Shorts" variant. */
  productKind?: QuizProductKind;
  /** Record id used only in diagnostics. */
  productId?: string;
  targetLanguage?: string;
  localization?: ProductLocalizationArtifact | null;
  /** Text printed on the active thumbnail; the title must complement it rather than repeat it. */
  thumbnailHookText?: string | null;
  /** Titles of other episodes on the channel, used to avoid keyword cannibalization. */
  recentTitles?: string[];
  toneHint?: string;
  modelOverride?: string;
  timeoutMs?: number;
  signal?: AbortSignal;
}

function describeProduct(deps: GenerateVideoTitleDeps): string {
  const kind = deps.productKind === "quiz_short" ? "quiz short" : "episode";
  return `${kind} "${deps.productId ?? deps.episode.topic.title}"`;
}

/**
 * Generates one search-optimized, spoiler-free YouTube title for a quiz product,
 * falling back to a grounded template when the LLM cannot produce a valid draft.
 */
export async function generateVideoTitle(deps: GenerateVideoTitleDeps): Promise<VideoTitle> {
  const { client, channel, episode, quiz, localization, recentTitles = [] } = deps;
  const productKind: QuizProductKind = deps.productKind ?? "episode";
  const isShort = productKind === "quiz_short";
  const languageLabel = deps.targetLanguage || localization?.target_language || channel.language || "en";
  const normLang = normalizeTargetLanguage(languageLabel);
  const questionCount = quiz.questions.length;

  const prompt = compileVideoTitlePrompt({
    quiz,
    channel,
    episode,
    productKind,
    language: languageLabel,
    localization,
    thumbnailHookText: deps.thumbnailHookText,
    recentTitles,
    toneHint: deps.toneHint,
  });

  let draft: TitleDraft;
  let source: VideoTitle["source"] = "llm";
  try {
    draft = await requestVideoTitle({
      client,
      prompt,
      review: { questionCount, recentTitles, answerKeys: buildQuizAnswerKeys(quiz, localization), productKind },
      finalizeDraft: isShort ? finalizeQuizShortTitleDraft : undefined,
      modelOverride: deps.modelOverride,
      signal: deps.signal,
      timeoutMs: deps.timeoutMs ?? 10_000,
    });
  } catch (error) {
    console.warn(
      `[titleGenerator] LLM title failed, using grounded fallback template for ${describeProduct(deps)}:`,
      error instanceof Error ? error.message : error,
    );
    draft = isShort ? buildQuizShortFallbackTitle(normLang, episode, questionCount) : buildFallbackTitle(normLang, episode, questionCount);
    source = "fallback";
  }

  return VideoTitleSchema.parse({
    title: draft.title,
    primary_keyword: draft.primaryKeyword,
    char_count: draft.title.length,
    language: languageLabel,
    source,
    generated_at: nowIso(),
  });
}
