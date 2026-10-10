import type { QuizProductKind, QuizProductRef, Task } from "@studio/shared";
import { RepositoryError } from "../repository.js";

/** Task records name their product through `episode_id` plus the optional `product_kind` (absent means Episode). */
export function taskProductKind(task: Pick<Task, "product_kind">): QuizProductKind {
  return task.product_kind ?? "episode";
}

export function productRefFromTask(task: Pick<Task, "channel_id" | "episode_id" | "product_kind">): QuizProductRef {
  if (!task.episode_id) throw new RepositoryError("A product is required for this task", "EPISODE_REQUIRED");
  return { kind: taskProductKind(task), channel_id: task.channel_id, product_id: task.episode_id };
}
