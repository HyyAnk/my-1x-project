import type { FastifyPluginCallback } from "fastify";
import { EpisodeSettingsInputSchema, SaveTextInputSchema } from "@studio/shared";
import type { RepositoryService } from "../repository.js";
import type { AppState } from "./state.js";

export type EpisodesRouteDeps = {
  repository: RepositoryService;
  state: AppState;
};

export function registerEpisodesRoutes(deps: EpisodesRouteDeps): FastifyPluginCallback {
  return (server, _options, done) => {
    const { repository, state } = deps;
    server.get("/api/channels/:channelId/episodes", async (request) => ({
      episodes: await repository.listEpisodes((request.params as { channelId: string }).channelId),
    }));
    server.get("/api/channels/:channelId/bgm-history", async (request) => ({
      history: await repository.readBgmHistory((request.params as { channelId: string }).channelId),
    }));
    server.delete("/api/channels/:channelId/episodes/:episodeId", async (request) => {
      const params = request.params as { channelId: string; episodeId: string };
      const query = request.query as { confirm?: string };
      await repository.deleteEpisode(params.channelId, params.episodeId, query.confirm === "true");
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
    done();
  };
}
