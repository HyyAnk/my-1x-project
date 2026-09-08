import { randomUUID } from "node:crypto";
import { nowIso, type Task } from "@studio/shared";
import {
  generateFullReelPackage,
  generateReelCover,
  generateReelPublishingUnit,
  generateReelReferencesUnit,
  generateReelScriptUnit,
  generateReelSegmentUnit,
} from "../shortReel/packageService.js";
import { Gpti2ImageProvider } from "../providers/gpti2Image.js";
import { ShopAiKeyImageProvider } from "../providers/shopAiKeyImage.js";
import type { ActiveRun, TaskManagerRuntime } from "./runtime.js";
import { retryQuizResearch, retryScript, retrySequenceScenes, retryVisualBible, retryTopicSuggestions } from "./codexRetries.js";
import { handleNotification } from "./stream/notificationHandler.js";
import { handleServerRequest } from "./stream/approvalHandler.js";
import { completeWithOutput } from "./handlers/outputCompletionHandler.js";
import { getAssignedTopicMatrixPlan, getAssignedTopicAllocation } from "../context/channelContextBuilder.js";
import type { LLMClient } from "../utils/promptSanitizer.js";
import type { TopicRunResult } from "@studio/shared";

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

function isShortReelTask(task: Task): boolean {
  return task.task_type === "GENERATE_SHORT_REEL" || task.task_type === "GENERATE_SHORT_REEL_PACKAGE";
}

async function runShortReelTask(runtime: TaskManagerRuntime, task: Task): Promise<void> {
  if (!task.reel_id) {
    await runtime.finish(task.task_id, "FAILED", "Reel ID is required for short reel generation task");
    return;
  }
  const controller = new AbortController();
  runtime.activeShortReelControllers.set(task.task_id, controller);
  const key = { channel_id: task.channel_id, reel_id: task.reel_id };
  try {
    if (controller.signal.aborted || runtime.get(task.task_id).status === "CANCELLED") return;
    await runtime.update(task.task_id, { status: "RUNNING", started_at: nowIso(), progress_message: "Generating Short-Reel package..." });
    const client: LLMClient = runtime.activeEngine === "antigravity" && runtime.antigravity ? runtime.antigravity : runtime.codex;
    const imageProvider = runtime.createImageProvider?.({
      channelId: task.channel_id,
      episodeId: task.reel_id,
      bundleNumber: 1,
      variant: 1,
    });
    const target = runtime.shortReelTargets.get(task.task_id) ?? task.short_reel_request?.target ?? "package";
    if (target === "cover") await generateReelCover(runtime.repository, key, `cover-${randomUUID()}`, { imageProvider });
    else if (target === "references") await generateReelReferencesUnit(runtime.repository, key, `references-${randomUUID()}`);
    else if (target === "publishing")
      await generateReelPublishingUnit(runtime.repository, key, `publishing-${randomUUID()}`, {
        llmClient: client,
        signal: controller.signal,
      });
    else if (target.startsWith("segment_"))
      await generateReelSegmentUnit(runtime.repository, key, Number(target.slice(-1)) as 1 | 2 | 3, `${target}-${randomUUID()}`, client, {
        signal: controller.signal,
      });
    else if (target === "script")
      await generateReelScriptUnit(runtime.repository, key, `script-${randomUUID()}`, client, { signal: controller.signal });
    else
      await generateFullReelPackage(runtime.repository, key, {
        llmClient: client,
        coverOptions: { imageProvider, signal: controller.signal },
        scriptOptions: { signal: controller.signal },
        publishingOptions: { llmClient: client, signal: controller.signal },
      });
    if (!controller.signal.aborted && runtime.get(task.task_id).status !== "CANCELLED")
      await runtime.finish(task.task_id, "COMPLETED", null);
  } catch (error) {
    if (!controller.signal.aborted && runtime.get(task.task_id).status !== "CANCELLED") {
      await runtime.finish(task.task_id, "FAILED", error instanceof Error ? error.message : "Short-Reel package generation failed");
    }
  } finally {
    runtime.activeShortReelControllers.delete(task.task_id);
    runtime.shortReelTargets.delete(task.task_id);
  }
}

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
