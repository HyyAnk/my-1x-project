import type { Channel, CreateChannelInput } from "@studio/shared";

export interface IChannelRepository {
  listChannels(includeArchived?: boolean): Promise<Channel[]>;
  getChannel(channelId: string): Promise<Channel>;
  getChannelBySlug(slug: string): Promise<Channel>;
  readChannelBySlug(slug: string, forceDisk?: boolean): Promise<Channel>;
  createChannel(input: CreateChannelInput): Promise<Channel>;
  updateChannel(channelId: string, patch: Partial<Channel>): Promise<Channel>;
  deleteChannel(channelId: string, confirmed?: boolean): Promise<void>;
  safeEpisodeCount(channelDirectory: string): Promise<number>;
  getChannelDna(channelId: string): Promise<{ content: string; path: string; modified_at: string }>;
  saveChannelDna(channelId: string, content: string): Promise<{ path: string; modified_at: string }>;
  resetChannelDna(channelId: string): Promise<{ content: string; path: string; modified_at: string }>;
}
