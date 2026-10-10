import type { TopicSourceShortage } from "@studio/shared";
import type { AllocatedSlot } from "./bankTopicAllocation.types.js";

export interface TopicRunTargetCounts {
  episode: number;
  quizShort: number;
  shortReel: number;
}

function countKind(items: ReadonlyArray<string>, kind: string): number {
  return items.filter((item) => item === kind).length;
}

export function resolveTopicRunTargetCounts(
  allocatedSlots: ReadonlyArray<Pick<AllocatedSlot, "contentKind">>,
  shortages: ReadonlyArray<Pick<TopicSourceShortage, "content_kind">>,
): TopicRunTargetCounts {
  const slotKinds = allocatedSlots.map((slot) => slot.contentKind);
  const shortageKinds = shortages.map((shortage) => shortage.content_kind);

  return {
    episode: countKind(slotKinds, "episode") + countKind(shortageKinds, "episode"),
    quizShort: countKind(slotKinds, "quiz_short") + countKind(shortageKinds, "quiz_short"),
    shortReel: countKind(slotKinds, "short_reel") + countKind(shortageKinds, "short_reel"),
  };
}
