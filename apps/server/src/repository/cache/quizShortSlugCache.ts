/**
 * In-memory `quiz_short_id -> slug` index per channel so Quiz Short record lookups can read the
 * record file directly instead of scanning the `quiz_shorts` directory on every call.
 */
export class QuizShortSlugCache {
  private readonly idToSlug = new Map<string, string>();

  private key(channelId: string, quizShortId: string): string {
    return `${channelId}:${quizShortId}`;
  }

  get(channelId: string, quizShortId: string): string | undefined {
    return this.idToSlug.get(this.key(channelId, quizShortId));
  }

  set(channelId: string, quizShortId: string, slug: string): void {
    this.idToSlug.set(this.key(channelId, quizShortId), slug);
  }

  delete(channelId: string, quizShortId: string): void {
    this.idToSlug.delete(this.key(channelId, quizShortId));
  }

  clear(): void {
    this.idToSlug.clear();
  }
}
