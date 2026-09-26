import type { RepositoryService } from "../../repository.js";

const queues = new WeakMap<RepositoryService, Map<string, Promise<void>>>();

/** The channel manifest is shared by all episode exports, so serialize at channel scope. */
export function queueExportPackaging<T>(repository: RepositoryService, channelId: string, operation: () => Promise<T>): Promise<T> {
  let channels = queues.get(repository);
  if (!channels) queues.set(repository, (channels = new Map<string, Promise<void>>()));
  const current = (channels.get(channelId) ?? Promise.resolve()).then(operation);
  const tail = current.then(
    () => undefined,
    () => undefined,
  );
  channels.set(channelId, tail);
  return current.finally(() => {
    if (channels.get(channelId) === tail) channels.delete(channelId);
  });
}
