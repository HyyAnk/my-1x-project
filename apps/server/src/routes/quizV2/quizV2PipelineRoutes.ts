import type { FastifyInstance } from "fastify";
import { RemixQuestionsInputSchema } from "@studio/shared";
import {
  compileTimeline,
  generateDirector,
  generateEpisodeDescription,
  generateQuiz,
  generateVoice,
  planAssets,
  planVoice,
  remixQuizQuestions,
  resolveAssets,
  runQa,
} from "../../quiz/pipeline/orchestrator.js";
import type { QuizV2RouteDeps } from "./quizV2Types.js";

/**
 * Registers pipeline generation and compilation routes for Quiz V2.
 */
export function registerQuizV2PipelineRoutes(server: FastifyInstance, deps: QuizV2RouteDeps): void {
  const { repository, tasks, codex, antigravity, state } = deps;
  const pipelineDeps = (channelId: string, episodeId: string) => ({
    repository,
    config: state.config,
    channelId,
    episodeId,
  });

  server.post("/api/channels/:channelId/episodes/:episodeId/quiz-v2/generate", async (request) => {
    const params = request.params as { channelId: string; episodeId: string };
    const stepDeps = {
      ...pipelineDeps(params.channelId, params.episodeId),
      activeEngine: tasks.getActiveEngine(),
      antigravityClient: antigravity,
      codexClient: codex,
    };
    const result = await generateQuiz(stepDeps);
    let description = null;
    try {
      const descResult = await generateEpisodeDescription(stepDeps);
      description = descResult.description;
    } catch {
      // Non-blocking fallback
    }
    return { ...result, description };
  });

  server.post("/api/channels/:channelId/episodes/:episodeId/quiz-v2/director/generate", async (request) => {
    const params = request.params as { channelId: string; episodeId: string };
    return generateDirector(pipelineDeps(params.channelId, params.episodeId));
  });

  server.post("/api/channels/:channelId/episodes/:episodeId/quiz-v2/assets/plan", async (request) => {
    const params = request.params as { channelId: string; episodeId: string };
    return planAssets(pipelineDeps(params.channelId, params.episodeId));
  });

  server.post("/api/channels/:channelId/episodes/:episodeId/quiz-v2/assets/resolve", async (request) => {
    const params = request.params as { channelId: string; episodeId: string };
    return resolveAssets({
      ...pipelineDeps(params.channelId, params.episodeId),
      activeEngine: tasks.getActiveEngine(),
    });
  });

  server.post("/api/channels/:channelId/episodes/:episodeId/quiz-v2/voice/plan", async (request) => {
    const params = request.params as { channelId: string; episodeId: string };
    return planVoice(pipelineDeps(params.channelId, params.episodeId));
  });

  server.post("/api/channels/:channelId/episodes/:episodeId/quiz-v2/voice/generate", async (request) => {
    const params = request.params as { channelId: string; episodeId: string };
    return generateVoice(pipelineDeps(params.channelId, params.episodeId));
  });

  server.post("/api/channels/:channelId/episodes/:episodeId/quiz-v2/timeline/compile", async (request) => {
    const params = request.params as { channelId: string; episodeId: string };
    return compileTimeline(pipelineDeps(params.channelId, params.episodeId));
  });

  server.post("/api/channels/:channelId/episodes/:episodeId/quiz-v2/qa", async (request) => {
    const params = request.params as { channelId: string; episodeId: string };
    return runQa(pipelineDeps(params.channelId, params.episodeId));
  });

  server.post("/api/channels/:channelId/episodes/:episodeId/quiz-v2/remix", async (request) => {
    const params = request.params as { channelId: string; episodeId: string };
    const payload = request.body && typeof request.body === "object" && !Array.isArray(request.body) ? request.body : {};
    const input = RemixQuestionsInputSchema.parse(payload);
    const stepDeps = {
      ...pipelineDeps(params.channelId, params.episodeId),
      activeEngine: tasks.getActiveEngine(),
      antigravityClient: antigravity,
      codexClient: codex,
    };
    const result = await remixQuizQuestions(stepDeps, input.question_ids, input.mode);
    let description = null;
    try {
      const descResult = await generateEpisodeDescription({ ...stepDeps, force: true });
      description = descResult.description;
    } catch {
      // Non-blocking fallback
    }
    return { ...result, description };
  });
}
