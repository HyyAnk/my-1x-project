import type { TaskManagerRuntime, ActiveRun } from "../runtime.js";
import { isSequenceOutputFailure } from "../validators.js";
import { handleTextArtifactOutput } from "./textArtifactHandlers.js";
import {
  handleAllScenesOutput,
  handleBundleImageOutput,
  handleRegenerateSceneOutput,
  handleSequenceScenesOutput,
} from "./sceneArtifactHandlers.js";

export async function completeWithOutput(this: TaskManagerRuntime, active: ActiveRun): Promise<void> {
  try {
    const output = active.output.trim();
    const task = active.task;
    let outputFiles: string[] = [];

    const textOutputFiles = await handleTextArtifactOutput(this, active, output);
    if (textOutputFiles !== null) {
      outputFiles = textOutputFiles;
    } else if (task.task_type === "GENERATE_BUNDLE_IMAGE") {
      outputFiles = await handleBundleImageOutput(this, active, output);
    } else if (task.task_type === "GENERATE_SEQUENCE_SCENES") {
      outputFiles = await handleSequenceScenesOutput(this, active, output);
    } else if (task.task_type === "GENERATE_SCENES") {
      outputFiles = await handleAllScenesOutput(this, active, output);
    } else {
      outputFiles = await handleRegenerateSceneOutput(this, active, output);
    }

    await this.finish(task.task_id, "COMPLETED", null, outputFiles);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not persist Codex output";
    if (
      active.task.task_type === "GENERATE_RESEARCH" &&
      active.researchAttempts < 1 &&
      message.startsWith("Quiz research quality gate failed")
    ) {
      try {
        await this.retryQuizResearch(active, message);
        return;
      } catch (retryError) {
        await this.finish(active.task.task_id, "FAILED", retryError instanceof Error ? retryError.message : message);
        return;
      }
    }
    if (
      active.task.task_type === "GENERATE_SCRIPT" &&
      active.scriptAttempts < 1 &&
      message.startsWith("Quiz script quality gate failed")
    ) {
      try {
        await this.retryScript(active, message);
        return;
      } catch (retryError) {
        await this.finish(active.task.task_id, "FAILED", retryError instanceof Error ? retryError.message : message);
        return;
      }
    }
    if (
      active.task.task_type === "GENERATE_VISUAL_BIBLE" &&
      active.visualBibleAttempts < 1 &&
      message.startsWith("Quiz visual bible quality gate failed")
    ) {
      try {
        await this.retryVisualBible(active, message);
        return;
      } catch (retryError) {
        await this.finish(active.task.task_id, "FAILED", retryError instanceof Error ? retryError.message : message);
        return;
      }
    }
    if (active.task.task_type === "GENERATE_SEQUENCE_SCENES" && active.sequenceAttempts < 2 && isSequenceOutputFailure(message)) {
      try {
        await this.retrySequenceScenes(active, message);
        return;
      } catch (retryError) {
        await this.finish(active.task.task_id, "FAILED", retryError instanceof Error ? retryError.message : message);
        return;
      }
    }
    await this.finish(active.task.task_id, "FAILED", message);
  }
}
