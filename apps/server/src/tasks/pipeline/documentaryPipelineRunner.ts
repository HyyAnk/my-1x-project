import { nowIso, type Task, type TaskType } from "@studio/shared";
import { extractNarrationSections } from "../../production.js";
import { rebalanceEditorialOverlays } from "../../sceneTiming.js";
import { planSequenceResume } from "../planning.js";
import { hasReadyArtifact, hasReadyScript, isShotPlanFresh, waitForTaskTerminal } from "./pipelineHelpers.js";
import { runQuizV2Pipeline } from "./quizV2PipelineRunner.js";
import type { PipelineRun, TaskManagerRuntime } from "../runtime.js";

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
      const completed = await waitForTaskTerminal.call(this, child.task_id, run);
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
      async () => !(await hasReadyArtifact.call(this, task.channel_id, episodeId, "research.md")),
    );
    const treatmentChanged = await step(
      "Treatment · structuring the story",
      6,
      "GENERATE_TREATMENT",
      async () => !(await hasReadyArtifact.call(this, task.channel_id, episodeId, "treatment.md")),
    );
    const scriptChanged = await step(
      "Narration script · writing the argument",
      12,
      "GENERATE_SCRIPT",
      async () => !(await hasReadyScript.call(this, task.channel_id, episodeId)),
    );
    const visualBibleChanged = await step(
      "Visual bible · locking continuity",
      18,
      "GENERATE_VISUAL_BIBLE",
      async () => !(await hasReadyArtifact.call(this, task.channel_id, episodeId, "visual_bible.md")),
    );
    const upstreamChanged = researchChanged || treatmentChanged || scriptChanged || visualBibleChanged;

    const scenes = await this.repository.readScenes(task.channel_id, episodeId);
    if (run.cancelled) throw new Error("Pipeline cancelled");
    const shotPlanFresh = await isShotPlanFresh.call(this, task.channel_id, episodeId);
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
            const result = await waitForTaskTerminal.call(this, child.task_id, run);
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
    await runQuizV2Pipeline.call(this, task);

    if (run.cancelled) throw new Error("Pipeline cancelled");
    await this.update(task.task_id, { progress_message: "Video · linting Quiz composition", progress_percent: 92 });
    const videoChild = this.submit("GENERATE_VIDEO", task.channel_id, episodeId);
    run.children.add(videoChild.task_id);
    try {
      const completed = await waitForTaskTerminal.call(this, videoChild.task_id, run);
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
