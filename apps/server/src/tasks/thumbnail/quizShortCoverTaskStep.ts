import { nowIso, type Task } from "@studio/shared";
import { generateQuizShortCoverForProduct } from "../../quiz/thumbnail/quizShortCoverService.js";
import type { LLMClient } from "../../utils/promptSanitizer.js";
import { recordIndependentStageTiming } from "../pipeline/independentStageTiming.js";
import { resolveRuntimePortraitImageClient } from "../portraitImageRuntime.js";
import type { TaskManagerRuntime } from "../runtime.js";

function resolveRuntimeLlmClient(runtime: TaskManagerRuntime): LLMClient {
  return runtime.activeEngine === "antigravity" && runtime.antigravity ? runtime.antigravity : runtime.codex;
}

/**
 * The GENERATE_THUMBNAIL body for a Quiz Short: one 9:16 cover written to the product assets.
 * Returns the output file paths for the task record.
 */
export async function runQuizShortCoverStep(
  runtime: TaskManagerRuntime,
  task: Task,
  quizShortId: string,
  signal: AbortSignal,
  startedAtMs: number,
): Promise<string[]> {
  const context = { profileId: task.channel_id, workerId: task.task_id, step: "thumbnail" };
  await runtime.update(task.task_id, {
    status: "RUNNING",
    started_at: nowIso(),
    queue_position: null,
    progress_message: "Generating Quiz Short cover",
    progress_percent: null,
  });
  runtime.logger.info("Starting Quiz Short cover: ratio=9:16, method=portrait provider API", context);
  await recordIndependentStageTiming(runtime.repository, task, "thumbnail", startedAtMs, false);

  const result = await generateQuizShortCoverForProduct({
    repository: runtime.repository,
    channelId: task.channel_id,
    quizShortId,
    portraitImageClient: resolveRuntimePortraitImageClient(runtime),
    llmClient: resolveRuntimeLlmClient(runtime),
    logger: runtime.logger,
    signal,
  });
  signal.throwIfAborted();
  await recordIndependentStageTiming(runtime.repository, task, "thumbnail", startedAtMs, true);
  runtime.logger.ok(
    `Quiz Short cover ${result.reused ? "reused" : "generated"}: elapsed=${Math.round((Date.now() - startedAtMs) / 1000)}s`,
    context,
  );
  return [result.manifest.asset_path];
}
