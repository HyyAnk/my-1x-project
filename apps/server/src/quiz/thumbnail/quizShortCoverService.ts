import path from "node:path";
import { nowIso, type Channel, type QuizShort, type QuizV2 } from "@studio/shared";
import type { StudioLogger } from "../../logger.js";
import type { PortraitImageClient } from "../../providers/imageGeneration/imageGeneration.types.js";
import { normalizeReelPortrait } from "../../providers/imageGeneration/portraitNormalizer.js";
import { RepositoryError, type RepositoryService } from "../../repository.js";
import type { LLMClient } from "../../utils/promptSanitizer.js";
import { loadChannelMascot } from "./thumbnailLoaders.js";
import { isReusableThumbnail } from "./thumbnailReuseStore.js";
import {
  QUIZ_SHORT_COVER_FILENAME,
  quizShortCoverFingerprint,
  readQuizShortCoverManifest,
  writeQuizShortCoverManifest,
  type QuizShortCoverManifest,
} from "./quizShortCoverManifest.js";
import { formatQuizShortQuestionBadge, planQuizShortCoverWithAI, resolveQuizShortHookQuestion } from "./quizShortCoverPlanner.js";
import { QUIZ_SHORT_COVER_PROMPT_VERSION, buildQuizShortCoverPrompt } from "./quizShortCoverPrompt.js";
import { resolveQuizShortCoverReference } from "./quizShortCoverReference.js";

export interface GenerateQuizShortCoverInput {
  repository: RepositoryService;
  channel: Channel;
  quizShort: QuizShort;
  quiz: QuizV2;
  portraitImageClient: PortraitImageClient;
  llmClient?: LLMClient | null;
  logger?: StudioLogger;
  signal?: AbortSignal;
  /** Regenerate even when an up-to-date cover already exists. */
  force?: boolean;
}

export interface GenerateQuizShortCoverResult {
  manifest: QuizShortCoverManifest;
  reused: boolean;
}

async function writeCoverAsset(repository: RepositoryService, quizShort: QuizShort, bytes: Uint8Array): Promise<string> {
  const location = await repository.locateQuizProduct(quizShort.channel_id, quizShort.quiz_short_id);
  await repository.writeBinaryAtomic(path.join(location.directory, "assets", QUIZ_SHORT_COVER_FILENAME), bytes);
  return `${location.relativeDirectory}/assets/${QUIZ_SHORT_COVER_FILENAME}`;
}

async function saveCoverPathOnRecord(repository: RepositoryService, quizShort: QuizShort, assetPath: string): Promise<void> {
  await repository.queueEpisodeArtifactMutation(quizShort.channel_id, quizShort.quiz_short_id, async () => {
    const current = await repository.getQuizShort(quizShort.channel_id, quizShort.quiz_short_id);
    await repository.saveQuizShort(quizShort.channel_id, { ...current, thumbnail_asset_path_9_16: assetPath, updated_at: nowIso() });
  });
}

async function requestCoverBytes(
  input: GenerateQuizShortCoverInput,
  prompt: string,
  fingerprint: string,
  reference: Awaited<ReturnType<typeof resolveQuizShortCoverReference>>,
) {
  const signal = input.signal ?? new AbortController().signal;
  try {
    return await input.portraitImageClient.generate({
      prompt,
      aspectRatio: "9:16",
      reference: reference.reference,
      operationId: `qshort-cover-${input.quizShort.quiz_short_id}-${fingerprint.slice(0, 12)}`,
      dependencyFingerprint: fingerprint,
      signal,
    });
  } catch (error) {
    if (signal.aborted || (error instanceof Error && error.name === "AbortError")) throw error;
    throw new RepositoryError(
      `Quiz Short cover provider failed: ${error instanceof Error ? error.message : String(error)}`,
      "THUMBNAIL_PROVIDER_FAILED",
      {
        cause: error,
      },
    );
  }
}

