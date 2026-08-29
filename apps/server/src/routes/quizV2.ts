import type { FastifyPluginCallback } from "fastify";
import { readFile } from "node:fs/promises";
import { RemixQuestionsInputSchema, SandboxPreviewInputSchema } from "@studio/shared";
import type { AntigravityClient } from "../antigravity.js";
import type { CodexAppServerClient } from "../codex.js";
import { buildSandboxComposition } from "../quiz/render/sandboxComposition.js";
import { resolveCandyArcadeFont } from "../quiz/render/candyArcade/candyArcadeFonts.js";
import {
  assertQuizRenderReady,
  compileTimeline,
  generateDirector,
  generateQuiz,
  generateVoice,
  planAssets,
  planVoice,
  readQuizArtifacts,
  remixQuizQuestions,
  resolveAssets,
  runQa,
} from "../quiz/pipeline/orchestrator.js";
import { RepositoryError, type RepositoryService } from "../repository.js";
import type { TaskManager } from "../tasks.js";
import type { AppState } from "./state.js";

export type QuizV2RouteDeps = {
  repository: RepositoryService;
  tasks: TaskManager;
  codex: CodexAppServerClient;
  antigravity: AntigravityClient;
  state: AppState;
};

export function registerQuizV2Routes(deps: QuizV2RouteDeps): FastifyPluginCallback {
  return (server, _options, done) => {
    const { repository, tasks, codex, antigravity, state } = deps;
    const pipelineDeps = (channelId: string, episodeId: string) => ({ repository, config: state.config, channelId, episodeId });

    server.get("/api/channels/:channelId/episodes/:episodeId/quiz-v2", async (request) => {
      const params = request.params as { channelId: string; episodeId: string };
      const episode = await repository.getEpisode(params.channelId, params.episodeId);
      const {
        quiz,
        director_plan: directorPlan,
        asset_plan: assetPlan,
        asset_resolution: assetResolution,
        voice_plan: voicePlan,
        timeline,
        assessment,
      } = await readQuizArtifacts(pipelineDeps(params.channelId, params.episodeId));
      const active = tasks
        .list()
        .find((task) => task.episode_id === params.episodeId && ["QUEUED", "RUNNING", "WAITING_APPROVAL"].includes(task.status));
      return {
        quiz,
        director_plan: directorPlan,
        asset_plan: assetPlan,
        asset_resolution: assetResolution,
        voice_plan: voicePlan,
        timeline,
        assessment,
        stages: {
          research: [
            "RESEARCH_READY",
            "TREATMENT",
            "TREATMENT_READY",
            "SCRIPT",
            "SCRIPT_READY",
            "VISUAL_BIBLE",
            "VISUAL_BIBLE_READY",
            "SCENE_BREAKDOWN",
            "SCENE_READY",
            "NARRATION_READY",
            "READY_FOR_GENERATION",
            "VIDEO_RENDERING",
            "VIDEO_READY",
          ].includes(episode.stage)
            ? "ready"
            : "not_started",
          questions: quiz ? "ready" : "not_started",
          director: directorPlan ? "ready" : "not_started",
          assets: assetPlan ? "ready" : "not_started",
          voice: voicePlan ? "ready" : "not_started",
          timeline: timeline ? "ready" : "not_started",
          qa: assessment ? (assessment.issues.some((issue) => issue.severity === "blocker") ? "failed" : "ready") : "not_started",
          render: active?.task_type === "GENERATE_VIDEO" ? "running" : episode.video_asset_path ? "ready" : "not_started",
        },
      };
    });
    server.post("/api/channels/:channelId/episodes/:episodeId/quiz-v2/generate", async (request) => {
      const params = request.params as { channelId: string; episodeId: string };
      return generateQuiz(pipelineDeps(params.channelId, params.episodeId));
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
      return resolveAssets({ ...pipelineDeps(params.channelId, params.episodeId), activeEngine: tasks.getActiveEngine() });
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
    server.get("/api/channels/:channelId/episodes/:episodeId/quiz-v2/history-check", async (request) => {
      const params = request.params as { channelId: string; episodeId: string };
      const artifacts = await readQuizArtifacts(pipelineDeps(params.channelId, params.episodeId));
      return { history_check: artifacts.history_check };
    });
    server.post("/api/channels/:channelId/episodes/:episodeId/quiz-v2/remix", async (request) => {
      const params = request.params as { channelId: string; episodeId: string };
      const payload = request.body && typeof request.body === "object" && !Array.isArray(request.body) ? request.body : {};
      const input = RemixQuestionsInputSchema.parse(payload);
      return remixQuizQuestions(
        {
          ...pipelineDeps(params.channelId, params.episodeId),
          activeEngine: tasks.getActiveEngine(),
          antigravityClient: antigravity,
          codexClient: codex,
        },
        input.question_ids,
        input.mode,
      );
    });
    server.post("/api/channels/:channelId/episodes/:episodeId/quiz-v2/render", async (request, reply) => {
      const params = request.params as { channelId: string; episodeId: string };
      const channel = await repository.getChannel(params.channelId);
      if (channel.engine !== "quiz")
        throw new RepositoryError("Quiz V2 rendering is only available for Quiz channels", "QUIZ_CHANNEL_REQUIRED");
      await assertQuizRenderReady(pipelineDeps(params.channelId, params.episodeId));
      const task = tasks.submit("GENERATE_VIDEO", params.channelId, params.episodeId);
      return reply.code(202).send({ task });
    });
    server.post("/api/quiz/preview-composition", async (request) => {
      const input = SandboxPreviewInputSchema.parse(request.body ?? {});
      const mascot = input.mascot_id ? await repository.getMascot(input.mascot_id).catch(() => null) : null;
      return buildSandboxComposition(input, mascot);
    });
    server.get("/api/quiz/fonts/:fontId", async (request, reply) => {
      const { fontId } = request.params as { fontId: string };
      const font = resolveCandyArcadeFont(fontId, repository.rootDirectory);
      if (!font) throw new RepositoryError("Quiz font not found", "QUIZ_FONT_NOT_FOUND");
      const content = await readFile(font.absolutePath);
      return reply
        .type(font.mimeType)
        .header("Cache-Control", "public, max-age=31536000, immutable")
        .header("ETag", `"${font.sha256}"`)
        .header("X-Content-Type-Options", "nosniff")
        .send(content);
    });
    server.get("/api/channels/:channelId/episodes/:episodeId/quiz-v2/soundtrack", async (request, reply) => {
      const params = request.params as { channelId: string; episodeId: string };
      const soundtrackPath = repository.resolvePath("runtime", "hyperframes", params.episodeId, "soundtrack.wav");
      try {
        const content = await readFile(soundtrackPath);
        return reply.type("audio/wav").header("Content-Disposition", 'inline; filename="soundtrack.wav"').send(content);
      } catch {
        throw new RepositoryError("Soundtrack not found for this episode", "SOUNDTRACK_NOT_FOUND");
      }
    });
    done();
  };
}
