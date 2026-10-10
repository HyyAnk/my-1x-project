import type { Episode, VideoTitle } from "@studio/shared";

const DEFAULT_RECENT_TITLE_LIMIT = 15;

export interface RecentTitleSource {
  listEpisodes(channelId: string): Promise<Episode[]>;
  readVideoTitle(channelId: string, episodeId: string): Promise<VideoTitle | null>;
}

/**
 * Lists the published-facing titles of the channel's most recent other episodes,
 * preferring the generated YouTube title over the internal topic title.
 */
export async function loadRecentChannelTitles(
  source: RecentTitleSource,
  channelId: string,
  excludeEpisodeId: string,
  limit = DEFAULT_RECENT_TITLE_LIMIT,
): Promise<string[]> {
  const episodes = (await source.listEpisodes(channelId))
    .filter((episode) => episode.episode_id !== excludeEpisodeId)
    .sort((left, right) => right.created_at.localeCompare(left.created_at))
    .slice(0, limit);
  const titles = await Promise.all(
    episodes.map(async (episode) => {
      const videoTitle = await source.readVideoTitle(channelId, episode.episode_id).catch(() => null);
      return videoTitle?.title ?? episode.topic?.title ?? "";
    }),
  );
  return titles.map((title) => title.trim()).filter(Boolean);
}
