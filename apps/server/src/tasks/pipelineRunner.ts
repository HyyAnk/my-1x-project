import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { nowIso, type Task, type TaskType } from "@studio/shared";
import { RepositoryError } from "../repository.js";
import { extractArtifactSectionNumbers, missingArtifactSectionNumbers } from "../artifactSections.js";
import { extractNarrationSections, hasHumorPolicyMarker } from "../production.js";
import { rebalanceEditorialOverlays } from "../sceneTiming.js";
import { parseContinuityBundles } from "../visualBundles.js";
import { isQuizAssetResolutionComplete } from "../quiz/assets/resolveQuizAssets.js";
import {
  compileTimeline,
  generateDirector,
  generateQuiz,
  generateVoice,
  planAssets,
  readQuizArtifacts,
  resolveAssets,
  runQa,
} from "../quiz/pipeline/orchestrator.js";
import { quizVoicePlanNeedsRegeneration, quizVoiceTargetWordsPerSecond } from "../quiz/audio/voicePolicy.js";
import { healQuizVoicePacingWithLLM } from "../quiz/audio/voicePacingHealer.js";
import type { QuizVoicePacingClamp } from "../quiz/audio/voiceSynthesis.js";
import { runConcurrent } from "../utils/concurrency.js";
import { isValidPngFile } from "./artifactFiles.js";
import { parseWavDuration } from "./parsers.js";
import { planSequenceResume } from "./planning.js";
import { isPlaceholderArtifact, validateQuizVisualBible, validateVisualBible } from "./validators.js";
import type { PipelineRun, TaskManagerRuntime } from "./runtime.js";

