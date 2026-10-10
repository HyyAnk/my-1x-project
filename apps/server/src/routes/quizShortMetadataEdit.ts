import type { FastifyPluginCallback } from "fastify";
import { VideoDescriptionInputSchema, VideoTitleInputSchema } from "@studio/shared";
import type { RepositoryService } from "../repository.js";
import { mergeUpdatedDescription } from "./quizV2/quizV2ArtifactRoutes.js";
import { mergeManualVideoTitle } from "./quizV2/quizV2TitleRoutes.js";
import { ensureQuizShortTitleSuffix } from "../quiz/title/quizShortTitleRules.js";

type QuizShortParams = { channelId: string; quizShortId: string };

/**
 * Manual title and description edits for Quiz Shorts. Mirrors the Episode PUT routes but
 * reads the product record through the Quiz Short repository.
 */
export function registerQuizShortMetadataEditRoutes(deps: { repository: RepositoryService }): FastifyPluginCallback {
  const { repository } = deps;
  return (server, _options, done) => {
    server.put("/api/channels/:channelId/quiz-shorts/:quizShortId/title", async (request) => {
      const params = request.params as QuizShortParams;
      const input = VideoTitleInputSchema.parse(request.body);
      const [existing, channel] = await Promise.all([
        repository.readVideoTitle(params.channelId, params.quizShortId),
        repository.getChannel(params.channelId),
      ]);
      const merged = mergeManualVideoTitle(input, existing, channel);
      const title = { ...merged, title: ensureQuizShortTitleSuffix(merged.title) };
      const artifact_path = await repository.writeVideoTitle(params.channelId, params.quizShortId, title);
      const description = await repository.readVideoDescription(params.channelId, params.quizShortId);
      return { title, description, artifact_path };
    });

    server.put("/api/channels/:channelId/quiz-shorts/:quizShortId/description", async (request) => {
      const params = request.params as QuizShortParams;
      const input = VideoDescriptionInputSchema.parse(request.body);
      const [existing, channel, quizShort, quiz] = await Promise.all([
        repository.readVideoDescription(params.channelId, params.quizShortId),
        repository.getChannel(params.channelId),
        repository.getQuizShort(params.channelId, params.quizShortId),
        repository.readQuiz(params.channelId, params.quizShortId),
      ]);
      const description = mergeUpdatedDescription({ input, existing, channel, episode: quizShort, quiz });
      const artifact_path = await repository.writeVideoDescription(params.channelId, params.quizShortId, description);
      return { description, artifact_path };
    });

    done();
  };
}
