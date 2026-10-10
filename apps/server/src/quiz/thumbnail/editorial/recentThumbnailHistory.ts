import type { ThumbnailComposition, ThumbnailManifest } from "@studio/shared";
import type { RepositoryService } from "../../../repository.js";
import { getEpisodeThumbnailManifest } from "../thumbnailManifestStore.js";
import { LEGACY_COMPOSITION } from "./composition/compositionCatalog.js";

const RECENT_CHANNEL_EPISODES = 4;

export interface RecentThumbnailHistory {
  /** Newest first: this episode's current thumbnail, then the channel's latest episodes. */
  compositions: ThumbnailComposition[];
  /** Same order as compositions; used to keep headline patterns from repeating across the channel. */
  headlines: string[];
}

/** Comparison thumbnails have their own layout and say nothing about single-subject composition. */
export function manifestComposition(manifest: ThumbnailManifest | null): ThumbnailComposition | null {
  if (!manifest || manifest.design_template === "comparison") return null;
  return manifest.composition ?? LEGACY_COMPOSITION;
}

/**
 * Reads the active thumbnail of this episode and of the channel's most recently updated episodes.
 * Unreadable manifests are skipped.
 */
export async function loadRecentThumbnailHistory(repository: RepositoryService, channelId: string, episodeId: string): Promise<RecentThumbnailHistory> {
  const episodes = await repository.listEpisodes(channelId).catch(() => []);
  const otherEpisodeIds = episodes
    .map((episode) => episode.episode_id)
    .filter((id) => id !== episodeId)
    .slice(0, RECENT_CHANNEL_EPISODES);
  const manifests = await Promise.all(
    [episodeId, ...otherEpisodeIds].map((id) => getEpisodeThumbnailManifest(repository, channelId, id).catch(() => null)),
  );
  return {
    compositions: manifests.map(manifestComposition).filter((composition): composition is ThumbnailComposition => composition !== null),
    headlines: manifests.map((manifest) => manifest?.hook_text?.trim() ?? "").filter(Boolean),
  };
}
