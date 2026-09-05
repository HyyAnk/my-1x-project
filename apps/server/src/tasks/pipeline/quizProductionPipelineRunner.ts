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
      progress_message: "Starting Quiz production pipeline",
      progress_percent: 0,
    });
    const useLegacyPipeline = process.env.USE_LEGACY_QUIZ_PIPELINE === "true";

    if (useLegacyPipeline) {
      const researchChanged = await step(
        "Research · verifying sources",
        3,
        "GENERATE_RESEARCH",
        async () => !(await hasReadyArtifact.call(this, task.channel_id, episodeId, "research.md")),
      );
      const treatmentChanged = await step(
        "Treatment · structuring the story",
        5,
        "GENERATE_TREATMENT",
        async () => !(await hasReadyArtifact.call(this, task.channel_id, episodeId, "treatment.md")),
      );
      const scriptChanged = await step(
        "Narration script · writing the argument",
        8,
        "GENERATE_SCRIPT",
        async () => !(await hasReadyScript.call(this, task.channel_id, episodeId)),
      );
      const visualBibleChanged = await step(
        "Visual bible · locking continuity",
        10,
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
        progress_percent: 10,
      });
      if (regenerateShots) {
        const script = await this.repository.getEpisodeFile(task.channel_id, episodeId, "script.md");
        const sections = extractNarrationSections(script.content);
        if (sections.length === 0) throw new Error("Shot plan failed: a completed script is required");
        await this.repository.backupEpisodeFile(task.channel_id, episodeId, "scene_plan.md");
        const existingDrafts = await this.repository.readSequenceDrafts(episodeId);
        const resumePlan = planSequenceResume(sections.length, existingDrafts, script.modified_at, upstreamChanged);
        if (resumePlan.shouldClearDrafts) await this.repository.clearSequenceDrafts(episodeId);
        const totalCount = Math.max(1, sections.length);
        let completedCount = resumePlan.reusedSequenceNumbers.length;
        const initialPercent = Math.min(25, Math.max(10, 10 + Math.round((completedCount / totalCount) * 15)));
        await this.update(task.task_id, {
          progress_message: completedCount
            ? `Shot plan · resuming ${completedCount}/${totalCount} completed sequences`
            : "Shot plan · generating sequences",
          progress_percent: initialPercent,
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
              completedCount++;
              const seqPercent = Math.min(25, Math.max(10, 10 + Math.round((completedCount / totalCount) * 15)));
              await this.update(task.task_id, {
                progress_message: `Shot plan · sequence ${completedCount}/${totalCount} ready`,
                progress_percent: seqPercent,
              });
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
    } else {
      // Quiz-Native Fast Path: Generate quiz.json directly (auto-synthesizing script.md, visual_bible.md, scenes.json)
      const existingQuiz = await this.repository.readQuiz(task.channel_id, episodeId);
      if (!existingQuiz) {
        await step(
          "Quiz · generating structured questions",
          10,
          "GENERATE_QUIZ",
          async () => !(await this.repository.readQuiz(task.channel_id, episodeId)),
        );
      } else {
        await this.update(task.task_id, {
          progress_message: "Quiz · questions already ready",
          progress_percent: 10,
        });
      }

      const scenes = await this.repository.readScenes(task.channel_id, episodeId);
      if (scenes.length > 0) {
        const balancedScenes = rebalanceEditorialOverlays(scenes);
        await this.repository.saveScenes(task.channel_id, episodeId, balancedScenes);
      }
    }

    if (run.cancelled) throw new Error("Pipeline cancelled");
    await runQuizV2Pipeline.call(this, task);

    if (run.cancelled) throw new Error("Pipeline cancelled");
    await this.update(task.task_id, { progress_message: "Video · linting Quiz composition", progress_percent: 60 });
    const renderStartMs = Date.now();
    const videoChild = this.submit("GENERATE_VIDEO", task.channel_id, episodeId);
    run.children.add(videoChild.task_id);
    try {
      const completed = await waitForTaskTerminal.call(this, videoChild.task_id, run, async (childTask) => {
        if (childTask.render_progress) {
          const { frames_completed, total_frames } = childTask.render_progress;
          const captureRatio = total_frames > 0 ? frames_completed / total_frames : 0;
          const pipelinePercent = Math.min(98, Math.max(60, Math.round((60 + captureRatio * 38) * 100) / 100));
          await this.update(task.task_id, {
            progress_message:
              childTask.progress_message ??
              `Video · rendering frame ${frames_completed.toLocaleString("en-US")} / ${total_frames.toLocaleString("en-US")}`,
            progress_percent: pipelinePercent,
            render_progress: childTask.render_progress,
          });
        } else if (childTask.progress_message) {
          await this.update(task.task_id, {
            progress_message: childTask.progress_message,
          });
        }
      });
      if (completed.status !== "COMPLETED") throw new Error(`Video render failed: ${completed.error ?? completed.status}`);
      const renderDuration = Math.max(0, Math.round((Date.now() - renderStartMs) / 1000));
      const existingTimings = (await this.repository.readQuizStageTimings?.(task.channel_id, episodeId)) ?? {
        schema_version: 1,
        episode_id: episodeId,
        stages: {},
        parallel_groups: {},
      };
      if (!existingTimings.stages) existingTimings.stages = {};
      existingTimings.stages.render = {
        started_at: new Date(renderStartMs).toISOString(),
        completed_at: new Date().toISOString(),
        duration_seconds: renderDuration,
      };
      existingTimings.updated_at = new Date().toISOString();
      await this.repository.writeQuizStageTimings?.(task.channel_id, episodeId, existingTimings)?.catch?.(() => {});
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