/**
 * Generates the single 9:16 cover of a Quiz Short from its hook question, normalizes it to exactly
 * 1080x1920 PNG, stores it under the product assets and records the path on the record. A manifest
 * keyed by an input fingerprint lets reruns reuse an up-to-date cover without a paid request.
 */
export async function generateQuizShortCover(input: GenerateQuizShortCoverInput): Promise<GenerateQuizShortCoverResult> {
  const { repository, channel, quizShort, quiz } = input;
  input.signal?.throwIfAborted();
  if (quiz.questions.length === 0) throw new RepositoryError("Quiz questions must be generated before the cover", "QUIZ_REQUIRED");

  const reference = await resolveQuizShortCoverReference(repository, channel, quizShort.quiz_short_id, input.logger);
  const fingerprint = quizShortCoverFingerprint({
    promptVersion: QUIZ_SHORT_COVER_PROMPT_VERSION,
    quizShort,
    quiz,
    channel,
    mascotAnchorFingerprint: reference.mascotAnchorFingerprint,
  });
  const existing = await readQuizShortCoverManifest(repository, channel.channel_id, quizShort.quiz_short_id);
  if (!input.force && existing?.fingerprint === fingerprint && (await isReusableThumbnail(repository, existing.asset_path, "9:16"))) {
    return { manifest: existing, reused: true };
  }

  const mascot = await loadChannelMascot(repository, channel.channel_id, quizShort.quiz_short_id, channel.mascot_id, input.logger);
  const persona = await planQuizShortCoverWithAI({
    quizShort,
    quiz,
    mascotName: mascot?.name,
    llmClient: input.llmClient,
    signal: input.signal,
  });
  const prompt = buildQuizShortCoverPrompt({
    quizShort,
    quiz,
    mascotName: mascot?.name,
    hasMascotReference: reference.hasMascotReference,
    persona,
  });
  input.signal?.throwIfAborted();

  const generated = await requestCoverBytes(input, prompt, fingerprint, reference);
  input.signal?.throwIfAborted();
  const normalized = await normalizeReelPortrait(generated.bytes);
  const assetPath = await writeCoverAsset(repository, quizShort, normalized);
  await saveCoverPathOnRecord(repository, quizShort, assetPath);

  const manifest: QuizShortCoverManifest = {
    version: 1,
    prompt_version: QUIZ_SHORT_COVER_PROMPT_VERSION,
    fingerprint,
    asset_path: assetPath,
    hook_text: resolveQuizShortHookQuestion(quiz, quizShort).hookText,
    badge_text: formatQuizShortQuestionBadge(quiz.questions.length),
    archetype_name: persona.archetypeName,
    width: 1080,
    height: 1920,
    provider: generated.provider,
    model: generated.model,
    generated_at: nowIso(),
  };
  await writeQuizShortCoverManifest(repository, channel.channel_id, quizShort.quiz_short_id, manifest);
  return { manifest, reused: false };
}

export interface GenerateQuizShortCoverForProductInput {
  repository: RepositoryService;
  channelId: string;
  quizShortId: string;
  portraitImageClient: PortraitImageClient;
  llmClient?: LLMClient | null;
  logger?: StudioLogger;
  signal?: AbortSignal;
  force?: boolean;
}

/** Loads the channel, record and quiz for a Quiz Short id, then generates (or reuses) its cover. */
export async function generateQuizShortCoverForProduct(
  input: GenerateQuizShortCoverForProductInput,
): Promise<GenerateQuizShortCoverResult> {
  const [channel, quizShort, quiz] = await Promise.all([
    input.repository.getChannel(input.channelId),
    input.repository.getQuizShort(input.channelId, input.quizShortId),
    input.repository.readQuiz(input.channelId, input.quizShortId),
  ]);
  if (!quiz) throw new RepositoryError("Quiz questions must be generated before the cover", "QUIZ_REQUIRED");
  return generateQuizShortCover({ ...input, channel, quizShort, quiz });
}
