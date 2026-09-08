import { reserveWriterOperation, resolveCanonicalStorageRoot } from "./shortReelWriterAdmission.js";

const queues = new Map<string, Promise<void>>();

export async function runInCanonicalShortReelQueue<T>(
  storageRoot: string,
  queueKey: string,
  task: () => Promise<T>,
  ownerId?: string,
): Promise<T> {
  const root = resolveCanonicalStorageRoot(storageRoot);
  const finish = reserveWriterOperation(root, ownerId);
  const key = `${root}::${queueKey}`;
  const previous = queues.get(key) ?? Promise.resolve();
  const work = previous.then(task);
  const tail = work.then(
    () => undefined,
    () => undefined,
  );
  queues.set(key, tail);
  try {
    return await work;
  } finally {
    if (queues.get(key) === tail) queues.delete(key);
    finish();
  }
}
