import { nowIso, type Task, type TaskType } from "@studio/shared";
import { rebalanceEditorialOverlays } from "../../sceneTiming.js";
import { waitForTaskTerminal } from "./pipelineHelpers.js";
import { runQuizV2Pipeline } from "./quizV2PipelineRunner.js";
import type { PipelineRun, TaskManagerRuntime } from "../runtime.js";

type PipelineStepFn = (label: string, percent: number, childType: TaskType, shouldRun: () => Promise<boolean>) => Promise<boolean>;

async function runQuizNativePipeline(runtime: TaskManagerRuntime, task: Task, episodeId: string, step: PipelineStepFn): Promise<void> {
  const existingQuiz = await runtime.repository.readQuiz(task.channel_id, episodeId);
  if (!existingQuiz) {
    await step(
      "Quiz · generating structured questions",
      10,
      "GENERATE_QUIZ",
      async () => !(await runtime.repository.readQuiz(task.channel_id, episodeId)),
    );
  } else {
    await runtime.update(task.task_id, {
      progress_message: "Quiz · questions already ready",
      progress_percent: 10,
    });
  }

  const scenes = await runtime.repository.readScenes(task.channel_id, episodeId);
  if (scenes.length > 0) {
    const balancedScenes = rebalanceEditorialOverlays(scenes);
    await runtime.repository.saveScenes(task.channel_id, episodeId, balancedScenes);
  }
}

async function runVideoRenderStep(runtime: TaskManagerRuntime, task: Task, episodeId: string, run: PipelineRun): Promise<void> {
  await runtime.update(task.task_id, { progress_message: "Video · linting Quiz composition", progress_percent: 60 });
  const renderStartMs = Date.now();
  const videoChild = runtime.submit("GENERATE_VIDEO", task.channel_id, episodeId);
  run.children.add(videoChild.task_id);
  try {
    const completed = await waitForTaskTerminal.call(runtime, videoChild.task_id, run, async (childTask) => {
      if (childTask.render_progress) {
        const { frames_completed, total_frames } = childTask.render_progress;
        const captureRatio = total_frames > 0 ? frames_completed / total_frames : 0;
        const pipelinePercent = Math.min(98, Math.max(60, Math.round((60 + captureRatio * 38) * 100) / 100));
        await runtime.update(task.task_id, {
          progress_message:
            childTask.progress_message ??
            `Video · rendering frame ${frames_completed.toLocaleString("en-US")} / ${total_frames.toLocaleString("en-US")}`,
          progress_percent: pipelinePercent,
          render_progress: childTask.render_progress,
        });
      } else if (childTask.progress_message) {
        await runtime.update(task.task_id, {
          progress_message: childTask.progress_message,
        });
      }
    });
    if (completed.status !== "COMPLETED") throw new Error(`Video render failed: ${completed.error ?? completed.status}`);
    const renderDuration = Math.max(0, Math.round((Date.now() - renderStartMs) / 1000));
    const existingTimings = (await runtime.repository.readQuizStageTimings?.(task.channel_id, episodeId)) ?? {
      schema_version: 1,
      episode_id: episodeId,
      stages: {},
      parallel_groups: {},
    };
    if (!existingTimings.stages) existingTimings.stages = {};
    existingTimings.stages.render = {
      started_at: new Date(renderStartMs).toISOString(),
      completed_at: new Date().toISOString(),
      duration_seconds: renderDuration,
    };
    existingTimings.updated_at = new Date().toISOString();
    await runtime.repository.writeQuizStageTimings?.(task.channel_id, episodeId, existingTimings)?.catch?.(() => {});
  } finally {
    run.children.delete(videoChild.task_id);
  }
}

export async function runPipelineTask(this: TaskManagerRuntime, task: Task): Promise<void> {
  if (!task.episode_id) {
    await this.finish(task.task_id, "FAILED", "Episode is required for the production pipeline");
    return;
  }
  const run: PipelineRun = { cancelled: false, children: new Set() };
  this.pipelineRuns.set(task.task_id, run);
  const episodeId = task.episode_id;
  const step: PipelineStepFn = async (
    label: string,
    percent: number,
    childType: TaskType,
    shouldRun: () => Promise<boolean>,
  ): Promise<boolean> => {
    if (run.cancelled) throw new Error("Pipeline cancelled");
    await this.update(task.task_id, { progress_message: label, progress_percent: percent });
    if (!(await shouldRun())) return false;
    const child = this.submit(childType, task.channel_id, episodeId);
    run.children.add(child.task_id);
    try {
      const completed = await waitForTaskTerminal.call(this, child.task_id, run);
      if (completed.status !== "COMPLETED") throw new Error(`${label} failed: ${completed.error ?? completed.status}`);
    } finally {
      run.children.delete(child.task_id);
    }
    return true;
  };
  try {
    await this.update(task.task_id, {
      status: "RUNNING",
      started_at: nowIso(),
      queue_position: null,
      progress_message: "Starting Quiz production pipeline",
      progress_percent: 0,
    });

    await runQuizNativePipeline(this, task, episodeId, step);

    if (run.cancelled) throw new Error("Pipeline cancelled");
    await runQuizV2Pipeline.call(this, task);

    if (run.cancelled) throw new Error("Pipeline cancelled");
    await runVideoRenderStep(this, task, episodeId, run);

    await this.finish(task.task_id, "COMPLETED", null, []);
  } catch (error) {
    const cancelled = run.cancelled || (error instanceof Error && error.message === "Pipeline cancelled");
    await this.finish(
      task.task_id,
      cancelled ? "CANCELLED" : "FAILED",
      cancelled ? "Cancelled by user" : error instanceof Error ? error.message : "Production pipeline failed",
    );
  } finally {
    this.pipelineRuns.delete(task.task_id);
  }
}
