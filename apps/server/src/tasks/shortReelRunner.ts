import {
  nowIso,
  type GenerateShortReelRequest,
  type ReelKey,
  type ReelStageProgress,
  type Task,
} from "@studio/shared";
import type { TaskManagerRuntime } from "./runtime.js";
import type { LLMClient } from "../utils/promptSanitizer.js";
import { createPortraitImageClient } from "../providers/imageGeneration/portraitImageClient.js";
import type { PortraitImageClient } from "../providers/imageGeneration/imageGeneration.types.js";
import { executeReelGeneration } from "../shortReel/generationWorkflow.js";
import type { ReelGenerationProgress } from "../shortReel/generation.types.js";

export function isShortReelTask(task: Task): boolean {
  return task.task_type === "GENERATE_SHORT_REEL" || task.task_type === "GENERATE_SHORT_REEL_PACKAGE";
}

export async function runShortReelTask(runtime: TaskManagerRuntime, task: Task): Promise<void> {
  if (!task.reel_id) {
    await runtime.finish(task.task_id, "FAILED", "Reel ID is required for short reel generation task");
    return;
  }

  const controller = new AbortController();
  runtime.activeShortReelControllers.set(task.task_id, controller);

  const key: ReelKey = { channel_id: task.channel_id, reel_id: task.reel_id };

  try {
    if (controller.signal.aborted || runtime.get(task.task_id).status === "CANCELLED") {
      return;
    }

    await runtime.update(task.task_id, {
      status: "RUNNING",
      started_at: nowIso(),
      progress_message: "Starting Short-Reel generation...",
      progress_percent: null,
    });

    const llmClient: LLMClient =
      runtime.activeEngine === "antigravity" && runtime.antigravity
        ? runtime.antigravity
        : runtime.codex;

    const imageClient: PortraitImageClient =
      (runtime as unknown as { portraitImageClient?: PortraitImageClient }).portraitImageClient ??
      (runtime as unknown as { imageClient?: PortraitImageClient }).imageClient ??
      createPortraitImageClient(runtime.imageConfig, runtime.imageFallbackConfig);

    const stages: ReelStageProgress[] = [];
    let latestRevision: number | null = null;

    const onProgress = async (progress: ReelGenerationProgress): Promise<void> => {
      const existingIndex = stages.findIndex((s) => s.stage === progress.stage);
      const stageEntry: ReelStageProgress = {
        stage: progress.stage,
        state: progress.state,
        message: progress.message.slice(0, 500),
      };

      if (existingIndex >= 0) {
        stages[existingIndex] = stageEntry;
      } else {
        stages.push(stageEntry);
      }

      if (progress.recordRevision !== undefined) {
        latestRevision = progress.recordRevision;
      }

      await runtime.update(task.task_id, {
        progress_message: progress.message.slice(0, 500),
        progress_percent: null,
        short_reel_progress: {
          stages: [...stages],
          record_revision: latestRevision,
        },
      });
    };

    const rawTarget =
      runtime.shortReelTargets.get(task.task_id) ??
      task.short_reel_request?.target ??
      "package";

    const reel = await runtime.repository.getShortReel(key);

    const request: GenerateShortReelRequest = {
      expected_revision: task.short_reel_request?.expected_revision ?? reel.revision,
      request_id: task.short_reel_request?.request_id ?? task.task_id,
      target: rawTarget,
      mode: task.short_reel_request?.mode,
    };

    if (rawTarget === "cover") {
      if (imageClient && reel.units.references.state === "ready" && reel.units.script.state === "ready") {
        await executeReelGeneration(runtime.repository, key, request, {
          imageClient,
          llmClient,
          signal: controller.signal,
          onProgress,
        });
      } else {
        const imageProvider = runtime.createImageProvider?.({
          channelId: task.channel_id,
          episodeId: task.reel_id,
          bundleNumber: 1,
          variant: 1,
        });
        const { generateReelCover } = await import("../shortReel/packageService.js");
        const { randomUUID } = await import("node:crypto");
        await generateReelCover(runtime.repository, key, `cover-${randomUUID()}`, {
          imageProvider,
          signal: controller.signal,
        });
      }
    } else if (rawTarget === "references") {
      if (reel.script && reel.units.script.state === "ready") {
        await executeReelGeneration(runtime.repository, key, request, {
          imageClient,
          llmClient,
          signal: controller.signal,
          onProgress,
        });
      } else {
        const { generateReelReferencesUnit } = await import("../shortReel/packageService.js");
        const { randomUUID } = await import("node:crypto");
        await generateReelReferencesUnit(runtime.repository, key, `references-${randomUUID()}`);
      }
    } else if (rawTarget === "publishing") {
      const { generateReelPublishingUnit } = await import("../shortReel/packageService.js");
      const { randomUUID } = await import("node:crypto");
      await generateReelPublishingUnit(runtime.repository, key, `publishing-${randomUUID()}`, {
        llmClient,
        signal: controller.signal,
      });
    } else if (rawTarget.startsWith("segment_")) {
      const { generateReelSegmentUnit } = await import("../shortReel/packageService.js");
      const { randomUUID } = await import("node:crypto");
      await generateReelSegmentUnit(
        runtime.repository,
        key,
        Number(rawTarget.slice(-1)) as 1 | 2 | 3,
        `${rawTarget}-${randomUUID()}`,
        llmClient,
        { signal: controller.signal },
      );
    } else if (rawTarget === "script") {
      const { generateReelScriptUnit } = await import("../shortReel/packageService.js");
      const { randomUUID } = await import("node:crypto");
      await generateReelScriptUnit(runtime.repository, key, `script-${randomUUID()}`, llmClient, {
        signal: controller.signal,
      });
    } else {
      await executeReelGeneration(runtime.repository, key, request, {
        imageClient,
        llmClient,
        signal: controller.signal,
        onProgress,
      });
    }

    if (!controller.signal.aborted && runtime.get(task.task_id).status !== "CANCELLED") {
      await runtime.finish(task.task_id, "COMPLETED", null);
    }
  } catch (error) {
    if (!controller.signal.aborted && runtime.get(task.task_id).status !== "CANCELLED") {
      const msg = error instanceof Error ? error.message : "Short-Reel package generation failed";
      await runtime.finish(task.task_id, "FAILED", msg);
    }
  } finally {
    runtime.activeShortReelControllers.delete(task.task_id);
    runtime.shortReelTargets.delete(task.task_id);
  }
}
