import type { FastifyPluginCallback } from "fastify";
import { QuizShortSettingsInputSchema, quizShortProductRef } from "@studio/shared";
import { RepositoryError, type RepositoryService } from "../repository.js";
import type { TaskManager } from "../tasks.js";

export type QuizShortsRouteDeps = {
  repository: RepositoryService;
  tasks: TaskManager;
};

type QuizShortParams = { channelId: string; quizShortId: string };

/**
 * Quiz Short record routes: list, read, settings and delete. Topic confirmation and the
 * pipeline start/retry proxies arrive with the confirmation flow in a later phase.
 */
export function registerQuizShortsRoutes(deps: QuizShortsRouteDeps): FastifyPluginCallback {
  return (server, _options, done) => {
    const { repository, tasks } = deps;

    server.get("/api/channels/:channelId/quiz-shorts", async (request) => {
      const { channelId } = request.params as { channelId: string };
      return { quiz_shorts: await repository.listQuizShorts(channelId) };
    });

    server.get("/api/channels/:channelId/quiz-shorts/:quizShortId", async (request) => {
      const params = request.params as QuizShortParams;
      return repository.getQuizShort(params.channelId, params.quizShortId);
    });

    server.patch("/api/channels/:channelId/quiz-shorts/:quizShortId", async (request) => {
      const params = request.params as QuizShortParams;
      const input = QuizShortSettingsInputSchema.parse(request.body);
      if (tasks.hasActiveEpisodeTasks(params.quizShortId)) {
        throw new RepositoryError("Wait for the active Quiz Short task or cancel it before changing settings.", "EPISODE_TASK_ACTIVE");
      }
      return repository.updateQuizShortSettings(params.channelId, params.quizShortId, input);
    });

    server.delete("/api/channels/:channelId/quiz-shorts/:quizShortId", async (request) => {
      const params = request.params as QuizShortParams;
      const query = request.query as { confirm?: string };
      if (tasks.hasActiveEpisodeTasks(params.quizShortId)) {
        throw new RepositoryError("Quiz Short has active tasks. Cancel them before deleting it", "EPISODE_TASK_ACTIVE");
      }
      await repository.deleteQuizShort(params.channelId, params.quizShortId, query.confirm === "true");
      await tasks.pruneEpisodeTasks(params.quizShortId);
      return { ok: true };
    });

    server.post("/api/channels/:channelId/quiz-shorts/:quizShortId/pipeline", async (request) => {
      const params = request.params as QuizShortParams;
      await repository.getQuizShort(params.channelId, params.quizShortId);
      return tasks.submitForProduct("GENERATE_PIPELINE", quizShortProductRef(params.channelId, params.quizShortId));
    });

    done();
  };
}
