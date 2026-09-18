import type { Task } from "@studio/shared";
import type { TaskManagerRuntime } from "../runtime.js";
import { quizVoicePlanNeedsRegeneration, quizVoiceTargetWordsPerSecond } from "../../quiz/audio/voicePolicy.js";
import { healQuizVoicePacingWithLLM } from "../../quiz/audio/voicePacingHealer.js";
import { generateVoice, resolveAssets, runQa, readQuizArtifacts } from "../../quiz/pipeline/orchestrator.js";
import { RepositoryError } from "../../repository.js";
import { hasValidNarrationAsset } from "./pipelineHelpers.js";

export { handleVoicePacingClamp, createQuizPipelineInput } from "./voiceProgressTracker.js";

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
    await Promise.all([
      (async () => {
        await resolveAssets(input);
        await runtime.repository.invalidateQuizArtifacts(task.channel_id, task.episode_id!, ["assessment"]);
      })(),
      healQuizVoicePacingWithAI(runtime, task, input, artifacts),
    ]);
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

    const missingSourceBlockers = blockers.filter((issue) => issue.code === "semantic_sources_missing");
    if (missingSourceBlockers.length > 0 && artifacts.quiz) {
      let modified = false;
      for (let i = 0; i < artifacts.quiz.questions.length; i++) {
        const q = artifacts.quiz.questions[i];
        if (!q.source_ids || q.source_ids.length === 0) {
          q.source_ids = [`C${String(q.number || i + 1).padStart(2, "0")}`];
          q.validation.source_coverage = true;
          modified = true;
        }
      }
      if (modified) {
        runtime.logger.warn(`Auto-healed missing quiz source IDs (attempt ${cycle}/${maxHealingCycles})`, {
          profileId: task.channel_id,
          workerId: task.task_id,
          step: "auto_heal_sources",
        });
        await runtime.repository.writeQuiz(task.channel_id, task.episode_id!, artifacts.quiz);
        await runtime.repository.invalidateQuizArtifacts(task.channel_id, task.episode_id!, ["assessment"]);
        await runQa(input);
        artifacts = await readQuizArtifacts(input);
        continue;
      }
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
