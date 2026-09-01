import path from "node:path";
import { createReadStream } from "node:fs";
import { readFile } from "node:fs/promises";
import type { FastifyInstance, FastifyPluginCallback, FastifyReply } from "fastify";
import { GenerateAllAudioInputSchema, SceneSchema } from "@studio/shared";
import { RepositoryError, type RepositoryService } from "../repository.js";
import { composeMergedVisualPrompt, mergeEditorialOverlays } from "../sceneTiming.js";
import type { TaskManager } from "../tasks.js";
import { createStoredZip } from "../zip.js";
import type { AppState } from "./state.js";

export type AudioVideoRouteDeps = {
  repository: RepositoryService;
  tasks: TaskManager;
  state: AppState;
  revealFile: (filePath: string) => Promise<void>;
};

export function registerAudioVideoRoutes(deps: AudioVideoRouteDeps): FastifyPluginCallback {
  return (server, _options, done) => {
    const { repository, tasks, state, revealFile } = deps;
    server.post("/api/channels/:channelId/episodes/:episodeId/scenes/:sceneNumber/audio", async (request, reply) => {
      const params = request.params as { channelId: string; episodeId: string; sceneNumber: string };
      const sceneNumber = Number(params.sceneNumber);
      if (!Number.isInteger(sceneNumber) || sceneNumber < 1) throw new RepositoryError("Scene number is required", "SCENE_REQUIRED");
      const task = tasks.submit("GENERATE_AUDIO", params.channelId, params.episodeId, sceneNumber);
      return reply.code(202).send({ task });
    });
    server.post("/api/channels/:channelId/episodes/:episodeId/scenes/:sceneNumber/merge-next", async (request, reply) => {
      const params = request.params as { channelId: string; episodeId: string; sceneNumber: string };
      const sceneNumber = Number(params.sceneNumber);
      if (!Number.isInteger(sceneNumber) || sceneNumber < 1) throw new RepositoryError("Scene number is required", "SCENE_REQUIRED");
      const scenes = await repository.readScenes(params.channelId, params.episodeId);
      const index = scenes.findIndex((scene) => scene.scene_number === sceneNumber);
      const next = index < 0 ? null : scenes[index + 1];
      if (index < 0 || !next) return reply.code(409).send({ error: "There is no next scene to combine" });
      const current = scenes[index];
      const mergedDuration = current.duration_seconds + next.duration_seconds;
      const maxDuration = state.config.video_generation.max_scene_duration_seconds;
      if (mergedDuration > maxDuration)
        return reply.code(409).send({ error: `Merged duration would exceed the ${maxDuration}s scene limit.` });
      const merged = {
        ...current,
        duration_seconds: mergedDuration,
        dialogue: `${current.dialogue.trim()} ${next.dialogue.trim()}`.trim(),
        visual_prompt: composeMergedVisualPrompt(current, next),
        transition_note: next.transition_note,
        continuity_note: current.continuity_note,
        editorial_overlay: mergeEditorialOverlays(current.editorial_overlay, next.editorial_overlay),
        audio_asset_path: null,
        audio_generated_at: null,
        audio_duration_seconds: null,
      };
      await repository.saveScenes(params.channelId, params.episodeId, [...scenes.slice(0, index), merged, ...scenes.slice(index + 2)]);
      return { scenes: await repository.readScenes(params.channelId, params.episodeId) };
    });
    server.post("/api/channels/:channelId/episodes/:episodeId/audio/generate-all", async (request, reply) => {
      const params = request.params as { channelId: string; episodeId: string };
      const { force } = GenerateAllAudioInputSchema.parse(request.body ?? {});
      const scenes = await repository.readScenes(params.channelId, params.episodeId);
      const created = scenes
        .filter((scene) => force || !scene.audio_asset_path)
        .map((scene) => tasks.submit("GENERATE_AUDIO", params.channelId, params.episodeId, scene.scene_number));
      return reply.code(202).send({ tasks: created });
    });
    server.get("/api/channels/:channelId/episodes/:episodeId/audio/download", async (request, reply) => {
      const params = request.params as { channelId: string; episodeId: string };
      const mode = (request.query as { mode?: string }).mode ?? "separate";
      if (mode !== "separate" && mode !== "merged")
        throw new RepositoryError("Download mode must be separate or merged", "INVALID_DOWNLOAD_MODE");
      const episode = await repository.getEpisode(params.channelId, params.episodeId);
      const scenes = (await repository.readScenes(params.channelId, params.episodeId)).sort((a, b) => a.scene_number - b.scene_number);
      const assets: Array<{ sceneNumber: number; absolutePath: string; filename: string }> = [];
      const missing: number[] = [];
      for (const scene of scenes) {
        if (!scene.audio_asset_path) {
          missing.push(scene.scene_number);
          continue;
        }
        try {
          const filename = path.basename(scene.audio_asset_path);
          const file = await repository.getSceneAudioFile(params.channelId, params.episodeId, filename);
          assets.push({ sceneNumber: scene.scene_number, absolutePath: file.absolutePath, filename });
        } catch {
          missing.push(scene.scene_number);
        }
      }
      if (mode === "separate") {
        const zip = createStoredZip(
          await Promise.all(
            assets.map(async (asset) => ({
              name: `scene-${String(asset.sceneNumber).padStart(2, "0")}.wav`,
              data: await readFile(asset.absolutePath),
            })),
          ),
        );
        return reply
          .headers({ "content-type": "application/zip", "content-disposition": `attachment; filename="${episode.slug}-audio-scenes.zip"` })
          .send(zip);
      }
      if (scenes.length === 0) return reply.code(409).send({ error: "This episode has no scenes", missing_scene_numbers: [] });
      if (missing.length > 0)
        return reply.code(409).send({ error: `Scenes ${missing.join(", ")} have no audio yet`, missing_scene_numbers: missing });
      let response: Response;
      try {
        response = await fetch(`${state.config.audio_generation.service_url.replace(/\/$/, "")}/merge`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ paths: assets.map((asset) => asset.absolutePath), gap_ms: state.config.audio_generation.merge_gap_ms }),
          signal: AbortSignal.timeout(15 * 60 * 1000),
        });
      } catch {
        throw new RepositoryError("Audio service unavailable", "AUDIO_SERVICE_UNAVAILABLE");
      }
      if (!response.ok) throw new RepositoryError("Audio merge failed", "AUDIO_MERGE_FAILED");
      const merged = Buffer.from(await response.arrayBuffer());
      return reply
        .headers({
          "content-type": "audio/wav",
          "content-length": merged.length,
          "content-disposition": `attachment; filename="${episode.slug}-audio-full.wav"`,
        })
        .send(merged);
    });
    registerStreamingRoutes(server, repository, revealFile);
    done();
  };
}

