import type { FastifyInstance } from "fastify";
import {
  GenerateVideoTitleInputSchema,
  VideoTitleInputSchema,
  nowIso,
  type Channel,
  type VideoDescription,
  type VideoTitle,
  type VideoTitleInput,
} from "@studio/shared";
import { generateEpisodeDescription, generateEpisodeTitle } from "../../quiz/pipeline/orchestrator.js";
import { sanitizeVideoTitle } from "../../quiz/title/index.js";
import type { QuizV2RouteDeps } from "./quizV2Types.js";

/**
 * Builds a manually edited title, keeping the previous keyword unless a new one is supplied.
 */
export function mergeManualVideoTitle(input: VideoTitleInput, existing: VideoTitle | null, channel: Channel): VideoTitle {
  const title = sanitizeVideoTitle(input.title) || input.title;
  return {
    title,
    primary_keyword: input.primary_keyword ?? existing?.primary_keyword ?? title,
    char_count: title.length,
    language: existing?.language ?? channel.language ?? "English",
    source: "manual",
    generated_at: existing?.generated_at ?? nowIso(),
    updated_at: nowIso(),
  };
}

/**
 * Registers the YouTube title endpoints. Every title change re-aligns the description,
 * because the description is always derived from the title.
 */
export function registerQuizV2TitleRoutes(server: FastifyInstance, deps: QuizV2RouteDeps): void {
  const { repository, tasks, codex, antigravity, state } = deps;
  const metadataDeps = (channelId: string, episodeId: string) => ({
    repository,
    config: state.config,
    channelId,
    episodeId,
    activeEngine: tasks.getActiveEngine(),
    antigravityClient: antigravity,
    codexClient: codex,
  });

  const syncDescription = async (channelId: string, episodeId: string): Promise<VideoDescription | null> => {
    try {
      return (await generateEpisodeDescription(metadataDeps(channelId, episodeId))).description;
    } catch {
      return repository.readVideoDescription(channelId, episodeId);
    }
  };

  server.get("/api/channels/:channelId/episodes/:episodeId/quiz-v2/title", async (request) => {
    const params = request.params as { channelId: string; episodeId: string };
    return { title: await repository.readVideoTitle(params.channelId, params.episodeId) };
  });

  server.post("/api/channels/:channelId/episodes/:episodeId/quiz-v2/title/generate", async (request) => {
    const params = request.params as { channelId: string; episodeId: string };
    const payload = request.body && typeof request.body === "object" && !Array.isArray(request.body) ? request.body : {};
    const input = GenerateVideoTitleInputSchema.parse(payload);
    const { title, artifact_path } = await generateEpisodeTitle({ ...metadataDeps(params.channelId, params.episodeId), toneHint: input.tone_hint });
    const description = await syncDescription(params.channelId, params.episodeId);
    return { title, description, artifact_path };
  });

  server.put("/api/channels/:channelId/episodes/:episodeId/quiz-v2/title", async (request) => {
    const params = request.params as { channelId: string; episodeId: string };
    const input = VideoTitleInputSchema.parse(request.body);
    const [existing, channel] = await Promise.all([
      repository.readVideoTitle(params.channelId, params.episodeId),
      repository.getChannel(params.channelId),
    ]);
    const title = mergeManualVideoTitle(input, existing, channel);
    const artifact_path = await repository.writeVideoTitle(params.channelId, params.episodeId, title);
    const description = await syncDescription(params.channelId, params.episodeId);
    return { title, description, artifact_path };
  });
}
