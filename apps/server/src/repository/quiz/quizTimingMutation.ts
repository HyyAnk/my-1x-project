import { QuizStageTimingsSchema, type QuizStageTimings } from "@studio/shared";
import type { RepositoryRuntime } from "../runtime.js";

export async function mergeQuizTimingPatch(
  repository: RepositoryRuntime,
  channelId: string,
  episodeId: string,
  patch: Pick<QuizStageTimings, "stages" | "parallel_groups">,
): Promise<void> {
  const target = await repository.quizArtifactTarget(channelId, episodeId, "stage-timings.json");
  await repository.queueEpisodeArtifactMutation(channelId, episodeId, async () => {
    const timings = (await repository.readQuizStageTimings(channelId, episodeId)) ?? {
      schema_version: 1 as const,
      episode_id: episodeId,
      stages: {},
      parallel_groups: {},
    };
    timings.stages = { ...timings.stages, ...patch.stages };
    timings.parallel_groups = { ...timings.parallel_groups, ...patch.parallel_groups };
    timings.updated_at = new Date().toISOString();
    // Already inside the mutation queue: do not re-enter writeQuizArtifact's lock.
    await repository.writeJsonAtomic(target.absolutePath, QuizStageTimingsSchema.parse(timings));
  });
}
