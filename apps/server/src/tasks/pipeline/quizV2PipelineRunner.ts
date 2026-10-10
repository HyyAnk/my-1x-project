import type { Task } from "@studio/shared";
import { directorPlanNeedsRefresh } from "../../quiz/pipeline/directorPlanFreshness.js";
import { productSizingPlanOptions } from "../../quiz/pipeline/productPipelineOptions.js";
import { isQuizAssetResolutionComplete } from "../../quiz/assets/resolveQuizAssets.js";
import { ensureQuizAssetSizing } from "../../quiz/assets/ensureQuizAssetSizing.js";
import {
  compileTimeline,
  generateDirector,
  generateProductDescription,
  generateQuiz,
  generateVoice,
  planAssets,
  readQuizArtifacts,
  resolveAssets,
} from "../../quiz/pipeline/orchestrator.js";
import type { TaskManagerRuntime } from "../runtime.js";
import { loadQuizProductView } from "../../quiz/pipeline/quizProductView.js";
import { productRefFromTask } from "../taskProductRef.js";
import { createQuizPipelineTimingsRecorder } from "./quizPipelineTimings.js";
import {
  createQuizPipelineInput,
  executeQuizQaGatesWithHealing,
  executeQuizVoicePipelineStep,
  shouldRegenerateQuizVoice,
} from "./quizPipelineVoiceStep.js";

export async function runQuizV2Pipeline(this: TaskManagerRuntime, task: Task): Promise<void> {
  let isParallelMode = false;
  const input = createQuizPipelineInput(this, task, () => isParallelMode);
  let artifacts = await readQuizArtifacts(input);
  const product = await loadQuizProductView(this.repository, productRefFromTask(task));
  const { recordStageTiming, recordParallelTiming } = await createQuizPipelineTimingsRecorder(
    this.repository,
    task.channel_id,
    task.episode_id!,
  );

  // Episodes re-check the requested layout; Quiz Shorts re-check the policy version and portrait layouts.
  const directorNeedsRefresh = directorPlanNeedsRefresh(artifacts.director_plan, product);
  if (!artifacts.quiz || directorNeedsRefresh) {
    const quizContentStart = Date.now();
    if (!artifacts.quiz) {
      await this.update(task.task_id, { progress_message: "Quiz · locking question facts", progress_percent: 26 });
      await generateQuiz(input);
      artifacts = await readQuizArtifacts(input);
    }
    if (!artifacts.director_plan || directorNeedsRefresh) {
      await this.update(task.task_id, { progress_message: "Quiz · directing question presentation", progress_percent: 28 });
      await generateDirector(input);
      artifacts = await readQuizArtifacts(input);
    }
    await recordStageTiming("quizContent", quizContentStart);
  }

  if (!artifacts.asset_plan) {
    await this.update(task.task_id, { progress_message: "Quiz · planning semantic assets", progress_percent: 30 });
    await planAssets(input);
    artifacts = await readQuizArtifacts(input);
  } else if (artifacts.quiz && artifacts.director_plan) {
    const sizingResult = await ensureQuizAssetSizing({
      repository: this.repository,
      channelId: task.channel_id,
      episodeId: task.episode_id!,
      artifacts: {
        quiz: artifacts.quiz,
        director: artifacts.director_plan,
        assetPlan: artifacts.asset_plan,
      },
      planOptions: productSizingPlanOptions(product),
      intent: "generate",
      confirmed: true,
    });
    if (sizingResult.persisted) {
      artifacts = await readQuizArtifacts(input);
    }
  }

  if (!artifacts.description || !artifacts.title) {
    // Episodes and Quiz Shorts get a title, then a description aligned with it; failures never block the render.
    const descStart = Date.now();
    try {
      await generateProductDescription(input);
      await recordStageTiming("description", descStart);
    } catch (error) {
      this.logger.warn(`Auto video description generation non-blocking skip: ${(error as Error).message}`, {
        profileId: task.channel_id,
        workerId: task.task_id,
      });
    }
  }

  const needsAssets =
    !artifacts.asset_resolution ||
    !artifacts.asset_plan ||
    !(await isQuizAssetResolutionComplete({
      repository: this.repository,
      channelId: task.channel_id,
      episodeId: task.episode_id!,
      plan: artifacts.asset_plan,
      resolution: artifacts.asset_resolution,
      activeEngine: this.activeEngine,
      imageConfig: input.config.image_generation
        ? {
            api_key: input.config.image_generation.api_key,
            model: input.config.image_generation.model,
            provider: input.config.image_generation.provider,
            base_url: input.config.image_generation.base_url,
            quality: input.config.image_generation.quality,
          }
        : undefined,
    }));

  const needsVoice = await shouldRegenerateQuizVoice(this, task, product.media.narration_asset_path, artifacts);

  if (needsAssets && needsVoice) {
    isParallelMode = true;
    await this.update(task.task_id, { progress_message: "Quiz · resolving assets and voice in parallel", progress_percent: 30 });
    const parallelStart = Date.now();
    let assetsStart = parallelStart;
    let assetsEnd = parallelStart;
    let voiceStart = parallelStart;
    let voiceEnd = parallelStart;

    await Promise.all([
      (async () => {
        assetsStart = Date.now();
        await resolveAssets(input);
        assetsEnd = Date.now();
      })(),
      (async () => {
        voiceStart = Date.now();
        await generateVoice(input);
        voiceEnd = Date.now();
      })(),
    ]);
    isParallelMode = false;
    await recordParallelTiming("assets_voice", parallelStart, [
      { key: "assets", startMs: assetsStart, endMs: assetsEnd },
      { key: "voice", startMs: voiceStart, endMs: voiceEnd },
    ]);
    artifacts = await readQuizArtifacts(input);
  } else if (needsAssets) {
    const assetsStart = Date.now();
    await this.update(task.task_id, { progress_message: "Quiz · resolving semantic assets", progress_percent: 30 });
    await resolveAssets(input);
    await recordStageTiming("assets", assetsStart);
    artifacts = await readQuizArtifacts(input);
  } else if (needsVoice) {
    await executeQuizVoicePipelineStep(this, task, input, recordStageTiming);
    artifacts = await readQuizArtifacts(input);
  }

  const qaGatesStart = Date.now();
  if (!artifacts.timeline) {
    await this.update(task.task_id, { progress_message: "Quiz · compiling deterministic timeline", progress_percent: 56 });
    await compileTimeline(input);
    artifacts = await readQuizArtifacts(input);
  }

  artifacts = await executeQuizQaGatesWithHealing(this, task, input, artifacts);
  await recordStageTiming("qaGates", qaGatesStart);

  if (!artifacts.timeline) {
    await this.update(task.task_id, { progress_message: "Quiz · compiling deterministic timeline", progress_percent: 58 });
    await compileTimeline(input);
  }
}
