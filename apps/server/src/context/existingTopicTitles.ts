import type { TopicCandidate } from "@studio/shared";

/** Enough recent titles for the model to avoid repeats while keeping the topic prompt small and bounded. */
export const MAX_EXISTING_TOPIC_TITLES = 100;

/**
 * Returns the titles of the most recently generated topics, newest first, without duplicates.
 * Premises are left out: titles alone let the model steer away from repeats at a fraction of the prompt size.
 */
export function selectRecentTopicTitles(topics: readonly TopicCandidate[], limit = MAX_EXISTING_TOPIC_TITLES): string[] {
  const generatedAtMs = (topic: TopicCandidate) => Date.parse(topic.generated_at) || 0;
  const newestFirst = [...topics].sort((a, b) => generatedAtMs(b) - generatedAtMs(a));
  const titles = new Set<string>();
  for (const topic of newestFirst) {
    if (titles.size >= limit) break;
    const title = topic.title.trim();
    if (title) titles.add(title);
  }
  return [...titles];
}