export async function runPipelineTask(this: TaskManagerRuntime, task: Task): Promise<void> {
  if (!task.episode_id) {
    await this.finish(task.task_id, "FAILED", "Episode is required for the production pipeline");
    return;
  }
  const run: PipelineRun = { cancelled: false, children: new Set() };
  this.pipelineRuns.set(task.task_id, run);
  const episodeId = task.episode_id;
  const step = async (label: string, percent: number, childType: TaskType, shouldRun: () => Promise<boolean>): Promise<boolean> => {
    if (run.cancelled) throw new Error("Pipeline cancelled");
    await this.update(task.task_id, { progress_message: label, progress_percent: percent });
    if (!(await shouldRun())) return false;
    const child = this.submit(childType, task.channel_id, episodeId);
    run.children.add(child.task_id);
    try {
      const completed = await this.waitForTaskTerminal(child.task_id, run);
      if (completed.status !== "COMPLETED") throw new Error(`${label} failed: ${completed.error ?? completed.status}`);
    } finally {
      run.children.delete(child.task_id);
    }
    return true;
  };
  try {
    await this.update(task.task_id, {
      status: "RUNNING",
      started_at: nowIso(),
      queue_position: null,
      progress_message: "Starting production pipeline",
      progress_percent: 0,
    });
    const researchChanged = await step(
      "Research · verifying sources",
      3,
      "GENERATE_RESEARCH",
      async () => !(await this.hasReadyArtifact(task.channel_id, episodeId, "research.md")),
    );
    const treatmentChanged = await step(
      "Treatment · structuring the story",
      6,
      "GENERATE_TREATMENT",
      async () => !(await this.hasReadyArtifact(task.channel_id, episodeId, "treatment.md")),
    );
    const scriptChanged = await step(
      "Narration script · writing the argument",
      12,
      "GENERATE_SCRIPT",
      async () => !(await this.hasReadyScript(task.channel_id, episodeId)),
    );
    const visualBibleChanged = await step(
      "Visual bible · locking continuity",
      18,
      "GENERATE_VISUAL_BIBLE",
      async () => !(await this.hasReadyArtifact(task.channel_id, episodeId, "visual_bible.md")),
    );
    const upstreamChanged = researchChanged || treatmentChanged || scriptChanged || visualBibleChanged;

    const scenes = await this.repository.readScenes(task.channel_id, episodeId);
    if (run.cancelled) throw new Error("Pipeline cancelled");
    const shotPlanFresh = await this.isShotPlanFresh(task.channel_id, episodeId);
    const regenerateShots = scenes.length === 0 || upstreamChanged || !shotPlanFresh;
    await this.update(task.task_id, {
      progress_message: regenerateShots ? "Shot plan · generating sequences" : "Shot plan · already ready",
      progress_percent: 25,
    });
    if (regenerateShots) {
      const script = await this.repository.getEpisodeFile(task.channel_id, episodeId, "script.md");
      const sections = extractNarrationSections(script.content);
      if (sections.length === 0) throw new Error("Shot plan failed: a completed script is required");
      await this.repository.backupEpisodeFile(task.channel_id, episodeId, "scene_plan.md");
      const existingDrafts = await this.repository.readSequenceDrafts(episodeId);
      const resumePlan = planSequenceResume(sections.length, existingDrafts, script.modified_at, upstreamChanged);
      if (resumePlan.shouldClearDrafts) await this.repository.clearSequenceDrafts(episodeId);
      await this.update(task.task_id, {
        progress_message: resumePlan.reusedSequenceNumbers.length
          ? `Shot plan · resuming ${resumePlan.reusedSequenceNumbers.length}/${sections.length} completed sequences`
          : "Shot plan · generating sequences",
        progress_percent: 25,
      });
      if (resumePlan.pendingSequenceNumbers.length === 0) {
        const committed = await this.repository.commitSequenceDrafts(task.channel_id, episodeId, sections.length);
        if (!committed) throw new Error("Shot plan failed: completed sequence drafts could not be committed");
      }
      const children = resumePlan.pendingSequenceNumbers.map((sequenceNumber) =>
        this.submit("GENERATE_SEQUENCE_SCENES", task.channel_id, episodeId, sequenceNumber),
      );
      children.forEach((child) => run.children.add(child.task_id));
      try {
        await Promise.all(
          children.map(async (child) => {
            const result = await this.waitForTaskTerminal(child.task_id, run);
            if (result.status !== "COMPLETED") throw new Error(`Shot plan failed: ${result.error ?? result.status}`);
            return result;
          }),
        );
      } catch (error) {
        await Promise.all(children.map((child) => this.cancel(child.task_id).catch(() => undefined)));
        throw error;
      } finally {
        children.forEach((child) => run.children.delete(child.task_id));
      }
    }

    const balancedScenes = rebalanceEditorialOverlays(await this.repository.readScenes(task.channel_id, episodeId));
    await this.repository.saveScenes(task.channel_id, episodeId, balancedScenes);

    if (run.cancelled) throw new Error("Pipeline cancelled");
    await this.runQuizV2Pipeline(task);

    if (run.cancelled) throw new Error("Pipeline cancelled");
    await this.update(task.task_id, { progress_message: "Video · linting Quiz composition", progress_percent: 92 });
    const videoChild = this.submit("GENERATE_VIDEO", task.channel_id, episodeId);
    run.children.add(videoChild.task_id);
    try {
      const completed = await this.waitForTaskTerminal(videoChild.task_id, run);
      if (completed.status !== "COMPLETED") throw new Error(`Video render failed: ${completed.error ?? completed.status}`);
    } finally {
      run.children.delete(videoChild.task_id);
    }
    await this.finish(task.task_id, "COMPLETED", null, []);
  } catch (error) {
    const cancelled = run.cancelled || (error instanceof Error && error.message === "Pipeline cancelled");
    await this.finish(
      task.task_id,
      cancelled ? "CANCELLED" : "FAILED",
      cancelled ? "Cancelled by user" : error instanceof Error ? error.message : "Production pipeline failed",
    );
  } finally {
    this.pipelineRuns.delete(task.task_id);
  }
}

