import { randomUUID } from "node:crypto";
import type { ReelKey, ReelScript, SegmentIndex, ShortReelRecord, ShortReelSourceSnapshot } from "@studio/shared";
import type { RepositoryService } from "../repository/service.js";
import { resolveReelReferences, type ReferenceResolveOptions } from "./referenceResolver.js";
import { generateReelCoverImage, type CoverGenerationOptions } from "./thumbnailAdapter.js";
import { generateReelPublishing, type PublishingGenerationOptions } from "./publishingService.js";
import { runPackageAttempt, PackageServiceError } from "./packageAttempt.js";
import { generateReelScript, ScriptGenerationError, type GenerateReelScriptOptions } from "./scriptService.js";
import type { LLMClient } from "../utils/promptSanitizer.js";
import type { CompleteShortReelSourceSnapshot } from "./scriptPrompt.js";
import {
  extractShortReelDisplayProjection,
  loadShortReelLocalizationArtifact,
  type ShortReelDisplayProjection,
} from "../quiz/bank/localization/productLocalization.js";

export { PackageServiceError, type PackageServiceErrorCode } from "./packageAttempt.js";
export { exportShortReelPackage } from "./exportService.js";

function createBaselineReelScript(source: ShortReelSourceSnapshot, displayProjection?: ShortReelDisplayProjection): ReelScript {
  const questionCue = displayProjection?.question_text || source.question_text;
  const answerCue = displayProjection?.selected_answer_text || source.selected_answer_text;

  const baselineContinuity = {
    character_identity: "Host",
    position: "Center",
    action: "Presenting",
    camera: "Medium Shot",
    environment: "Studio",
    props: [],
    visible_text: [],
    revealed_facts: [],
  };

  return {
    segments: [
      {
        index: 1,
        mode: "generate",
        duration_seconds: 9,
        narrative: source.question_text,
        text_cues: [
          {
            role: "question",
            text: questionCue,
            start_seconds: 0.5,
            end_seconds: 4.5,
          },
        ],
        audio_direction: "Upbeat narration and question introduction",
        start_state: structuredClone(baselineContinuity),
        end_state: {
          ...structuredClone(baselineContinuity),
          visible_text: [questionCue],
        },
      },
      {
        index: 2,
        mode: "extend",
        duration_seconds: 9,
        narrative: "Review options and supporting clues",
        text_cues: [
          {
            role: "supporting",
            text: "Think carefully about the clues.",
            start_seconds: 0.5,
            end_seconds: 4.5,
          },
        ],
        audio_direction: "Dramatic pause and contemplation tone",
        start_state: {
          ...structuredClone(baselineContinuity),
          visible_text: [questionCue],
        },
        end_state: {
          ...structuredClone(baselineContinuity),
          visible_text: [questionCue],
        },
      },
      {
        index: 3,
        mode: "extend",
        duration_seconds: 8,
        narrative: `Reveal answer: ${answerCue}`,
        text_cues: [
          {
            role: "answer",
            text: answerCue,
            start_seconds: 0.5,
            end_seconds: 4.5,
          },
        ],
        audio_direction: "Celebratory resolution chime",
        start_state: {
          ...structuredClone(baselineContinuity),
          visible_text: [questionCue],
        },
        end_state: {
          ...structuredClone(baselineContinuity),
          visible_text: [answerCue],
        },
      },
    ],
  };
}

export function generateReelScriptUnit(
  repository: RepositoryService,
  key: ReelKey,
  operationId: string,
  llmClient?: LLMClient,
  options?: GenerateReelScriptOptions,
): Promise<ShortReelRecord> {
  return runPackageAttempt(repository, key, "script", operationId, async (snapshot) => {
    return { script: await buildGeneratedScript(snapshot, llmClient, options, repository) };
  });
}

async function buildGeneratedScript(
  snapshot: ShortReelRecord,
  llmClient?: LLMClient,
  options?: GenerateReelScriptOptions,
  repository?: RepositoryService,
): Promise<ReelScript> {
  const localization = repository ? await loadShortReelLocalizationArtifact(repository, snapshot.channel_id, snapshot.reel_id) : null;
  const displayProjection = extractShortReelDisplayProjection(snapshot.source, localization);

  if (!llmClient) return createBaselineReelScript(snapshot.source, displayProjection);
  try {
    return await generateReelScript(
      {
        topic: snapshot.topic,
        source: snapshot.source as CompleteShortReelSourceSnapshot,
        displayProjection,
      },
      llmClient,
      options,
    );
  } catch (error) {
    if (error instanceof ScriptGenerationError && (error.code === "PROVIDER_ERROR" || error.code === "TIMEOUT")) {
      return createBaselineReelScript(snapshot.source, displayProjection);
    }
    throw error;
  }
}

