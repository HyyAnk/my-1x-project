import type { FastifyPluginCallback } from "fastify";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  GenerateVideoDescriptionInputSchema,
  RemixQuestionsInputSchema,
  SandboxPreviewInputBaseSchema,
  VideoDescriptionInputSchema,
  nowIso,
  sandboxPreviewLayoutIssues,
  type VideoDescription,
} from "@studio/shared";
import type { AntigravityClient } from "../antigravity.js";
import type { CodexAppServerClient } from "../codex.js";
import { buildSandboxComposition } from "../quiz/render/sandboxComposition.js";
import { resolveCandyArcadeFont } from "../quiz/render/candyArcade/candyArcadeFonts.js";
import { defaultSfxCandidateDirectories, resolveSfxCandidatePath } from "../quiz/audio/soundtrackSfxPlanner.js";
import {
  assertQuizRenderReady,
  compileTimeline,
  generateDirector,
  generateEpisodeDescription,
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
        description,
      } = await readQuizArtifacts(pipelineDeps(params.channelId, params.episodeId));
      const timings = await repository.readQuizStageTimings(params.channelId, params.episodeId);
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
        description,
        timings,
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
      const deps = {
        ...pipelineDeps(params.channelId, params.episodeId),
        activeEngine: tasks.getActiveEngine(),
        antigravityClient: antigravity,
        codexClient: codex,
      };
      const result = await generateQuiz(deps);
      let description = null;
      try {
        const descResult = await generateEpisodeDescription(deps);
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
      const deps = {
        ...pipelineDeps(params.channelId, params.episodeId),
        activeEngine: tasks.getActiveEngine(),
        antigravityClient: antigravity,
        codexClient: codex,
      };
      const result = await remixQuizQuestions(
        deps,
        input.question_ids,
        input.mode,
      );
      let description = null;
      try {
        const descResult = await generateEpisodeDescription({ ...deps, force: true });
        description = descResult.description;
      } catch {
        // Non-blocking fallback
      }
      return { ...result, description };
    });
    server.get("/api/channels/:channelId/episodes/:episodeId/quiz-v2/description", async (request) => {
      const params = request.params as { channelId: string; episodeId: string };
      const description = await repository.readVideoDescription(params.channelId, params.episodeId);
      return { description };
    });
    server.post("/api/channels/:channelId/episodes/:episodeId/quiz-v2/description/generate", async (request) => {
      const params = request.params as { channelId: string; episodeId: string };
      const payload = request.body && typeof request.body === "object" && !Array.isArray(request.body) ? request.body : {};
      const input = GenerateVideoDescriptionInputSchema.parse(payload);
      return generateEpisodeDescription({
        ...pipelineDeps(params.channelId, params.episodeId),
        activeEngine: tasks.getActiveEngine(),
        antigravityClient: antigravity,
        codexClient: codex,
        toneHint: input.tone_hint,
        force: input.force,
      });
    });
    server.put("/api/channels/:channelId/episodes/:episodeId/quiz-v2/description", async (request) => {
      const params = request.params as { channelId: string; episodeId: string };
      const input = VideoDescriptionInputSchema.parse(request.body);
      const existing = await repository.readVideoDescription(params.channelId, params.episodeId);
      const channel = await repository.getChannel(params.channelId);
      const episode = await repository.getEpisode(params.channelId, params.episodeId);
      const quiz = await repository.readQuiz(params.channelId, params.episodeId);

      const updatedDescription: VideoDescription = {
        topic_category: input.topic_category ?? existing?.topic_category ?? episode.topic.title,
        primary_keyword: input.primary_keyword ?? existing?.primary_keyword ?? episode.topic.title,
        keyword_variations: input.keyword_variations ?? existing?.keyword_variations ?? [],
        question_count: existing?.question_count ?? quiz?.questions.length ?? episode.quiz_config.question_count,
        hook_lines: input.hook_lines ?? existing?.hook_lines ?? "",
        semantic_paragraph: input.semantic_paragraph ?? existing?.semantic_paragraph ?? "",
        scoring_cta: input.scoring_cta ?? existing?.scoring_cta ?? {
          beginner: "1-3: Beginner",
          intermediate: "4-6: Pro",
          expert: "7-8: Genius",
          cta_text: "Comment below!",
        },
        suggested_playlist_category:
          input.suggested_playlist_category ?? existing?.suggested_playlist_category ?? episode.topic.title,
        hashtags: input.hashtags ?? existing?.hashtags ?? ["#quiz", "#trivia"],
        full_description_text: input.full_description_text,
        char_count: input.full_description_text.length,
        language: existing?.language ?? channel.language ?? "English",
        generated_at: existing?.generated_at ?? nowIso(),
        updated_at: nowIso(),
      };

      const artifact_path = await repository.writeVideoDescription(params.channelId, params.episodeId, updatedDescription);
      return { description: updatedDescription, artifact_path };
    });
    server.post("/api/channels/:channelId/episodes/:episodeId/quiz-v2/render", async (request, reply) => {
      const params = request.params as { channelId: string; episodeId: string };
      await assertQuizRenderReady(pipelineDeps(params.channelId, params.episodeId));
      const task = tasks.submit("GENERATE_VIDEO", params.channelId, params.episodeId);
      return reply.code(202).send({ task });
    });
    server.post("/api/quiz/preview-composition", async (request, reply) => {
      const input = SandboxPreviewInputBaseSchema.parse(request.body ?? {});
      const layoutIssues = sandboxPreviewLayoutIssues(input);
      if (layoutIssues.length) {
        return reply.code(400).send({
          error: layoutIssues[0].message,
          code: "QUIZ_LAYOUT_INCOMPATIBLE",
          issues: layoutIssues,
        });
      }
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
    server.get("/api/quiz/sfx/:filename", async (request, reply) => {
      const { filename } = request.params as { filename: string };
      const sanitized = path.basename(filename);
      const candidateDirs = [path.resolve(repository.rootDirectory, "assets", "audio", "sfx"), ...defaultSfxCandidateDirectories()];
      const sfxPath = resolveSfxCandidatePath(sanitized, candidateDirs);
      if (!sfxPath) {
        throw new RepositoryError("Quiz SFX audio not found", "QUIZ_SFX_NOT_FOUND");
      }
      try {
        const content = await readFile(sfxPath);
        return reply
          .type(sanitized.endsWith(".mp3") ? "audio/mpeg" : "audio/wav")
          .header("Cache-Control", "public, max-age=31536000, immutable")
          .header("Content-Disposition", `inline; filename="${sanitized}"`)
          .header("X-Content-Type-Options", "nosniff")
          .send(content);
      } catch {
        throw new RepositoryError("Quiz SFX audio not found", "QUIZ_SFX_NOT_FOUND");
      }
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
