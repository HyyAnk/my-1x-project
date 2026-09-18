import type {
  MutationContext,
  ReelKey,
  ShortReelEditCommand,
  ShortReelRecord,
  ShortReelSourceSnapshot,
  ShortReelTopicSnapshot,
} from "@studio/shared";

export interface IShortReelRepository {
  listShortReels(channelId: string): Promise<ShortReelRecord[]>;
  getShortReel(key: ReelKey): Promise<ShortReelRecord>;
  getShortReelByTopic(channelId: string, topicId: string): Promise<ShortReelRecord | null>;
  createShortReel(
    channelId: string,
    topic: ShortReelTopicSnapshot,
    source: ShortReelSourceSnapshot,
    requestId?: string,
    reelId?: string,
  ): Promise<ShortReelRecord>;
  updateShortReel(key: ReelKey, context: MutationContext, command: ShortReelEditCommand): Promise<ShortReelRecord>;
  deleteShortReel(key: ReelKey): Promise<boolean>;
}
