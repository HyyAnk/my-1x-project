import type { Task } from "@studio/shared";
import { RepositoryError } from "../../repository.js";
import { isQuizAssetResolutionComplete } from "../../quiz/assets/resolveQuizAssets.js";
import {
  compileTimeline,
  generateDirector,
  generateEpisodeDescription,
  generateQuiz,
  generateVoice,
  planAssets,
  readQuizArtifacts,
  resolveAssets,
  runQa,
} from "../../quiz/pipeline/orchestrator.js";
import { quizVoicePlanNeedsRegeneration, quizVoiceTargetWordsPerSecond } from "../../quiz/audio/voicePolicy.js";
import { healQuizVoicePacingWithLLM } from "../../quiz/audio/voicePacingHealer.js";
import type { QuizVoicePacingClamp } from "../../quiz/audio/voiceSynthesis.js";
import { generateEpisodeThumbnail } from "../../quiz/thumbnail/index.js";
import { hasValidNarrationAsset } from "./pipelineHelpers.js";
import type { TaskManagerRuntime } from "../runtime.js";


export async function runQuizV2Pipeline(this: TaskManagerRuntime, task: Task): Promise<void> {
  let assetState = { completed: 0, total: 0, reused: false };
  let voiceState = { completed: 0, total: 0, reused: false };
  let isParallelMode = false;

  const updateParallelProgress = async () => {
    if (isParallelMode) {
      const assetRatio = assetState.total > 0 ? assetState.completed / assetState.total : 1;
      const voiceRatio = voiceState.total > 0 ? voiceState.completed / voiceState.total : 1;
      const progress_percent = 30 + Math.round(assetRatio * 14 + voiceRatio * 11);
      const assetLabel = `assets ${assetState.completed}/${Math.max(1, assetState.total)}`;
      const voiceLabel = `voice ${voiceState.completed}/${Math.max(1, voiceState.total)}`;
      await this.update(task.task_id, {
        progress_message: `Quiz · ${assetLabel} | ${voiceLabel}`,
        progress_percent,
      });
    }
  };

  const input = {
    repository: this.repository,
    config: { audio_generation: this.audioConfig, image_generation: this.imageConfig },
    channelId: task.channel_id,
    episodeId: task.episode_id!,
    activeEngine: this.activeEngine,
    antigravityClient: this.antigravity,
    onAssetProgress: async ({ completed, total, reused }: { completed: number; total: number; reused: boolean }) => {
      assetState = { completed, total, reused };
      if (isParallelMode) {
        await updateParallelProgress();
      } else {
        await this.update(task.task_id, {
          progress_message: `Quiz · resolving assets ${completed}/${total}${reused ? " · reused" : ""}`,
          progress_percent: 30 + Math.round((completed / Math.max(1, total)) * 14),
        });
      }
    },
    onVoiceProgress: async ({ completed, total, reused }: { completed: number; total: number; reused: boolean }) => {
      voiceState = { completed, total, reused };
      if (isParallelMode) {
        await updateParallelProgress();
      } else {
        await this.update(task.task_id, {
          progress_message: `Quiz · ${reused ? "reusing" : "generating"} voice ${completed}/${total}`,
          progress_percent: 44 + Math.round((completed / Math.max(1, total)) * 11),
        });
      }
    },
    onVoicePacingClamp: (details: QuizVoicePacingClamp) => {
      this.logger.warn(`Quiz voice pacing clamp hit ${JSON.stringify(details)}`, {
        profileId: task.channel_id,
        workerId: task.task_id,
        step: "voice_pacing_clamp",
      });
    },
  };
  let artifacts = await readQuizArtifacts(input);
  const episode = await this.repository.getEpisode(task.channel_id, task.episode_id!);

  const timings = (await this.repository.readQuizStageTimings?.(task.channel_id, task.episode_id!)) ?? {
    schema_version: 1,
    episode_id: task.episode_id!,
    stages: {},
    parallel_groups: {},
  };
  if (!timings.stages) timings.stages = {};
  if (!timings.parallel_groups) timings.parallel_groups = {};

  const recordStageTiming = async (stageKey: string, startMs: number, completed: boolean = true) => {
    const durationSeconds = Math.max(0, Math.round((Date.now() - startMs) / 1000));
    timings.stages![stageKey] = {
      started_at: new Date(startMs).toISOString(),
      completed_at: completed ? new Date().toISOString() : null,
      duration_seconds: durationSeconds,
    };
    timings.updated_at = new Date().toISOString();
    await this.repository.writeQuizStageTimings?.(task.channel_id, task.episode_id!, timings)?.catch?.(() => {});
  };

  const recordParallelTiming = async (
    groupKey: string,
    parallelStartMs: number,
    stages: Array<{ key: string; startMs: number; endMs: number }>,
  ) => {
    const parallelEndMs = Date.now();
    const parallelTotalSeconds = Math.max(0, Math.round((parallelEndMs - parallelStartMs) / 1000));
    for (const item of stages) {
      if (!timings.stages) timings.stages = {};
      timings.stages[item.key] = {
        started_at: new Date(item.startMs).toISOString(),
        completed_at: new Date(item.endMs).toISOString(),
        duration_seconds: Math.max(0, Math.round((item.endMs - item.startMs) / 1000)),
        parallel_group: groupKey,
        parallel_total_seconds: parallelTotalSeconds,
      };
    }
    if (!timings.parallel_groups) timings.parallel_groups = {};
    timings.parallel_groups[groupKey] = {
      stages: stages.map((s) => s.key),
      duration_seconds: parallelTotalSeconds,
    };
    timings.updated_at = new Date().toISOString();
    await this.repository.writeQuizStageTimings(task.channel_id, task.episode_id!, timings).catch(() => {});
  };

  if (!artifacts.quiz || !artifacts.director_plan) {
    const quizContentStart = Date.now();
    if (!artifacts.quiz) {
      await this.update(task.task_id, { progress_message: "Quiz · locking question facts", progress_percent: 26 });
      await generateQuiz(input);
      artifacts = await readQuizArtifacts(input);
    }
    if (!artifacts.director_plan) {
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
  }

  if (!artifacts.description) {
    const descStart = Date.now();
    try {
      await generateEpisodeDescription(input);
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
    }));

  const voicePaceNeedsRegeneration = artifacts.quiz
    ? quizVoicePlanNeedsRegeneration({
        voicePlan: artifacts.voice_plan,
        ageBand: artifacts.quiz.age_band,
        assessmentIssueCodes: artifacts.assessment?.issues.map((issue) => issue.code),
      })
    : false;

  const needsVoice =
    !artifacts.voice_plan ||
    voicePaceNeedsRegeneration ||
    !(await hasValidNarrationAsset.call(this, task.channel_id, task.episode_id!, episode.narration_asset_path)) ||
    artifacts.voice_plan.segments.some((segment) => segment.duration_seconds === null);

  if (needsAssets && needsVoice) {
    isParallelMode = true;
    await this.update(task.task_id, {
      progress_message: "Quiz · resolving assets and voice in parallel",
      progress_percent: 30,
    });
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
    const voiceStart = Date.now();
    await this.update(task.task_id, { progress_message: "Quiz · generating per-question voice", progress_percent: 44 });
    await generateVoice(input);
    await recordStageTiming("voice", voiceStart);
    artifacts = await readQuizArtifacts(input);
  }

  const qaGatesStart = Date.now();
  if (!artifacts.timeline) {
    await this.update(task.task_id, { progress_message: "Quiz · compiling deterministic timeline", progress_percent: 56 });
    await compileTimeline(input);
    artifacts = await readQuizArtifacts(input);
  }
  async function executeQuizHealingCycle(
    runtime: TaskManagerRuntime,
    task: Task,
    input: Parameters<typeof generateQuiz>[0],
    artifacts: Awaited<ReturnType<typeof readQuizArtifacts>>,
    cycle: number,
    maxHealingCycles: number,
    blockers: NonNullable<Awaited<ReturnType<typeof readQuizArtifacts>>["assessment"]>["issues"],
  ): Promise<void> {
    const hasUnresolvedAssetBlockers = blockers.some(
      (issue) => issue.code === "asset_required_unresolved" || issue.code === "asset_generation_failed",
    );
    const hasVoicePaceBlockers = blockers.some((issue) => issue.code === "voice_pace_unsafe" || issue.code === "voice_pace_fast");

    if (!hasUnresolvedAssetBlockers && !hasVoicePaceBlockers) {
      return;
    }

    if (hasUnresolvedAssetBlockers && hasVoicePaceBlockers && artifacts.quiz && artifacts.voice_plan) {
      runtime.logger.warn(`Auto-healing visual assets and voice pacing concurrently (attempt ${cycle}/${maxHealingCycles})...`, {
        profileId: task.channel_id,
        workerId: task.task_id,
        step: "auto_heal_parallel",
      });
      await runtime.update(task.task_id, {
        progress_message: `Quiz · auto-retrying assets & voice pacing (${cycle}/${maxHealingCycles})`,
        progress_percent: 58,
      });
      const client = runtime.antigravity ?? (runtime.activeEngine === "codex" ? runtime.codex : undefined);
      const healVoiceTask = async () => {
        const healResult = await healQuizVoicePacingWithLLM({
          voicePlan: artifacts.voice_plan!,
          ageBand: artifacts.quiz!.age_band,
          targetWordsPerSecond: quizVoiceTargetWordsPerSecond(artifacts.quiz!.age_band),
          client,
          logger: runtime.logger,
          channelId: task.channel_id,
          episodeId: task.episode_id!,
        });
        if (healResult.healed) {
          await runtime.repository.writeVoicePlan(task.channel_id, task.episode_id!, healResult.voicePlan);
          await runtime.repository.invalidateQuizArtifacts(task.channel_id, task.episode_id!, ["timeline", "assessment"]);
          await generateVoice(input);
        }
      };
      const healAssetsTask = async () => {
        await resolveAssets(input);
        await runtime.repository.invalidateQuizArtifacts(task.channel_id, task.episode_id!, ["assessment"]);
      };
      await Promise.all([healAssetsTask(), healVoiceTask()]);
      return;
    }

    if (hasUnresolvedAssetBlockers) {
      runtime.logger.warn(`Auto-healing unresolved visual assets (attempt ${cycle}/${maxHealingCycles})...`, {
        profileId: task.channel_id,
        workerId: task.task_id,
        step: "auto_heal_assets",
      });
      await runtime.update(task.task_id, {
        progress_message: `Quiz · auto-retrying unresolved assets (${cycle}/${maxHealingCycles})`,
        progress_percent: 58,
      });
      await resolveAssets(input);
      await runtime.repository.invalidateQuizArtifacts(task.channel_id, task.episode_id!, ["assessment"]);
      return;
    }

    if (hasVoicePaceBlockers && artifacts.quiz && artifacts.voice_plan) {
      runtime.logger.warn(`Auto-healing voice pacing with LLM (attempt ${cycle}/${maxHealingCycles})...`, {
        profileId: task.channel_id,
        workerId: task.task_id,
        step: "auto_heal_voice",
      });
      await runtime.update(task.task_id, {
        progress_message: `Quiz · auto-adjusting voice pacing with AI (${cycle}/${maxHealingCycles})`,
        progress_percent: 59,
      });
      const client = runtime.antigravity ?? (runtime.activeEngine === "codex" ? runtime.codex : undefined);
      const healResult = await healQuizVoicePacingWithLLM({
        voicePlan: artifacts.voice_plan,
        ageBand: artifacts.quiz.age_band,
        targetWordsPerSecond: quizVoiceTargetWordsPerSecond(artifacts.quiz.age_band),
        client,
        logger: runtime.logger,
        channelId: task.channel_id,
        episodeId: task.episode_id!,
      });
      if (healResult.healed) {
        await runtime.repository.writeVoicePlan(task.channel_id, task.episode_id!, healResult.voicePlan);
        await runtime.repository.invalidateQuizArtifacts(task.channel_id, task.episode_id!, ["timeline", "assessment"]);
        await generateVoice(input);
        return;
      }
    }
  }

  const maxHealingCycles = 3;
  for (let cycle = 1; cycle <= maxHealingCycles; cycle++) {
    if (!artifacts.assessment) {
      await this.update(task.task_id, { progress_message: "Quiz · running pre-render QA", progress_percent: 57 });
      await runQa(input);
      artifacts = await readQuizArtifacts(input);
    }
    const blockers = artifacts.assessment?.issues.filter((issue) => issue.severity === "blocker") ?? [];
    if (blockers.length === 0) {
      break;
    }

    if (cycle < maxHealingCycles) {
      await executeQuizHealingCycle(this, task, input, artifacts, cycle, maxHealingCycles, blockers);
      await runQa(input);
      artifacts = await readQuizArtifacts(input);
      continue;
    }

    const blocker = blockers[0];
    throw new RepositoryError(`Quiz V2 QA blocked production: ${blocker.message}`, "QUIZ_QA_BLOCKED");
  }

  await recordStageTiming("qaGates", qaGatesStart);

  // Auto-generate Thumbnail once all pipeline artifacts (assets, voice, timeline, QA) are ready
  try {
    const thumbStart = Date.now();
    await this.update(task.task_id, { progress_message: "Quiz · generating high-CTR thumbnail", progress_percent: 54 });
    await generateEpisodeThumbnail(this.repository, {
      channelId: task.channel_id,
      episodeId: task.episode_id!,
      activeEngine: this.activeEngine,
      antigravityClient: this.antigravity,
      imageConfig: input.config.image_generation
        ? {
            api_key: input.config.image_generation.api_key,
            model: input.config.image_generation.model,
            provider: input.config.image_generation.provider,
            base_url: input.config.image_generation.base_url,
          }
        : undefined,
    });
    await recordStageTiming("thumbnail", thumbStart);
  } catch (error) {
    this.logger.warn(`Auto thumbnail generation had an issue: ${(error as Error).message}`, {
      profileId: task.channel_id,
      workerId: task.task_id,
    });
  }
}

