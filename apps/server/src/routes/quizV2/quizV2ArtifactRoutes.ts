import type { FastifyInstance } from "fastify";
import {
  GenerateVideoDescriptionInputSchema,
  VideoDescriptionInputSchema,
  nowIso,
  type VideoDescription,
} from "@studio/shared";
import {
  generateEpisodeDescription,
  readQuizArtifacts,
} from "../../quiz/pipeline/orchestrator.js";
import type { RepositoryService } from "../../repository.js";
import type { QuizV2RouteDeps } from "./quizV2Types.js";

/**
 * Resolves topic metadata fields with fallback defaults.
 */
export function resolveTopicFields(
  input: ReturnType<typeof VideoDescriptionInputSchema.parse>,
  existing: VideoDescription | null,
  fallbackTitle: string,
) {
  return {
    topic_category: input.topic_category ?? existing?.topic_category ?? fallbackTitle,
    primary_keyword: input.primary_keyword ?? existing?.primary_keyword ?? fallbackTitle,
    keyword_variations: input.keyword_variations ?? existing?.keyword_variations ?? [],
    suggested_playlist_category: input.suggested_playlist_category ?? existing?.suggested_playlist_category ?? fallbackTitle,
    hashtags: input.hashtags ?? existing?.hashtags ?? ["#quiz", "#trivia"],
  };
}

/**
 * Merges updated description payload with existing description and repository models.
 */
export function mergeUpdatedDescription(params: {
  input: ReturnType<typeof VideoDescriptionInputSchema.parse>;
  existing: VideoDescription | null;
  channel: Awaited<ReturnType<RepositoryService["getChannel"]>>;
  episode: Awaited<ReturnType<RepositoryService["getEpisode"]>>;
  quiz: Awaited<ReturnType<RepositoryService["readQuiz"]>>;
}): VideoDescription {
  const { input, existing, channel, episode, quiz } = params;
  const topicFields = resolveTopicFields(input, existing, episode.topic.title);
  return {
    ...topicFields,
    question_count: existing?.question_count ?? quiz?.questions.length ?? episode.quiz_config.question_count,
    hook_lines: input.hook_lines ?? existing?.hook_lines ?? "",
    semantic_paragraph: input.semantic_paragraph ?? existing?.semantic_paragraph ?? "",
    scoring_cta: input.scoring_cta ??
      existing?.scoring_cta ?? {
        beginner: "1-3: Beginner",
        intermediate: "4-6: Pro",
        expert: "7-8: Genius",
        cta_text: "Comment below!",
      },
    full_description_text: input.full_description_text,
    char_count: input.full_description_text.length,
    language: existing?.language ?? channel.language ?? "English",
    generated_at: existing?.generated_at ?? nowIso(),
    updated_at: nowIso(),
  };
}

/**
 * Registers artifact status, history check, and description endpoints for Quiz V2.
 */
export function registerQuizV2ArtifactRoutes(server: FastifyInstance, deps: QuizV2RouteDeps): void {
  const { repository, tasks, codex, antigravity, state } = deps;
  const pipelineDeps = (channelId: string, episodeId: string) => ({
    repository,
    config: state.config,
    channelId,
    episodeId,
  });

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
      render_stale: Boolean(episode.render_stale),
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
        render: active?.task_type === "GENERATE_VIDEO"
          ? "running"
          : episode.video_asset_path
            ? (episode.render_stale ? "stale" : "ready")
            : "not_started",
      },
    };
  });

  server.get("/api/channels/:channelId/episodes/:episodeId/quiz-v2/history-check", async (request) => {
    const params = request.params as { channelId: string; episodeId: string };
    const artifacts = await readQuizArtifacts(pipelineDeps(params.channelId, params.episodeId));
    return { history_check: artifacts.history_check };
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

    const updatedDescription = mergeUpdatedDescription({
      input,
      existing,
      channel,
      episode,
      quiz,
    });

    const artifact_path = await repository.writeVideoDescription(params.channelId, params.episodeId, updatedDescription);
    return { description: updatedDescription, artifact_path };
  });
}
