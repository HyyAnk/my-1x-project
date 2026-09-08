import type { Task } from "@studio/shared";
import type { StudioLogger } from "../../logger.js";
import type { TaskManagerRuntime } from "../runtime.js";
import type { QuizVoicePacingClamp } from "../../quiz/audio/voiceSynthesis.js";
import { quizVoicePlanNeedsRegeneration, quizVoiceTargetWordsPerSecond } from "../../quiz/audio/voicePolicy.js";
import { healQuizVoicePacingWithLLM } from "../../quiz/audio/voicePacingHealer.js";
import { generateVoice, resolveAssets, runQa, readQuizArtifacts } from "../../quiz/pipeline/orchestrator.js";
import { RepositoryError } from "../../repository.js";
import { hasValidNarrationAsset } from "./pipelineHelpers.js";

export function handleVoicePacingClamp(logger: StudioLogger, channelId: string, taskId: string, details: QuizVoicePacingClamp): void {
  logger.warn(`Quiz voice pacing clamp hit ${JSON.stringify(details)}`, {
    profileId: channelId,
    workerId: taskId,
    step: "voice_pacing_clamp",
  });
}

export function createQuizPipelineInput(runtime: TaskManagerRuntime, task: Task, isParallelMode: () => boolean) {
  let assetState = { completed: 0, total: 0, reused: false };
  let voiceState = { completed: 0, total: 0, reused: false };

  const updateParallelProgress = async () => {
    if (isParallelMode()) {
      const assetRatio = assetState.total > 0 ? assetState.completed / assetState.total : 1;
      const voiceRatio = voiceState.total > 0 ? voiceState.completed / voiceState.total : 1;
      const progress_percent = 30 + Math.round(assetRatio * 14 + voiceRatio * 11);
      const assetLabel = `assets ${assetState.completed}/${Math.max(1, assetState.total)}`;
      const voiceLabel = `voice ${voiceState.completed}/${Math.max(1, voiceState.total)}`;
      await runtime.update(task.task_id, {
        progress_message: `Quiz · ${assetLabel} | ${voiceLabel}`,
        progress_percent,
      });
    }
  };

  return {
    repository: runtime.repository,
    config: { audio_generation: runtime.audioConfig, image_generation: runtime.imageConfig },
    channelId: task.channel_id,
    episodeId: task.episode_id!,
    activeEngine: runtime.activeEngine,
    antigravityClient: runtime.antigravity,
    onAssetProgress: async ({ completed, total, reused }: { completed: number; total: number; reused: boolean }) => {
      assetState = { completed, total, reused };
      if (isParallelMode()) {
        await updateParallelProgress();
      } else {
        await runtime.update(task.task_id, {
          progress_message: `Quiz · resolving assets ${completed}/${total}${reused ? " · reused" : ""}`,
          progress_percent: 30 + Math.round((completed / Math.max(1, total)) * 14),
        });
      }
    },
    onVoiceProgress: async ({ completed, total, reused }: { completed: number; total: number; reused: boolean }) => {
      voiceState = { completed, total, reused };
      if (isParallelMode()) {
        await updateParallelProgress();
      } else {
        await runtime.update(task.task_id, {
          progress_message: `Quiz · ${reused ? "reusing" : "generating"} voice ${completed}/${total}`,
          progress_percent: 44 + Math.round((completed / Math.max(1, total)) * 11),
        });
      }
    },
    onVoicePacingClamp: (details: QuizVoicePacingClamp) => {
      handleVoicePacingClamp(runtime.logger, task.channel_id, task.task_id, details);
    },
  };
}

export async function shouldRegenerateQuizVoice(
  runtime: TaskManagerRuntime,
  task: Task,
  episodeNarrationAssetPath: string | null,
  artifacts: Awaited<ReturnType<typeof readQuizArtifacts>>,
): Promise<boolean> {
  const voicePaceNeedsRegeneration = artifacts.quiz
    ? quizVoicePlanNeedsRegeneration({
        voicePlan: artifacts.voice_plan,
        ageBand: artifacts.quiz.age_band,
        assessmentIssueCodes: artifacts.assessment?.issues.map((issue) => issue.code),
      })
    : false;

  return (
    !artifacts.voice_plan ||
    voicePaceNeedsRegeneration ||
    !(await hasValidNarrationAsset.call(runtime, task.channel_id, task.episode_id!, episodeNarrationAssetPath)) ||
    artifacts.voice_plan.segments.some((segment) => segment.duration_seconds === null)
  );
}

export async function executeQuizVoicePipelineStep(
  runtime: TaskManagerRuntime,
  task: Task,
  input: Parameters<typeof generateVoice>[0],
  onTiming?: (stageKey: string, startMs: number) => Promise<void>,
): Promise<void> {
  const voiceStart = Date.now();
  await runtime.update(task.task_id, {
    progress_message: "Quiz · generating per-question voice",
    progress_percent: 44,
  });
  await generateVoice(input);
  if (onTiming) {
    await onTiming("voice", voiceStart);
  }
}

export async function healQuizVoicePacingWithAI(
  runtime: TaskManagerRuntime,
  task: Task,
  input: Parameters<typeof generateVoice>[0],
  artifacts: Awaited<ReturnType<typeof readQuizArtifacts>>,
): Promise<boolean> {
  if (!artifacts.quiz || !artifacts.voice_plan) return false;
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
    return true;
  }
  return false;
}

export async function executeQuizHealingCycle(
  runtime: TaskManagerRuntime,
  task: Task,
  input: Parameters<typeof generateVoice>[0],
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
    const healVoiceTask = async () => {
      await healQuizVoicePacingWithAI(runtime, task, input, artifacts);
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
    await healQuizVoicePacingWithAI(runtime, task, input, artifacts);
  }
}

export async function executeQuizQaGatesWithHealing(
  runtime: TaskManagerRuntime,
  task: Task,
  input: Parameters<typeof generateVoice>[0],
  initialArtifacts: Awaited<ReturnType<typeof readQuizArtifacts>>,
  maxHealingCycles = 3,
): Promise<Awaited<ReturnType<typeof readQuizArtifacts>>> {
  let artifacts = initialArtifacts;
  for (let cycle = 1; cycle <= maxHealingCycles; cycle++) {
    if (!artifacts.assessment) {
      await runtime.update(task.task_id, { progress_message: "Quiz · running pre-render QA", progress_percent: 57 });
      await runQa(input);
      artifacts = await readQuizArtifacts(input);
    }
    const blockers = artifacts.assessment?.issues.filter((issue) => issue.severity === "blocker") ?? [];
    if (blockers.length === 0) {
      return artifacts;
    }

    if (cycle < maxHealingCycles) {
      await executeQuizHealingCycle(runtime, task, input, artifacts, cycle, maxHealingCycles, blockers);
      await runQa(input);
      artifacts = await readQuizArtifacts(input);
      continue;
    }

    const blocker = blockers[0];
    throw new RepositoryError(`Quiz V2 QA blocked production: ${blocker.message}`, "QUIZ_QA_BLOCKED");
  }
  return artifacts;
}
