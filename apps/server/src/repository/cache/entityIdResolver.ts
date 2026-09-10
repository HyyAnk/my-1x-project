export interface EntityResolverStats {
  episodesCount: number;
  shortReelsCount: number;
  channelsCount: number;
}

/**
 * EntityIdResolver maintains in-memory bidirectional indices between entity identifiers,
 * directory slugs, and topic keys to enable direct O(1) record lookups without filesystem scanning.
 */
export class EntityIdResolver {
  private readonly episodeIdToSlug = new Map<string, string>();
  private readonly slugToEpisodeId = new Map<string, string>();
  private readonly episodeIdToChannelId = new Map<string, string>();
  private readonly episodeTitles = new Map<string, string>();
  private readonly topicToReelId = new Map<string, string>();
  private readonly reelIdToTopic = new Map<string, string>();
  private readonly channelIdToSlug = new Map<string, string>();
  private readonly slugToChannelId = new Map<string, string>();

  private makeScopedKey(channelId: string, entityKey: string): string {
    return `${channelId}:${entityKey}`;
  }

  // --- Episode Resolution ---

  getEpisodeSlug(channelId: string, episodeId: string): string | undefined {
    return this.episodeIdToSlug.get(this.makeScopedKey(channelId, episodeId));
  }

  getEpisodeIdBySlug(channelId: string, slug: string): string | undefined {
    return this.slugToEpisodeId.get(this.makeScopedKey(channelId, slug));
  }

  getChannelIdByEpisodeId(episodeId: string): string | undefined {
    return this.episodeIdToChannelId.get(episodeId);
  }

  getEpisodeTitle(episodeId: string): string | undefined {
    return this.episodeTitles.get(episodeId);
  }

  setEpisodeTitle(episodeId: string, title: string): void {
    this.episodeTitles.set(episodeId, title);
  }

  setEpisodeSlug(channelId: string, episodeId: string, slug: string): void {
    const idKey = this.makeScopedKey(channelId, episodeId);
    const slugKey = this.makeScopedKey(channelId, slug);

    const existingSlug = this.episodeIdToSlug.get(idKey);
    if (existingSlug && existingSlug !== slug) {
      this.slugToEpisodeId.delete(this.makeScopedKey(channelId, existingSlug));
    }

    const existingId = this.slugToEpisodeId.get(slugKey);
    if (existingId && existingId !== episodeId) {
      this.episodeIdToSlug.delete(this.makeScopedKey(channelId, existingId));
    }

    this.episodeIdToSlug.set(idKey, slug);
    this.slugToEpisodeId.set(slugKey, episodeId);
    this.episodeIdToChannelId.set(episodeId, channelId);
  }

  deleteEpisode(channelId: string, episodeId: string): void {
    const idKey = this.makeScopedKey(channelId, episodeId);
    const slug = this.episodeIdToSlug.get(idKey);
    this.episodeIdToSlug.delete(idKey);
    this.episodeIdToChannelId.delete(episodeId);
    this.episodeTitles.delete(episodeId);
    if (slug) {
      this.slugToEpisodeId.delete(this.makeScopedKey(channelId, slug));
    }
  }

  deleteEpisodeBySlug(channelId: string, slug: string): void {
    const slugKey = this.makeScopedKey(channelId, slug);
    const episodeId = this.slugToEpisodeId.get(slugKey);
    this.slugToEpisodeId.delete(slugKey);
    if (episodeId) {
      this.episodeIdToSlug.delete(this.makeScopedKey(channelId, episodeId));
      this.episodeIdToChannelId.delete(episodeId);
      this.episodeTitles.delete(episodeId);
    }
  }

  clearEpisodesForChannel(channelId: string): void {
    const prefix = `${channelId}:`;
    for (const key of this.episodeIdToSlug.keys()) {
      if (key.startsWith(prefix)) {
        this.episodeIdToSlug.delete(key);
      }
    }
    for (const key of this.slugToEpisodeId.keys()) {
      if (key.startsWith(prefix)) {
        this.slugToEpisodeId.delete(key);
      }
    }
    for (const [epId, chId] of this.episodeIdToChannelId.entries()) {
      if (chId === channelId) {
        this.episodeIdToChannelId.delete(epId);
        this.episodeTitles.delete(epId);
      }
    }
  }

