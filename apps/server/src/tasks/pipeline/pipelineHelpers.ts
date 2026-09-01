import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Task } from "@studio/shared";
import { extractArtifactSectionNumbers, missingArtifactSectionNumbers } from "../../artifactSections.js";
import { hasHumorPolicyMarker } from "../../production.js";
import { parseContinuityBundles } from "../../visualBundles.js";
import { isValidPngFile } from "../artifactFiles.js";
import { parseWavDuration } from "../parsers.js";
import { isPlaceholderArtifact, validateQuizVisualBible } from "../validators.js";
import type { PipelineRun, TaskManagerRuntime } from "../runtime.js";

export async function hasReadyArtifact(this: TaskManagerRuntime, channelId: string, episodeId: string, filename: string): Promise<boolean> {
  const file = await this.repository.getEpisodeFile(channelId, episodeId, filename);
  if (isPlaceholderArtifact(file.content)) return false;
  if (filename !== "visual_bible.md") return true;
  const episode = await this.repository.getEpisode(channelId, episodeId);
  const requiredBundles = Array.from({ length: episode.quiz_config.question_count }, (_, index) => index + 1);
  try {
    validateQuizVisualBible(file.content, requiredBundles);
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

export async function attachPipelineBundleImages(this: TaskManagerRuntime, channelId: string, episodeId: string): Promise<void> {
  const images = await this.repository.listBundleImages(channelId, episodeId);
  for (const image of images) await this.repository.attachBundleReference(channelId, episodeId, image.bundle_id, image.path);
}

export async function hasReadyScript(this: TaskManagerRuntime, channelId: string, episodeId: string): Promise<boolean> {
  const file = await this.repository.getEpisodeFile(channelId, episodeId, "script.md");
  if (isPlaceholderArtifact(file.content) || !hasHumorPolicyMarker(file.content)) return false;
  const treatment = await this.repository.getEpisodeFile(channelId, episodeId, "treatment.md");
  const expectedSequences = extractArtifactSectionNumbers(treatment.content, "question");
  const actualSequences = extractArtifactSectionNumbers(file.content, "question");
  return (
    expectedSequences.length === 0 ||
    actualSequences.length === 0 ||
    missingArtifactSectionNumbers(file.content, expectedSequences, "question").length === 0
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

export async function waitForTaskTerminal(
  this: TaskManagerRuntime,
  taskId: string,
  run: PipelineRun,
  onProgress?: (task: Task) => Promise<void> | void,
): Promise<Task> {
  let lastStatus: Task["status"] | "" = "";
  let lastProgressMessage = "";
  let lastPercent: number | null = null;
  let lastFramesCompleted: number | null = null;
  let lastElapsedMs: number | null = null;

  while (true) {
    if (run.cancelled) throw new Error("Pipeline cancelled");
    const task = this.get(taskId);
    if (onProgress) {
      const framesCompleted = task.render_progress?.frames_completed ?? null;
      const elapsedMs = task.render_progress?.elapsed_ms ?? null;
      if (
        task.status !== lastStatus ||
        task.progress_message !== lastProgressMessage ||
        task.progress_percent !== lastPercent ||
        framesCompleted !== lastFramesCompleted ||
        elapsedMs !== lastElapsedMs
      ) {
        lastStatus = task.status;
        lastProgressMessage = task.progress_message ?? "";
        lastPercent = task.progress_percent;
        lastFramesCompleted = framesCompleted;
        lastElapsedMs = elapsedMs;
        await onProgress(task);
      }
    }
    if (["COMPLETED", "FAILED", "CANCELLED"].includes(task.status)) return task;
    await new Promise((resolve) => setTimeout(resolve, 30));
  }
}