export function generateReelSegmentUnit(
  repository: RepositoryService,
  key: ReelKey,
  segmentIndex: SegmentIndex,
  operationId: string,
  llmClient?: LLMClient,
  options?: GenerateReelScriptOptions,
): Promise<ShortReelRecord> {
  return runPackageAttempt(repository, key, "script", operationId, async (snapshot) => {
    if (!snapshot.script) throw new PackageServiceError("VALIDATION_FAILED", "Generate a complete script before regenerating one segment.");
    const generated = await buildGeneratedScript(snapshot, llmClient, options, repository);
    const replacement = generated.segments.find((segment) => segment.index === segmentIndex);
    if (!replacement) throw new PackageServiceError("VALIDATION_FAILED", `Generated script omitted segment ${segmentIndex}.`);
    return {
      script: {
        segments: snapshot.script.segments.map((segment) => (segment.index === segmentIndex ? replacement : segment)),
      },
    };
  });
}

export function generateReelReferencesUnit(
  repository: RepositoryService,
  key: ReelKey,
  operationId: string,
  options?: ReferenceResolveOptions,
) {
  return runPackageAttempt(repository, key, "references", operationId, () => resolveReelReferences(repository, key, options));
}
export function generateReelCover(repository: RepositoryService, key: ReelKey, operationId: string, options?: CoverGenerationOptions) {
  return runPackageAttempt(repository, key, "cover", operationId, (snapshot) => generateReelCoverImage(repository, key, options, snapshot));
}
export function generateReelPublishingUnit(
  repository: RepositoryService,
  key: ReelKey,
  operationId: string,
  options?: PublishingGenerationOptions,
) {
  return runPackageAttempt(repository, key, "publishing", operationId, async (snapshot) => {
    const localization = options?.localization ?? (await loadShortReelLocalizationArtifact(repository, key.channel_id, key.reel_id));
    return generateReelPublishing(snapshot, { ...options, localization });
  });
}
export interface FullPackageGenerationOptions {
  script?: ReelScript;
  llmClient?: LLMClient;
  scriptOptions?: GenerateReelScriptOptions;
  referenceOptions?: ReferenceResolveOptions;
  coverOptions?: CoverGenerationOptions;
  publishingOptions?: PublishingGenerationOptions;
}
export async function generateFullReelPackage(
  repository: RepositoryService,
  key: ReelKey,
  options?: FullPackageGenerationOptions,
): Promise<ShortReelRecord> {
  const operation = randomUUID();
  const original = await repository.getShortReel(key);
  if (options?.referenceOptions || original.units.references.state !== "ready")
    await generateReelReferencesUnit(repository, key, `references-${operation}`, options?.referenceOptions);
  if (options?.script)
    await runPackageAttempt(repository, key, "script", `script-${operation}`, () => Promise.resolve({ script: options.script }));
  else if (original.units.script.state !== "ready" || !original.script)
    await generateReelScriptUnit(repository, key, `script-${operation}`, options?.llmClient, options?.scriptOptions);
  const current = await repository.getShortReel(key);
  if (current.units.script.state !== "ready" || !current.script)
    throw new PackageServiceError("VALIDATION_FAILED", "A current script is required before generating a package.");
  const jobs: Promise<ShortReelRecord>[] = [];
  if (current.units.cover.state !== "ready") jobs.push(generateReelCover(repository, key, `cover-${operation}`, options?.coverOptions));
  if (current.units.publishing.state !== "ready")
    jobs.push(generateReelPublishingUnit(repository, key, `publishing-${operation}`, options?.publishingOptions));
  const results = await Promise.allSettled(jobs);
  const failed = results.find((result) => result.status === "rejected");
  if (failed?.status === "rejected")
    throw new PackageServiceError("ATTEMPT_FAILED", "Some package units failed. Successful units were preserved; retry failed units.");
  return repository.getShortReel(key);
}