  // --- Short-Reel Resolution ---

  getShortReelIdByTopic(channelId: string, topicId: string): string | undefined {
    return this.topicToReelId.get(this.makeScopedKey(channelId, topicId));
  }

  getTopicIdByShortReelId(channelId: string, reelId: string): string | undefined {
    return this.reelIdToTopic.get(this.makeScopedKey(channelId, reelId));
  }

  setShortReelTopic(channelId: string, topicId: string, reelId: string): void {
    const topicKey = this.makeScopedKey(channelId, topicId);
    const reelKey = this.makeScopedKey(channelId, reelId);

    const existingReelId = this.topicToReelId.get(topicKey);
    if (existingReelId && existingReelId !== reelId) {
      this.reelIdToTopic.delete(this.makeScopedKey(channelId, existingReelId));
    }

    const existingTopicId = this.reelIdToTopic.get(reelKey);
    if (existingTopicId && existingTopicId !== topicId) {
      this.topicToReelId.delete(this.makeScopedKey(channelId, existingTopicId));
    }

    this.topicToReelId.set(topicKey, reelId);
    this.reelIdToTopic.set(reelKey, topicId);
  }

  deleteShortReel(channelId: string, reelId: string): void {
    const reelKey = this.makeScopedKey(channelId, reelId);
    const topicId = this.reelIdToTopic.get(reelKey);
    this.reelIdToTopic.delete(reelKey);
    if (topicId) {
      this.topicToReelId.delete(this.makeScopedKey(channelId, topicId));
    }
  }

  clearShortReelsForChannel(channelId: string): void {
    const prefix = `${channelId}:`;
    for (const key of this.topicToReelId.keys()) {
      if (key.startsWith(prefix)) {
        this.topicToReelId.delete(key);
      }
    }
    for (const key of this.reelIdToTopic.keys()) {
      if (key.startsWith(prefix)) {
        this.reelIdToTopic.delete(key);
      }
    }
  }

  // --- Channel Resolution ---

  getChannelSlug(channelId: string): string | undefined {
    return this.channelIdToSlug.get(channelId);
  }

  getChannelIdBySlug(slug: string): string | undefined {
    return this.slugToChannelId.get(slug);
  }

  setChannelSlug(channelId: string, slug: string): void {
    const existingSlug = this.channelIdToSlug.get(channelId);
    if (existingSlug && existingSlug !== slug) {
      this.slugToChannelId.delete(existingSlug);
    }
    const existingId = this.slugToChannelId.get(slug);
    if (existingId && existingId !== channelId) {
      this.channelIdToSlug.delete(existingId);
    }
    this.channelIdToSlug.set(channelId, slug);
    this.slugToChannelId.set(slug, channelId);
  }

  deleteChannel(channelId: string): void {
    const slug = this.channelIdToSlug.get(channelId);
    this.channelIdToSlug.delete(channelId);
    if (slug) {
      this.slugToChannelId.delete(slug);
    }
    this.clearEpisodesForChannel(channelId);
    this.clearShortReelsForChannel(channelId);
  }

  // --- State Lifecycle ---

  clear(): void {
    this.episodeIdToSlug.clear();
    this.slugToEpisodeId.clear();
    this.episodeIdToChannelId.clear();
    this.episodeTitles.clear();
    this.topicToReelId.clear();
    this.reelIdToTopic.clear();
    this.channelIdToSlug.clear();
    this.slugToChannelId.clear();
  }

  getStats(): EntityResolverStats {
    return {
      episodesCount: this.episodeIdToSlug.size,
      shortReelsCount: this.topicToReelId.size,
      channelsCount: this.channelIdToSlug.size,
    };
  }
}
