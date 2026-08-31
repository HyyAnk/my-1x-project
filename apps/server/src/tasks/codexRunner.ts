import { nowIso, type Task } from "@studio/shared";
import { Gpti2ImageProvider } from "../providers/gpti2Image.js";
import { ShopAiKeyImageProvider } from "../providers/shopAiKeyImage.js";
import type { ActiveRun, TaskManagerRuntime } from "./runtime.js";
import { retryQuizResearch, retryScript, retrySequenceScenes, retryVisualBible } from "./codexRetries.js";
import { handleNotification } from "./stream/notificationHandler.js";
import { handleServerRequest } from "./stream/approvalHandler.js";
import { completeWithOutput } from "./handlers/outputCompletionHandler.js";

export {
  retryQuizResearch,
  retryScript,
  retryVisualBible,
  retrySequenceScenes,
  handleNotification,
  handleServerRequest,
  completeWithOutput,
};

export async function run(this: TaskManagerRuntime, task: Task): Promise<void> {
  if (task.task_type === "GENERATE_PIPELINE") {
    await this.runPipelineTask(task);
    return;
  }
  if (task.task_type === "GENERATE_VIDEO") {
    await this.runVideoTask(task);
    return;
  }
  if (task.task_type === "GENERATE_BUNDLE_IMAGE") {
    const provider = this.imageConfig.provider ?? "gpti2";
    if (provider === "gpti2" && Gpti2ImageProvider.isConfigured(this.imageConfig.api_key)) {
      await this.runGpti2BundleImageTask(task);
      return;
    }
    if (provider === "shopaikey" && (this.imageConfig.api_key || ShopAiKeyImageProvider.isConfigured())) {
      await this.runShopAiKeyImageTask(task);
      return;
    }
    if (provider === "custom" && this.imageConfig.api_key) {
      await this.runShopAiKeyImageTask(task);
      return;
    }
    if (this.activeEngine === "antigravity") {
      await this.runAntigravityBundleImageTask(task);
      return;
    }
    if (ShopAiKeyImageProvider.isConfigured(this.imageConfig.api_key)) {
      await this.runShopAiKeyImageTask(task);
      return;
    }
  }

  const context = { profileId: task.channel_id, workerId: task.task_id, step: `run_task:${task.task_type}` };
  try {
    await this.update(task.task_id, {
      status: "RUNNING",
      started_at: nowIso(),
      queue_position: null,
      progress_message: "Preparing scoped context",
    });
    const topicHint = this.topicHints.get(task.task_id);
    const manifest = await this.contextEngine.build(
      task.task_type,
      task.channel_id,
      task.episode_id,
      this.findSceneNumber(task.task_id),
      this.imageVariants.get(task.task_id) ?? 0,
      topicHint,
    );
    const isAntigravity = this.activeEngine === "antigravity" && Boolean(this.antigravity);
    const client = isAntigravity ? this.antigravity! : this.codex;
    const engineName = isAntigravity ? "Antigravity" : "Codex";
    await this.update(task.task_id, { progress_message: `Connecting to ${engineName}` });
    await client.connect();
    const threadId = task.codex_thread_id ? await client.resumeThread(task.codex_thread_id) : await client.startThread();
    const completionPromise = new Promise<void>((resolve) => this.completionWaiters.set(task.task_id, resolve));
    const activeRecord: ActiveRun = {
      task: this.get(task.task_id),
      threadId,
      turnId: "",
      output: "",
      manifest,
      researchAttempts: 0,
      scriptAttempts: 0,
      visualBibleAttempts: 0,
      sequenceAttempts: 0,
    };
    this.active.set(task.task_id, activeRecord);
    const turnId = await client.startTurn(threadId, manifest.prompt);
    activeRecord.turnId = turnId;
    if (this.get(task.task_id).status === "RUNNING") {
      void this.update(task.task_id, { codex_thread_id: threadId, codex_turn_id: turnId, progress_message: "Generating" });
    }
    this.logger.step(`${engineName} turn started`, context);
    await completionPromise;
  } catch (error) {
    await this.finish(task.task_id, "FAILED", error instanceof Error ? error.message : "Task failed");
    this.logger.error(`${this.activeEngine === "antigravity" ? "Antigravity" : "Codex"} task failed`, context);
  }
}
