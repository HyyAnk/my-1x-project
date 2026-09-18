import { EpisodeSchema, type Channel, type Episode } from "@studio/shared";
import type { RepositoryService } from "../../repository.js";
import { getActiveStyleSnapshot } from "../../quiz/visual/styleModules/activation.js";

export async function pinEpisodeStyleRevision(repository: RepositoryService, channel: Channel, episode: Episode): Promise<Episode> {
  if (episode.quiz_config.style_catalog_revision) return episode;
  const next = EpisodeSchema.parse({
    ...episode,
    quiz_config: { ...episode.quiz_config, style_catalog_revision: getActiveStyleSnapshot().revision },
  });
  const writer = (repository as unknown as { writeJsonAtomic?: (target: string, value: unknown) => Promise<void> }).writeJsonAtomic;
  if (typeof writer === "function") {
    await writer.call(repository, repository.resolvePath("channels", channel.slug, "episodes", episode.slug, "episode.json"), next);
  }
  return next;
}
