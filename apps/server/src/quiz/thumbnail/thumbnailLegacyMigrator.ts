import path from "node:path";
import { EpisodeSchema, nowIso, type Channel, type Episode, type ThumbnailManifest } from "@studio/shared";
import type { RepositoryService } from "../../repository.js";

/**
 * Legacy thumbnail data lived directly on the episode record (`thumbnail_asset_path_16_9` /
 * `thumbnail_asset_path_9_16`) before the versioned manifest file existed. This module keeps
 * that legacy structure in sync with the current manifest format, so older episode.json
 * readers continue to resolve the active thumbnails.
 */

const EPISODE_RECORD_FILENAME = "episode.json";

type SyncLegacyEpisodeThumbnailPathsParams = {
  repository: RepositoryService;
  channel: Channel;
  episode: Episode;
  manifest: ThumbnailManifest;
};

/**
 * Backfills the legacy episode record with the active thumbnail asset paths from a manifest.
 * Called after manifest persistence so the legacy episode.json fields never go stale.
 */
export async function syncLegacyEpisodeThumbnailPaths(params: SyncLegacyEpisodeThumbnailPathsParams): Promise<void> {
  const { repository, channel, episode, manifest } = params;
  const latestEpisode = await repository.getEpisode(channel.channel_id, episode.episode_id);
  const updatedEpisode = EpisodeSchema.parse({
    ...latestEpisode,
    thumbnail_asset_path_16_9: manifest.asset_path_16_9 ?? latestEpisode.thumbnail_asset_path_16_9,
    thumbnail_asset_path_9_16: manifest.asset_path_9_16 ?? latestEpisode.thumbnail_asset_path_9_16,
    updated_at: nowIso(),
  });

  const episodeDirectory = repository.resolvePath("channels", channel.slug, "episodes", episode.slug);
  await repository.writeJsonAtomic(path.join(episodeDirectory, EPISODE_RECORD_FILENAME), updatedEpisode);
}

export type { SyncLegacyEpisodeThumbnailPathsParams };
