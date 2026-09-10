import { nowIso, type Task, type TopicRunResult } from "@studio/shared";
import { randomUUID } from "node:crypto";
import { isShortReelTask, runShortReelTask } from "./shortReelRunner.js";
import { Gpti2ImageProvider } from "../providers/gpti2Image.js";
import { ShopAiKeyImageProvider } from "../providers/shopAiKeyImage.js";
import type { ActiveRun, TaskManagerRuntime } from "./runtime.js";
import { getAssignedTopicAllocation, getAssignedTopicMatrixPlan } from "../context/channelContextBuilder.js";
import { retryQuizResearch, retryScript, retrySequenceScenes, retryVisualBible, retryTopicSuggestions } from "./codexRetries.js";
import { handleNotification } from "./stream/notificationHandler.js";
import { handleServerRequest } from "./stream/approvalHandler.js";
import { completeWithOutput } from "./handlers/outputCompletionHandler.js";

export {
  retryQuizResearch,
  retryScript,
  retryVisualBible,
  retrySequenceScenes,
  retryTopicSuggestions,
  handleNotification,
  handleServerRequest,
  completeWithOutput,
};

export async function run(this: TaskManagerRuntime, task: Task): Promise<void> {
  if (isShortReelTask(task)) {
    await runShortReelTask(this, task);
    return;
  }
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

    if (task.task_type === "SUGGEST_TOPICS") {
      const allocation = getAssignedTopicAllocation(manifest);
      if (allocation && allocation.allocatedSlots.length === 0) {
        const emptyRun: TopicRunResult = {
          run_id: randomUUID(),
          target_episode_count: 3,
          target_short_reel_count: 2,
          candidates: [],
          shortages: allocation.shortages,
        };
        await this.repository.saveTopicRun(task.channel_id, emptyRun);
        await this.finish(task.task_id, "COMPLETED", null);
        this.logger.step("Topic suggestion completed (empty inventory fast-path)", context);
        return;
      }
    }

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
      topicSuggestionAttempts: 0,
      topicMatrixPlan: getAssignedTopicMatrixPlan(manifest),
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