function registerStreamingRoutes(
  server: FastifyInstance,
  repository: RepositoryService,
  revealFile: (filePath: string) => Promise<void>,
): void {
  server.get("/api/channels/:channelId/episodes/:episodeId/assets/:filename", async (request, reply) => {
    const params = request.params as { channelId: string; episodeId: string; filename: string };
    const file = await repository.getEpisodeAudioFile(params.channelId, params.episodeId, params.filename);
    return sendRange(request.headers.range, file, "audio/wav", reply);
  });
  server.get("/api/channels/:channelId/episodes/:episodeId/video", async (request, reply) => {
    const params = request.params as { channelId: string; episodeId: string };
    const file = await repository.getEpisodeVideoFile(params.channelId, params.episodeId);
    return sendRange(request.headers.range, file, "video/mp4", reply, `inline; filename="quiz-video.mp4"`);
  });
  server.post("/api/channels/:channelId/episodes/:episodeId/video/open-folder", async (request) => {
    const params = request.params as { channelId: string; episodeId: string };
    const file = await repository.getEpisodeVideoFile(params.channelId, params.episodeId);
    await revealFile(file.absolutePath);
    return { opened: true, folder_path: path.dirname(file.path) };
  });
  server.put("/api/channels/:channelId/episodes/:episodeId/scenes", async (request) => {
    const params = request.params as { channelId: string; episodeId: string };
    const scenes = SceneSchema.array().parse(request.body);
    await repository.saveScenes(params.channelId, params.episodeId, scenes);
    return { scenes };
  });
  server.get("/api/voice/rendered-metrics", async () => repository.getRenderedVoiceMetrics());
}

function sendRange(
  range: string | undefined,
  file: { absolutePath: string; size: number; modified_at: string },
  contentType: string,
  reply: FastifyReply,
  contentDisposition?: string,
) {
  const baseHeaders = {
    "content-type": contentType,
    "accept-ranges": "bytes",
    ...(contentDisposition ? { "content-disposition": contentDisposition } : {}),
    "last-modified": file.modified_at,
  };
  if (!range) return reply.headers({ ...baseHeaders, "content-length": file.size }).send(createReadStream(file.absolutePath));
  const match = /^bytes=(\d*)-(\d*)$/.exec(range);
  if (!match) return reply.code(416).header("content-range", `bytes */${file.size}`).send();
  const start = match[1] ? Number(match[1]) : Math.max(0, file.size - Number(match[2] || 0));
  const requestedEnd = match[2] ? Number(match[2]) : file.size - 1;
  const end = Math.min(file.size - 1, requestedEnd);
  if (start < 0 || start > end || start >= file.size) return reply.code(416).header("content-range", `bytes */${file.size}`).send();
  return reply
    .code(206)
    .headers({ ...baseHeaders, "content-length": end - start + 1, "content-range": `bytes ${start}-${end}/${file.size}` })
    .send(createReadStream(file.absolutePath, { start, end }));
}
