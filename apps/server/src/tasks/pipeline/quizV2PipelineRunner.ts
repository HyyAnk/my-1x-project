import type { Task } from "@studio/shared";
import { RepositoryError } from "../../repository.js";
import { isQuizAssetResolutionComplete } from "../../quiz/assets/resolveQuizAssets.js";
import {
  compileTimeline,
  generateDirector,
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
      const progress_percent = 36 + Math.round(assetRatio * 9 + voiceRatio * 7);
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
          progress_percent: 36 + Math.round((completed / Math.max(1, total)) * 9),
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
          progress_percent: 46 + Math.round((completed / Math.max(1, total)) * 7),
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
  if (!artifacts.quiz) {
    await this.update(task.task_id, { progress_message: "Quiz · locking question facts", progress_percent: 33 });
    await generateQuiz(input);
    artifacts = await readQuizArtifacts(input);
  }
  if (!artifacts.director_plan) {
    await this.update(task.task_id, { progress_message: "Quiz · directing question presentation", progress_percent: 34 });
    await generateDirector(input);
    artifacts = await readQuizArtifacts(input);
  }
  if (!artifacts.asset_plan) {
    await this.update(task.task_id, { progress_message: "Quiz · planning semantic assets", progress_percent: 35 });
    await planAssets(input);
    artifacts = await readQuizArtifacts(input);
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
      progress_percent: 36,
    });
    await Promise.all([resolveAssets(input), generateVoice(input)]);
    isParallelMode = false;
    artifacts = await readQuizArtifacts(input);
  } else if (needsAssets) {
    await this.update(task.task_id, { progress_message: "Quiz · resolving semantic assets", progress_percent: 36 });
    await resolveAssets(input);
    artifacts = await readQuizArtifacts(input);
  } else if (needsVoice) {
    await this.update(task.task_id, { progress_message: "Quiz · generating per-question voice", progress_percent: 46 });
    await generateVoice(input);
    artifacts = await readQuizArtifacts(input);
  }

  if (!artifacts.timeline) {
    await this.update(task.task_id, { progress_message: "Quiz · compiling deterministic timeline", progress_percent: 53 });
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
        progress_percent: 80,
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
        progress_percent: 80,
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
        progress_percent: 84,
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
      await this.update(task.task_id, { progress_message: "Quiz · running pre-render QA", progress_percent: 54 });
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
}
