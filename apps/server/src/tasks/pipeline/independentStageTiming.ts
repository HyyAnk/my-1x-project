import type { Task } from "@studio/shared";
import type { RepositoryService } from "../../repository.js";
import { mergeQuizTimingPatch } from "../../repository/quiz/quizTimingMutation.js";

/** Merge only this stage under the same episode mutation boundary used by artifact writers. */
export async function recordIndependentStageTiming(
  repository: RepositoryService,
  task: Task,
  stage: "thumbnail" | "render",
  started: number,
  completed: boolean,
): Promise<void> {
  if (!task.episode_id) return;
  await mergeQuizTimingPatch(repository, task.channel_id, task.episode_id, {
    stages: {
      [stage]: {
        started_at: new Date(started).toISOString(),
        completed_at: completed ? new Date().toISOString() : null,
        duration_seconds: Math.max(0, Math.round((Date.now() - started) / 1000)),
      },
    },
  });
}
