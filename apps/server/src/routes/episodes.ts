import type { FastifyPluginCallback } from "fastify";
import { EpisodeSettingsInputSchema, PaginationQuerySchema, SaveTextInputSchema } from "@studio/shared";
import { RepositoryError, type RepositoryService } from "../repository.js";
import type { TaskManager } from "../tasks.js";
import type { AppState } from "./state.js";
import { paginateEpisodes } from "./paginationUtils.js";

export type EpisodesRouteDeps = {
  repository: RepositoryService;
  state: AppState;
  tasks: TaskManager;
};

export function registerEpisodesRoutes(deps: EpisodesRouteDeps): FastifyPluginCallback {
  return (server, _options, done) => {
    const { repository, state, tasks } = deps;
    server.get("/api/channels/:channelId/episodes", async (request) => {
      const channelId = (request.params as { channelId: string }).channelId;
      const query = PaginationQuerySchema.parse(request.query);
      const episodes = await repository.listEpisodes(channelId);
      const result = paginateEpisodes(episodes, query);
      return {
        episodes: result.items,
        total: result.total,
        page: result.page,
        limit: result.limit,
        total_pages: result.total_pages,
        pagination: result.pagination,
      };
    });
    server.get("/api/channels/:channelId/bgm-history", async (request) => ({
      history: await repository.readBgmHistory((request.params as { channelId: string }).channelId),
    }));
    server.delete("/api/channels/:channelId/episodes/:episodeId", async (request) => {
      const params = request.params as { channelId: string; episodeId: string };
      const query = request.query as { confirm?: string };
      if (tasks.hasActiveEpisodeTasks(params.episodeId)) {
        throw new RepositoryError("Episode has active tasks. Cancel them before deleting the episode", "EPISODE_TASK_ACTIVE");
      }
      await repository.deleteEpisode(params.channelId, params.episodeId, query.confirm === "true");
      await tasks.pruneEpisodeTasks(params.episodeId);
      return { ok: true };
    });
    server.patch("/api/channels/:channelId/episodes/:episodeId", async (request) => {
      const params = request.params as { channelId: string; episodeId: string };
      const input = EpisodeSettingsInputSchema.parse(request.body);
      return repository.updateEpisodeSettings(
        params.channelId,
        params.episodeId,
        input,
        state.config.video_generation.narration_words_per_second,
      );
    });
    server.get("/api/channels/:channelId/episodes/:episodeId/file/:filename", async (request) => {
      const params = request.params as { channelId: string; episodeId: string; filename: string };
      return repository.getEpisodeFile(params.channelId, params.episodeId, params.filename);
    });
    server.put("/api/channels/:channelId/episodes/:episodeId/file/:filename", async (request) => {
      const params = request.params as { channelId: string; episodeId: string; filename: string };
      const { content } = SaveTextInputSchema.parse(request.body);
      return repository.saveEpisodeFile(params.channelId, params.episodeId, params.filename, content);
    });
    server.get("/api/channels/:channelId/episodes/:episodeId/scenes", async (request) => {
      const params = request.params as { channelId: string; episodeId: string };
      return { scenes: await repository.readScenes(params.channelId, params.episodeId) };
    });
    server.get("/api/episodes/titles", async (request) => {
      const query = request.query as { ids?: string | string[]; episode_ids?: string | string[] };
      const rawIds = query.ids ?? query.episode_ids;
      const ids = Array.isArray(rawIds) ? rawIds.flatMap((id) => id.split(",")) : typeof rawIds === "string" ? rawIds.split(",") : [];
      const cleanIds = ids.map((id) => id.trim()).filter((id) => id.length > 0);
      const titles = await repository.resolveEpisodeTitles(cleanIds);
      return { titles };
    });
    server.post("/api/episodes/batch-titles", async (request) => {
      const body = (request.body as { ids?: string[]; episode_ids?: string[] }) || {};
      const ids = Array.isArray(body.ids) ? body.ids : Array.isArray(body.episode_ids) ? body.episode_ids : [];
      const cleanIds = ids.map((id) => String(id).trim()).filter((id) => id.length > 0);
      const titles = await repository.resolveEpisodeTitles(cleanIds);
      return { titles };
    });
    done();
  };
}
