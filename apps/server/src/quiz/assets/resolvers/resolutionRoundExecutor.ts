import type { QuizAssetPlan, QuizAssetResolution, QuizIssue } from "@studio/shared";
import { setTimeout as delay } from "node:timers/promises";
import type { StudioLogger } from "../../../logger.js";
import type { RepositoryService } from "../../../repository.js";
import { runConcurrent } from "../../../utils/concurrency.js";
import { classifyAssetError } from "./assetErrorClassifier.js";
import type { ProviderCircuitBreaker } from "./circuitBreaker.js";
import { resolveSingleAsset } from "./singleAssetResolver.js";
import type { ResolveQuizAssetsInput } from "../resolveQuizAssets.js";

export interface ResolutionRoundsParams {
  input: ResolveQuizAssetsInput;
  resolvedMap: Map<string, QuizAssetResolution["assets"][number]>;
  byFingerprint: Map<string, QuizAssetResolution["assets"][number]>;
  consistencyGroups: Map<string, QuizAssetPlan["consistency_groups"][number]>;
  logger: StudioLogger;
  activeEngine: "codex" | "antigravity";
  imgStudioRunId: string;
  circuitBreaker: ProviderCircuitBreaker;
  maxRounds: number;
  issues: QuizIssue[];
}

interface ProcessAssetRoundParams {
  request: QuizAssetPlan["assets"][number];
  round: number;
  maxRounds: number;
  input: ResolveQuizAssetsInput;
  byFingerprint: Map<string, QuizAssetResolution["assets"][number]>;
  consistencyGroups: Map<string, QuizAssetPlan["consistency_groups"][number]>;
  logger: StudioLogger;
  activeEngine: "codex" | "antigravity";
  imgStudioRunId: string;
  circuitBreaker: ProviderCircuitBreaker;
  resolvedMap: Map<string, QuizAssetResolution["assets"][number]>;
  terminalFailed: Set<string>;
  issues: QuizIssue[];
  safePersist: () => Promise<void>;
}

/**
 * Persists partial resolution incrementally to disk as assets complete.
 */
async function persistIncrementalResolution(
  repository: RepositoryService,
  channelId: string,
  episodeId: string,
  plan: QuizAssetPlan,
  resolvedMap: Map<string, QuizAssetResolution["assets"][number]>,
): Promise<void> {
  const currentAssets = plan.assets
    .map((req) => resolvedMap.get(req.asset_id))
    .filter((asset): asset is QuizAssetResolution["assets"][number] => Boolean(asset));
  const partialResolution: QuizAssetResolution = {
    schema_version: 2,
    episode_id: episodeId,
    template_id: "candy_arcade",
    assets: currentAssets,
  };
  await repository.writeQuizAssetResolution(channelId, episodeId, partialResolution);
}

/**
 * Handles individual asset resolution within a concurrent round, managing error classification,
 * terminal failure registration, incremental persistence, and progress notification.
 */
async function processAssetInRound(params: ProcessAssetRoundParams): Promise<void> {
  const {
    request,
    round,
    maxRounds,
    input,
    byFingerprint,
    consistencyGroups,
    logger,
    activeEngine,
    imgStudioRunId,
    circuitBreaker,
    resolvedMap,
    terminalFailed,
    issues,
    safePersist,
  } = params;

  let reused = false;
  try {
    const result = await resolveSingleAsset({
      request,
      round,
      maxRounds,
      input,
      byFingerprint,
      consistencyGroups,
      logger,
      activeEngine,
      imgStudioRunId,
      circuitBreaker,
    });
    if (result.entry) {
      resolvedMap.set(request.asset_id, result.entry);
    }
    if (result.issue) {
      issues.push(result.issue);
    }
    reused = result.reused;
  } catch (error) {
    if (input.cancellationSignal?.aborted) {
      throw error;
    }
    const classified = classifyAssetError(request, error, round, maxRounds);
    if (classified) {
      if (classified.terminal) {
        terminalFailed.add(request.asset_id);
      }
      issues.push(classified.issue);
    }
  } finally {
    if (resolvedMap.has(request.asset_id)) {
      void safePersist();
    }
    await input.onProgress?.({ completed: resolvedMap.size, total: input.plan.assets.length, reused });
  }
}

/**
 * Executes the multi-round retry loop (up to maxRounds) for resolving pending assets.
 */
export async function executeResolutionRounds(params: ResolutionRoundsParams): Promise<void> {
  const {
    input,
    resolvedMap,
    byFingerprint,
    consistencyGroups,
    logger,
    activeEngine,
    imgStudioRunId,
    circuitBreaker,
    maxRounds,
    issues,
  } = params;

  const ASSET_CONCURRENCY = 4;
  const terminalFailed = new Set<string>();

  for (let round = 1; round <= maxRounds; round++) {
    input.cancellationSignal?.throwIfAborted();
    const pendingRequests = input.plan.assets.filter(
      (req) => !resolvedMap.has(req.asset_id) && !terminalFailed.has(req.asset_id),
    );
    if (pendingRequests.length === 0) break;

    if (round > 1) {
      logger.warn(`Quiz assets retry round ${round}/${maxRounds}: regenerating ${pendingRequests.length} missing assets...`, {
        profileId: input.channelId,
        workerId: input.episodeId,
        step: "retry_quiz_assets",
      });
      await delay(round * 500, undefined, { signal: input.cancellationSignal });
    } else if (resolvedMap.size > 0) {
      await input.onProgress?.({ completed: resolvedMap.size, total: input.plan.assets.length, reused: true });
    }

    let persistQueue = Promise.resolve();
    const safePersist = () => {
      persistQueue = persistQueue
        .then(() => persistIncrementalResolution(input.repository, input.channelId, input.episodeId, input.plan, resolvedMap))
        .catch(() => undefined);
      return persistQueue;
    };

    await runConcurrent(pendingRequests, ASSET_CONCURRENCY, (request) =>
      processAssetInRound({
        request,
        round,
        maxRounds,
        input,
        byFingerprint,
        consistencyGroups,
        logger,
        activeEngine,
        imgStudioRunId,
        circuitBreaker,
        resolvedMap,
        terminalFailed,
        issues,
        safePersist,
      }),
    );

    await safePersist();
  }
}