export async function hasReadyArtifact(this: TaskManagerRuntime, channelId: string, episodeId: string, filename: string): Promise<boolean> {
  const file = await this.repository.getEpisodeFile(channelId, episodeId, filename);
  if (isPlaceholderArtifact(file.content)) return false;
  if (filename !== "visual_bible.md") return true;
  const channel = await this.repository.getChannel(channelId);
  const treatment = await this.repository.getEpisodeFile(channelId, episodeId, "treatment.md");
  const requiredBundles =
    channel.engine === "quiz"
      ? extractArtifactSectionNumbers(treatment.content, "question").length > 0
        ? Array.from(
            { length: (await this.repository.getEpisode(channelId, episodeId)).quiz_config.question_count },
            (_, index) => index + 1,
          )
        : []
      : extractArtifactSectionNumbers(treatment.content, "sequence");
  if (requiredBundles.length === 0) return true;
  try {
    if (channel.engine === "quiz") validateQuizVisualBible(file.content, requiredBundles);
    else validateVisualBible(file.content, requiredBundles);
    return true;
  } catch {
    return false;
  }
}

export async function generatePipelineBundleImages(this: TaskManagerRuntime, task: Task, run: PipelineRun): Promise<void> {
  if (!this.imageConfig.enabled) return;
  const visualBible = await this.repository.getEpisodeFile(task.channel_id, task.episode_id!, "visual_bible.md");
  const bundles = parseContinuityBundles(visualBible.content);
  if (bundles.length === 0) return;

  const existing = await this.repository.listBundleImages(task.channel_id, task.episode_id!);
  const reusableImages = new Set<string>();
  for (const image of existing) if (await isValidPngFile(image.absolutePath)) reusableImages.add(`${image.bundle_id}:${image.variant}`);
  const missing = bundles
    .flatMap((bundle) => Array.from({ length: this.imageConfig.images_per_bundle }, (_, variant) => ({ bundle, variant })))
    .filter(({ bundle, variant }) => !reusableImages.has(`${bundle.bundle_id}:${variant}`));
  if (missing.length === 0) {
    await this.update(task.task_id, { progress_message: "Style anchors · already ready", progress_percent: 28 });
    return;
  }

  await this.update(task.task_id, {
    progress_message: `Style anchors · generating ${missing.length} continuity image${missing.length === 1 ? "" : "s"}`,
    progress_percent: 28,
  });
  const children = missing.map(({ bundle, variant }) =>
    this.submit("GENERATE_BUNDLE_IMAGE", task.channel_id, task.episode_id, bundle.bundle_number, variant),
  );
  children.forEach((child) => run.children.add(child.task_id));
  try {
    for (const [index, child] of children.entries()) {
      const completed = await this.waitForTaskTerminal(child.task_id, run);
      if (completed.status !== "COMPLETED")
        throw new Error(`Style anchor ${index + 1}/${children.length} failed: ${completed.error ?? completed.status}`);
      await this.update(task.task_id, {
        progress_message: `Style anchors · ${index + 1}/${children.length} ready`,
        progress_percent: 28 + Math.round(((index + 1) / children.length) * 6),
      });
    }
  } catch (error) {
    await Promise.all(
      children
        .filter((child) => ["QUEUED", "RUNNING", "WAITING_APPROVAL"].includes(this.get(child.task_id).status))
        .map((child) => this.cancel(child.task_id).catch(() => undefined)),
    );
    throw error;
  } finally {
    children.forEach((child) => run.children.delete(child.task_id));
  }
}

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
  let episode = await this.repository.getEpisode(task.channel_id, task.episode_id!);
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
    !(await this.hasValidNarrationAsset(task.channel_id, task.episode_id!, episode.narration_asset_path)) ||
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
    episode = await this.repository.getEpisode(task.channel_id, task.episode_id!);
  } else if (needsAssets) {
    await this.update(task.task_id, { progress_message: "Quiz · resolving semantic assets", progress_percent: 36 });
    await resolveAssets(input);
    artifacts = await readQuizArtifacts(input);
  } else if (needsVoice) {
    await this.update(task.task_id, { progress_message: "Quiz · generating per-question voice", progress_percent: 46 });
    await generateVoice(input);
    artifacts = await readQuizArtifacts(input);
    episode = await this.repository.getEpisode(task.channel_id, task.episode_id!);
  }

  if (!artifacts.timeline) {
    await this.update(task.task_id, { progress_message: "Quiz · compiling deterministic timeline", progress_percent: 53 });
    await compileTimeline(input);
    artifacts = await readQuizArtifacts(input);
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

    const hasUnresolvedAssetBlockers = blockers.some(
      (issue) => issue.code === "asset_required_unresolved" || issue.code === "asset_generation_failed",
    );
    const hasVoicePaceBlockers = blockers.some((issue) => issue.code === "voice_pace_unsafe" || issue.code === "voice_pace_fast");

    if (cycle < maxHealingCycles && (hasUnresolvedAssetBlockers || hasVoicePaceBlockers)) {
      if (hasUnresolvedAssetBlockers && hasVoicePaceBlockers && artifacts.quiz && artifacts.voice_plan) {
        this.logger.warn(`Auto-healing visual assets and voice pacing concurrently (attempt ${cycle}/${maxHealingCycles})...`, {
          profileId: task.channel_id,
          workerId: task.task_id,
          step: "auto_heal_parallel",
        });
        await this.update(task.task_id, {
          progress_message: `Quiz · auto-retrying assets & voice pacing (${cycle}/${maxHealingCycles})`,
          progress_percent: 80,
        });
        const client = this.antigravity ?? (this.activeEngine === "codex" ? this.codex : undefined);
        const healVoiceTask = async () => {
          const healResult = await healQuizVoicePacingWithLLM({
            voicePlan: artifacts.voice_plan!,
            ageBand: artifacts.quiz!.age_band,
            targetWordsPerSecond: quizVoiceTargetWordsPerSecond(artifacts.quiz!.age_band),
            client,
            logger: this.logger,
            channelId: task.channel_id,
            episodeId: task.episode_id!,
          });
          if (healResult.healed) {
            await this.repository.writeVoicePlan(task.channel_id, task.episode_id!, healResult.voicePlan);
            await this.repository.invalidateQuizArtifacts(task.channel_id, task.episode_id!, ["timeline", "assessment"]);
            await generateVoice(input);
          }
        };
        const healAssetsTask = async () => {
          await resolveAssets(input);
          await this.repository.invalidateQuizArtifacts(task.channel_id, task.episode_id!, ["assessment"]);
        };
        await Promise.all([healAssetsTask(), healVoiceTask()]);
        artifacts = await readQuizArtifacts(input);
        episode = await this.repository.getEpisode(task.channel_id, task.episode_id!);
      } else if (hasUnresolvedAssetBlockers) {
        this.logger.warn(`Auto-healing unresolved visual assets (attempt ${cycle}/${maxHealingCycles})...`, {
          profileId: task.channel_id,
          workerId: task.task_id,
          step: "auto_heal_assets",
        });
        await this.update(task.task_id, {
          progress_message: `Quiz · auto-retrying unresolved assets (${cycle}/${maxHealingCycles})`,
          progress_percent: 80,
        });
        await resolveAssets(input);
        await this.repository.invalidateQuizArtifacts(task.channel_id, task.episode_id!, ["assessment"]);
        artifacts = await readQuizArtifacts(input);
      } else if (hasVoicePaceBlockers && artifacts.quiz && artifacts.voice_plan) {
        this.logger.warn(`Auto-healing voice pacing with LLM (attempt ${cycle}/${maxHealingCycles})...`, {
          profileId: task.channel_id,
          workerId: task.task_id,
          step: "auto_heal_voice",
        });
        await this.update(task.task_id, {
          progress_message: `Quiz · auto-adjusting voice pacing with AI (${cycle}/${maxHealingCycles})`,
          progress_percent: 84,
        });
        const client = this.antigravity ?? (this.activeEngine === "codex" ? this.codex : undefined);
        const healResult = await healQuizVoicePacingWithLLM({
          voicePlan: artifacts.voice_plan,
          ageBand: artifacts.quiz.age_band,
          targetWordsPerSecond: quizVoiceTargetWordsPerSecond(artifacts.quiz.age_band),
          client,
          logger: this.logger,
          channelId: task.channel_id,
          episodeId: task.episode_id!,
        });
        if (healResult.healed) {
          await this.repository.writeVoicePlan(task.channel_id, task.episode_id!, healResult.voicePlan);
          await this.repository.invalidateQuizArtifacts(task.channel_id, task.episode_id!, ["timeline", "assessment"]);
          await generateVoice(input);
          artifacts = await readQuizArtifacts(input);
          episode = await this.repository.getEpisode(task.channel_id, task.episode_id!);
        }
      }

      await runQa(input);
      artifacts = await readQuizArtifacts(input);
      continue;
    }

    const blocker = blockers[0];
    throw new RepositoryError(`Quiz V2 QA blocked production: ${blocker.message}`, "QUIZ_QA_BLOCKED");
  }
}

