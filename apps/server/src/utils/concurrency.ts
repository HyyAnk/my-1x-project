/**
 * Runs tasks concurrently with a maximum concurrency limit, preserving result order.
 */
export async function runConcurrent<T, R>(
  items: readonly T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return [];
  const limit = Math.max(1, Math.min(concurrency, items.length));
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  const workers = Array.from({ length: limit }, async () => {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex++;
      results[currentIndex] = await fn(items[currentIndex], currentIndex);
    }
  });
  await Promise.all(workers);
  return results;
}

/**
 * Coalesces repeated runs of an expensive task per key: at most one run is active and at most one more is
 * queued behind it. Callers arriving while a run is active share the queued run, so every caller receives a
 * result computed after its call started, while bursts of requests never stack duplicate work.
 */
export function createCoalescingRunner<T>(): (key: string, task: () => Promise<T>) => Promise<T> {
  const active = new Map<string, Promise<T>>();
  const queued = new Map<string, Promise<T>>();
  const ignore = () => undefined;

  const start = (key: string, task: () => Promise<T>): Promise<T> => {
    const run: Promise<T> = task().finally(() => {
      if (active.get(key) === run) active.delete(key);
    });
    active.set(key, run);
    return run;
  };

  return (key, task) => {
    const waiting = queued.get(key);
    if (waiting) return waiting;
    const running = active.get(key);
    if (!running) return start(key, task);
    const next = running.then(ignore, ignore).then(() => {
      queued.delete(key);
      return start(key, task);
    });
    queued.set(key, next);
    return next;
  };
}
