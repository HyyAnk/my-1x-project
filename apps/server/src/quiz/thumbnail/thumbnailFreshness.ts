import type { RepositoryService } from "../../repository.js";
import { thumbnailInputFingerprint } from "./thumbnailReuseStore.js";
import { loadProductLocalizationArtifact } from "../bank/localization/productLocalization.js";

async function sourceFingerprint(repository: RepositoryService, channelId: string, episodeId: string): Promise<string> {
  const [episode, channel, quiz, localization] = await Promise.all([
    repository.getEpisode(channelId, episodeId),
    repository.getChannel(channelId),
    repository.readQuiz(channelId, episodeId),
    loadProductLocalizationArtifact(repository, channelId, episodeId),
  ]);
  return thumbnailInputFingerprint({
    topic: episode.topic,
    questions: quiz?.questions,
    language: channel.language,
    mascotId: channel.mascot_id,
    style: episode.quiz_config.resolved_visual_style ?? episode.quiz_config.visual_style,
    ratio: episode.quiz_config.thumbnail_aspect_ratio,
    format: episode.quiz_config.quiz_format,
    count: episode.quiz_config.question_count,
    localization,
  });
}

export async function createThumbnailFreshnessGuard(
  repository: RepositoryService,
  channelId: string,
  episodeId: string,
): Promise<() => Promise<void>> {
  const initial = await sourceFingerprint(repository, channelId, episodeId);
  return async () => {
    if ((await sourceFingerprint(repository, channelId, episodeId)) !== initial) {
      throw new Error("Thumbnail inputs changed during generation. Retry using the current episode settings");
    }
  };
}