export async function attachPipelineBundleImages(this: TaskManagerRuntime, channelId: string, episodeId: string): Promise<void> {
  const images = await this.repository.listBundleImages(channelId, episodeId);
  for (const image of images) await this.repository.attachBundleReference(channelId, episodeId, image.bundle_id, image.path);
}

export async function hasReadyScript(this: TaskManagerRuntime, channelId: string, episodeId: string): Promise<boolean> {
  const file = await this.repository.getEpisodeFile(channelId, episodeId, "script.md");
  if (isPlaceholderArtifact(file.content) || !hasHumorPolicyMarker(file.content)) return false;
  const treatment = await this.repository.getEpisodeFile(channelId, episodeId, "treatment.md");
  const expectedSequences = extractArtifactSectionNumbers(treatment.content, "sequence");
  const actualSequences = extractArtifactSectionNumbers(file.content, "sequence");
  return (
    expectedSequences.length === 0 ||
    actualSequences.length === 0 ||
    missingArtifactSectionNumbers(file.content, expectedSequences, "sequence").length === 0
  );
}

export async function hasValidNarrationAsset(
  this: TaskManagerRuntime,
  channelId: string,
  episodeId: string,
  assetPath: string | null,
): Promise<boolean> {
  if (!assetPath) return false;
  try {
    const audio = await this.repository.getEpisodeAudioFile(channelId, episodeId, path.basename(assetPath));
    return parseWavDuration(new Uint8Array(await readFile(audio.absolutePath))) > 0;
  } catch {
    return false;
  }
}

export async function isShotPlanFresh(this: TaskManagerRuntime, channelId: string, episodeId: string): Promise<boolean> {
  const [script, scenePlan] = await Promise.all([
    this.repository.getEpisodeFile(channelId, episodeId, "script.md"),
    this.repository.getEpisodeFile(channelId, episodeId, "scene_plan.md"),
  ]);
  if (!script.modified_at || !scenePlan.modified_at) return false;
  return Date.parse(scenePlan.modified_at) >= Date.parse(script.modified_at);
}

export async function waitForTaskTerminal(this: TaskManagerRuntime, taskId: string, run: PipelineRun): Promise<Task> {
  while (true) {
    if (run.cancelled) throw new Error("Pipeline cancelled");
    const task = this.get(taskId);
    if (["COMPLETED", "FAILED", "CANCELLED"].includes(task.status)) return task;
    await new Promise((resolve) => setTimeout(resolve, 30));
  }
}
