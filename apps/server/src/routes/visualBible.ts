import { createReadStream } from "node:fs";
import { readFile } from "node:fs/promises";
import type { FastifyPluginCallback } from "fastify";
import { GenerateAllBundleImagesInputSchema, type Task } from "@studio/shared";
import { assessProduction, extractNarrationSections } from "../production.js";
import { RepositoryError, type RepositoryService } from "../repository.js";
import { optimizeShortScenes } from "../sceneTiming.js";
import { planSequenceResume, type TaskManager } from "../tasks.js";
import { parseContinuityBundles } from "../visualBundles.js";
import { createStoredZip } from "../zip.js";
import type { AppState } from "./state.js";

export type VisualBibleRouteDeps = {
  repository: RepositoryService;
  tasks: TaskManager;
  state: AppState;
};

export function registerVisualBibleRoutes(deps: VisualBibleRouteDeps): FastifyPluginCallback {
  return (server, _options, done) => {
    const { repository, tasks, state } = deps;
    server.get("/api/channels/:channelId/episodes/:episodeId/visual-bible/images", async (request) => {
      const params = request.params as { channelId: string; episodeId: string };
      return { images: await repository.listBundleImages(params.channelId, params.episodeId) };
    });
    server.post("/api/channels/:channelId/episodes/:episodeId/visual-bible/bundles/:bundleNumber/image", async (request, reply) => {
      if (!state.config.image_generation.enabled)
        throw new RepositoryError("Image generation is disabled in Settings", "IMAGE_GENERATION_DISABLED");
      const params = request.params as { channelId: string; episodeId: string; bundleNumber: string };
      const bundleNumber = Number(params.bundleNumber);
      const visualBible = await repository.getEpisodeFile(params.channelId, params.episodeId, "visual_bible.md");
      if (!parseContinuityBundles(visualBible.content).some((bundle) => bundle.bundle_number === bundleNumber))
        throw new RepositoryError("Continuity bundle was not found", "BUNDLE_NOT_FOUND");
      const task = tasks.submit("GENERATE_BUNDLE_IMAGE", params.channelId, params.episodeId, bundleNumber);
      return reply.code(202).send({ task });
    });
    server.post("/api/channels/:channelId/episodes/:episodeId/visual-bible/images/generate-all", async (request, reply) => {
      if (!state.config.image_generation.enabled)
        throw new RepositoryError("Image generation is disabled in Settings", "IMAGE_GENERATION_DISABLED");
      const params = request.params as { channelId: string; episodeId: string };
      const { force } = GenerateAllBundleImagesInputSchema.parse(request.body ?? {});
      const visualBible = await repository.getEpisodeFile(params.channelId, params.episodeId, "visual_bible.md");
      const bundles = parseContinuityBundles(visualBible.content);
      const existing = await repository.listBundleImages(params.channelId, params.episodeId);
      const active = tasks
        .list()
        .filter(
          (task) =>
            task.episode_id === params.episodeId &&
            task.task_type === "GENERATE_BUNDLE_IMAGE" &&
            ["QUEUED", "RUNNING", "WAITING_APPROVAL"].includes(task.status),
        );
      const created: Task[] = [];
      for (const bundle of bundles) {
        if (active.some((task) => task.scene_number === bundle.bundle_number)) continue;
        if (force) await repository.clearBundleImages(params.channelId, params.episodeId, bundle.bundle_number);
        const current = force ? [] : existing.filter((image) => image.bundle_number === bundle.bundle_number);
        for (let variant = 0; variant < state.config.image_generation.images_per_bundle; variant += 1) {
          if (current.some((image) => image.variant === variant)) continue;
          created.push(tasks.submit("GENERATE_BUNDLE_IMAGE", params.channelId, params.episodeId, bundle.bundle_number, variant));
        }
      }
      return reply.code(202).send({ tasks: created, bundle_count: bundles.length });
    });
    server.get("/api/channels/:channelId/episodes/:episodeId/visual-bible/images/download", async (request, reply) => {
      const params = request.params as { channelId: string; episodeId: string };
      const episode = await repository.getEpisode(params.channelId, params.episodeId);
      const images = await repository.listBundleImages(params.channelId, params.episodeId);
      if (images.length === 0) throw new RepositoryError("No reference images have been generated", "IMAGE_NOT_FOUND");
      const zip = createStoredZip(
        await Promise.all(images.map(async (image) => ({ name: image.filename, data: await readFile(image.absolutePath) }))),
      );
      return reply
        .headers({
          "content-type": "application/zip",
          "content-disposition": `attachment; filename="${episode.slug}-reference-images.zip"`,
        })
        .send(zip);
    });
    server.get("/api/channels/:channelId/episodes/:episodeId/visual-bible/images/:filename", async (request, reply) => {
      const params = request.params as { channelId: string; episodeId: string; filename: string };
      const file = await repository.getBundleImageFile(params.channelId, params.episodeId, params.filename);
      return reply
        .headers({
          "content-type": "image/png",
          "content-length": file.size,
          "last-modified": file.modified_at,
          "cache-control": "no-store",
          "content-disposition": `inline; filename="${file.filename}"`,
        })
        .send(createReadStream(file.absolutePath));
    });
    server.get("/api/channels/:channelId/episodes/:episodeId/production-assessment", async (request) => {
      const params = request.params as { channelId: string; episodeId: string };
      const [episode, research, treatment, visualBible, script, scenes] = await Promise.all([
        repository.getEpisode(params.channelId, params.episodeId),
        repository.getEpisodeFile(params.channelId, params.episodeId, "research.md"),
        repository.getEpisodeFile(params.channelId, params.episodeId, "treatment.md"),
        repository.getEpisodeFile(params.channelId, params.episodeId, "visual_bible.md"),
        repository.getEpisodeFile(params.channelId, params.episodeId, "script.md"),
        repository.readScenes(params.channelId, params.episodeId),
      ]);
      return {
        assessment: assessProduction({
          episode,
          research: research.content,
          treatment: treatment.content,
          visualBible: visualBible.content,
          script: script.content,
          scenes,
          fallbackWordsPerSecond: state.config.video_generation.narration_words_per_second,
        }),
      };
    });
    server.post("/api/channels/:channelId/episodes/:episodeId/shots/generate", async (request, reply) => {
      const params = request.params as { channelId: string; episodeId: string };
      const script = await repository.getEpisodeFile(params.channelId, params.episodeId, "script.md");
      const sequenceCount = extractNarrationSections(script.content).length;
      if (sequenceCount < 1) throw new RepositoryError("A completed script is required", "SCRIPT_REQUIRED");
      await repository.backupEpisodeFile(params.channelId, params.episodeId, "scene_plan.md");
      const drafts = await repository.readSequenceDrafts(params.episodeId);
      const resumePlan = planSequenceResume(sequenceCount, drafts, script.modified_at, false);
      if (resumePlan.shouldClearDrafts) await repository.clearSequenceDrafts(params.episodeId);
      if (resumePlan.pendingSequenceNumbers.length === 0) {
        const committed = await repository.commitSequenceDrafts(params.channelId, params.episodeId, sequenceCount);
        if (!committed) throw new RepositoryError("Completed shot drafts could not be committed", "SHOT_PLAN_COMMIT_FAILED");
      }
      const created = resumePlan.pendingSequenceNumbers.map((sequenceNumber) =>
        tasks.submit("GENERATE_SEQUENCE_SCENES", params.channelId, params.episodeId, sequenceNumber),
      );
      return reply.code(202).send({
        tasks: created,
        sequence_count: sequenceCount,
        reused_sequence_numbers: resumePlan.reusedSequenceNumbers,
        pending_sequence_numbers: resumePlan.pendingSequenceNumbers,
      });
    });
    server.post("/api/channels/:channelId/episodes/:episodeId/shots/optimize", async (request) => {
      const params = request.params as { channelId: string; episodeId: string };
      const scenes = await repository.readScenes(params.channelId, params.episodeId);
      const optimized = optimizeShortScenes(scenes, state.config.video_generation.max_scene_duration_seconds, params.episodeId);
      await repository.saveScenes(params.channelId, params.episodeId, optimized);
      return { scenes: await repository.readScenes(params.channelId, params.episodeId), merged: scenes.length - optimized.length };
    });
    done();
  };
}
