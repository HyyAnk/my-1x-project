import type { QuizStageTimings } from "@studio/shared";
import type { RepositoryService } from "../../repository.js";

export async function initializeStageTimings(
  repository: RepositoryService,
  channelId: string,
  episodeId: string,
): Promise<QuizStageTimings> {
  const timings = (await repository.readQuizStageTimings?.(channelId, episodeId)) ?? {
    schema_version: 1,
    episode_id: episodeId,
    stages: {},
    parallel_groups: {},
  };
  if (!timings.stages) timings.stages = {};
  if (!timings.parallel_groups) timings.parallel_groups = {};
  return timings;
}

export async function recordStageTiming(
  repository: RepositoryService,
  channelId: string,
  episodeId: string,
  timings: QuizStageTimings,
  stageKey: string,
  startMs: number,
  completed = true,
): Promise<void> {
  const durationSeconds = Math.max(0, Math.round((Date.now() - startMs) / 1000));
  if (!timings.stages) timings.stages = {};
  timings.stages[stageKey] = {
    started_at: new Date(startMs).toISOString(),
    completed_at: completed ? new Date().toISOString() : null,
    duration_seconds: durationSeconds,
  };
  timings.updated_at = new Date().toISOString();
  await repository.writeQuizStageTimings?.(channelId, episodeId, timings)?.catch?.(() => {});
}

export async function recordParallelTiming(
  repository: RepositoryService,
  channelId: string,
  episodeId: string,
  timings: QuizStageTimings,
  groupKey: string,
  parallelStartMs: number,
  stages: Array<{ key: string; startMs: number; endMs: number }>,
): Promise<void> {
  const parallelEndMs = Date.now();
  const parallelTotalSeconds = Math.max(0, Math.round((parallelEndMs - parallelStartMs) / 1000));
  if (!timings.stages) timings.stages = {};
  for (const item of stages) {
    timings.stages[item.key] = {
      started_at: new Date(item.startMs).toISOString(),
      completed_at: new Date(item.endMs).toISOString(),
      duration_seconds: Math.max(0, Math.round((item.endMs - item.startMs) / 1000)),
      parallel_group: groupKey,
      parallel_total_seconds: parallelTotalSeconds,
    };
  }
  if (!timings.parallel_groups) timings.parallel_groups = {};
  timings.parallel_groups[groupKey] = {
    stages: stages.map((s) => s.key),
    duration_seconds: parallelTotalSeconds,
  };
  timings.updated_at = new Date().toISOString();
  await repository.writeQuizStageTimings(channelId, episodeId, timings).catch(() => {});
}

export interface QuizPipelineTimingsRecorder {
  timings: QuizStageTimings;
  recordStageTiming: (stageKey: string, startMs: number, completed?: boolean) => Promise<void>;
  recordParallelTiming: (
    groupKey: string,
    parallelStartMs: number,
    stages: Array<{ key: string; startMs: number; endMs: number }>,
  ) => Promise<void>;
}

export async function createQuizPipelineTimingsRecorder(
  repository: RepositoryService,
  channelId: string,
  episodeId: string,
): Promise<QuizPipelineTimingsRecorder> {
  const timings = await initializeStageTimings(repository, channelId, episodeId);
  return {
    timings,
    recordStageTiming: (stageKey: string, startMs: number, completed = true) =>
      recordStageTiming(repository, channelId, episodeId, timings, stageKey, startMs, completed),
    recordParallelTiming: (groupKey: string, parallelStartMs: number, stages) =>
      recordParallelTiming(repository, channelId, episodeId, timings, groupKey, parallelStartMs, stages),
  };
}
