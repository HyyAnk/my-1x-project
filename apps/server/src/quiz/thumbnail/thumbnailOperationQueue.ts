import type { RepositoryService } from "../../repository.js";

const queues = new WeakMap<RepositoryService, Map<string, Promise<void>>>();

/** Automatic generation, manual generation and version selection share one manifest. */
export function queueThumbnailOperation<T>(
  repository: RepositoryService,
  channelId: string,
  episodeId: string,
  operation: () => Promise<T>,
): Promise<T> {
  let episodes = queues.get(repository);
  if (!episodes) queues.set(repository, (episodes = new Map<string, Promise<void>>()));
  const key = `${channelId}:${episodeId}`;
  const current = (episodes.get(key) ?? Promise.resolve()).then(operation);
  const tail = current.then(
    () => undefined,
    () => undefined,
  );
  episodes.set(key, tail);
  return current.finally(() => {
    if (episodes.get(key) === tail) episodes.delete(key);
  });
}
