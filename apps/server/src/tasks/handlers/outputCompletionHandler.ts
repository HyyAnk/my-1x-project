import type { TaskManagerRuntime, ActiveRun } from "../runtime.js";
import { isMalformedJsonOutput, isSequenceOutputFailure } from "../validators.js";
import { handleTextArtifactOutput } from "./textArtifactHandlers.js";
import {
  handleAllScenesOutput,
  handleBundleImageOutput,
  handleRegenerateSceneOutput,
  handleSequenceScenesOutput,
} from "./sceneArtifactHandlers.js";

async function resolveOutputFiles(runtime: TaskManagerRuntime, active: ActiveRun, output: string): Promise<string[]> {
  const textOutputFiles = await handleTextArtifactOutput(runtime, active, output);
  if (textOutputFiles !== null) {
    return textOutputFiles;
  }
  const taskType = active.task.task_type;
  if (taskType === "GENERATE_BUNDLE_IMAGE") {
    return handleBundleImageOutput(runtime, active, output);
  }
  if (taskType === "GENERATE_SEQUENCE_SCENES") {
    return handleSequenceScenesOutput(runtime, active, output);
  }
  if (taskType === "GENERATE_SCENES") {
    return handleAllScenesOutput(runtime, active, output);
  }
  return handleRegenerateSceneOutput(runtime, active, output);
}

async function tryRetryTask(runtime: TaskManagerRuntime, active: ActiveRun, message: string): Promise<boolean> {
  const taskType = active.task.task_type;
  if (taskType === "GENERATE_RESEARCH" && active.researchAttempts < 1 && message.startsWith("Quiz research quality gate failed")) {
    await runtime.retryQuizResearch(active, message);
    return true;
  }
  if (taskType === "GENERATE_SCRIPT" && active.scriptAttempts < 1 && message.startsWith("Quiz script quality gate failed")) {
    await runtime.retryScript(active, message);
    return true;
  }
  if (
    taskType === "GENERATE_VISUAL_BIBLE" &&
    active.visualBibleAttempts < 1 &&
    message.startsWith("Quiz visual bible quality gate failed")
  ) {
    await runtime.retryVisualBible(active, message);
    return true;
  }
  if (taskType === "GENERATE_SEQUENCE_SCENES" && active.sequenceAttempts < 2 && isSequenceOutputFailure(message)) {
    await runtime.retrySequenceScenes(active, message);
    return true;
  }
  if (taskType === "GENERATE_QUIZ" && active.quizAttempts < 1 && isMalformedJsonOutput(message)) {
    await runtime.retryQuiz(active, message);
    return true;
  }
  if (taskType === "SUGGEST_TOPICS" && active.topicSuggestionAttempts < 1) {
    await runtime.retryTopicSuggestions(active, message);
    return true;
  }
  return false;
}

async function preserveMalformedOutput(runtime: TaskManagerRuntime, active: ActiveRun, message: string): Promise<void> {
  if (!isMalformedJsonOutput(message)) return;
  const { task } = active;
  const savedPath = await runtime.logger.saveRawOutput(`${task.task_type}-${task.task_id}`, active.output);
  runtime.logger.warn(`${message}${savedPath ? ` (raw output saved to ${savedPath})` : ""}`, { workerId: task.task_id });
}

async function handleTaskFailure(runtime: TaskManagerRuntime, active: ActiveRun, message: string): Promise<void> {
  await preserveMalformedOutput(runtime, active, message);
  try {
    const retried = await tryRetryTask(runtime, active, message);
    if (retried) {
      return;
    }
  } catch (retryError) {
    await runtime.finish(active.task.task_id, "FAILED", retryError instanceof Error ? retryError.message : message);
    return;
  }
  await runtime.finish(active.task.task_id, "FAILED", message);
}

export async function completeWithOutput(this: TaskManagerRuntime, active: ActiveRun): Promise<void> {
  try {
    const output = active.output.trim();
    const task = active.task;
    const outputFiles = await resolveOutputFiles(this, active, output);
    await this.finish(task.task_id, "COMPLETED", null, outputFiles);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not persist Codex output";
    await handleTaskFailure(this, active, message);
  }
}
