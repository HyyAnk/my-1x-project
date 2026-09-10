import type { RepositoryRuntime } from "./runtime.js";

/**
 * Resolves episode titles in bulk using in-memory EntityIdResolver indices
 * and targeted O(1) file reads, completely bypassing full directory scans.
 */
export async function resolveEpisodeTitles(this: RepositoryRuntime, episodeIds: string[]): Promise<Record<string, string>> {
  const titles: Record<string, string> = {};
  if (!episodeIds || episodeIds.length === 0) {
    return titles;
  }

  const uniqueIds = Array.from(new Set(episodeIds.filter((id) => Boolean(id))));
  const unresolvedIds: string[] = [];

  // 1. Fast in-memory resolution from entityIdResolver
  for (const episodeId of uniqueIds) {
    const cachedTitle = this.entityIdResolver.getEpisodeTitle(episodeId);
    if (cachedTitle !== undefined) {
      titles[episodeId] = cachedTitle;
    } else {
      unresolvedIds.push(episodeId);
    }
  }

  if (unresolvedIds.length === 0) {
    return titles;
  }

  // 2. Direct O(1) single-file lookup for episodes with known channel
  const coldIds: string[] = [];
  for (const episodeId of unresolvedIds) {
    const channelId = this.entityIdResolver.getChannelIdByEpisodeId(episodeId);
    if (channelId) {
      try {
        const episode = await this.getEpisode(channelId, episodeId);
        const title = episode.topic?.title || "";
        titles[episodeId] = title;
        this.entityIdResolver.setEpisodeTitle(episodeId, title);
      } catch {
        // Episode file might not exist or corrupted; ignore gracefully
      }
    } else {
      coldIds.push(episodeId);
    }
  }

  if (coldIds.length === 0) {
    return titles;
  }

  // 3. Cold start fallback: scan channels only if episode has never been indexed
  try {
    const channels = await this.listChannels();
    for (const channel of channels) {
      if (coldIds.length === 0) break;
      try {
        const episodes = await this.listEpisodes(channel.channel_id);
        for (const ep of episodes) {
          this.entityIdResolver.setEpisodeTitle(ep.episode_id, ep.topic?.title || "");
          const matchIndex = coldIds.indexOf(ep.episode_id);
          if (matchIndex !== -1) {
            titles[ep.episode_id] = ep.topic?.title || "";
            coldIds.splice(matchIndex, 1);
          }
        }
      } catch {
        // Ignore channel listing error during batch title lookup
      }
    }
  } catch {
    // Ignore channel scan errors gracefully
  }

  return titles;
}
