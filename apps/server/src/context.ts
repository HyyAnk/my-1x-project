import type { ContextManifest, TaskType } from "@studio/shared";
import type { RepositoryService } from "./repository.js";
import type { StudioLogger } from "./logger.js";
import { buildChannelContext } from "./context/channelContextBuilder.js";
import { buildEpisodeContext } from "./context/episodeContextBuilder.js";

export class ContextEngine {
  constructor(
    private readonly repository: RepositoryService,
    private readonly logger: StudioLogger,
  ) {}

  async build(
    taskType: TaskType,
    channelId: string,
    episodeId: string | null,
    sceneNumber?: number,
    imageVariant = 0,
    topicHint?: string,
  ): Promise<ContextManifest> {
    const channel = await this.repository.getChannel(channelId);

    // 1. Channel-level tasks (DNA, Topics)
    const channelManifest = await buildChannelContext({
      repository: this.repository,
      logger: this.logger,
      channel,
      taskType,
      channelId,
      topicHint,
    });
    if (channelManifest) return channelManifest;

    // 2. Episode-level tasks (Research, Treatment, Script, Visual Bible, Shots)
    const episode = episodeId ? await this.repository.getEpisode(channelId, episodeId) : null;
    if (!episode) throw new Error(`Episode is required for ${taskType}`);

    return buildEpisodeContext({
      repository: this.repository,
      logger: this.logger,
      channel,
      episode,
      taskType,
      channelId,
      episodeId: episode.episode_id,
      sceneNumber,
      imageVariant,
    });
  }
}
