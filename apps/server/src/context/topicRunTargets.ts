import type { TopicSourceShortage } from "@studio/shared";
import type { AllocatedSlot } from "./bankTopicAllocation.types.js";

export interface TopicRunTargetCounts {
  episode: number;
  shortReel: number;
}

export function resolveTopicRunTargetCounts(
  allocatedSlots: ReadonlyArray<Pick<AllocatedSlot, "contentKind">>,
  shortages: ReadonlyArray<Pick<TopicSourceShortage, "content_kind">>,
): TopicRunTargetCounts {
  const episode = allocatedSlots.filter((slot) => slot.contentKind === "episode").length;
  const shortReel = allocatedSlots.length - episode;
  const missingEpisodes = shortages.filter((shortage) => shortage.content_kind === "episode").length;
  const missingShortReels = shortages.length - missingEpisodes;

  return {
    episode: episode + missingEpisodes,
    shortReel: shortReel + missingShortReels,
  };
}
