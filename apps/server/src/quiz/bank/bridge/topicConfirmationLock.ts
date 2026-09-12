/**
 * In-memory mutex locking mechanism ensuring concurrent confirmations
 * for the same topic serialize cleanly.
 */

const topicConfirmationLocks = new Map<string, Promise<unknown>>();

/**
 * Acquires a per-topic mutex lock and executes the provided action,
 * releasing the lock upon completion or rejection.
 */
export async function withTopicConfirmationLock<T>(
  channelId: string,
  topicId: string,
  action: () => Promise<T>,
): Promise<T> {
  const lockKey = `${channelId}:${topicId}`;

  while (topicConfirmationLocks.has(lockKey)) {
    try {
      await topicConfirmationLocks.get(lockKey);
    } catch {
      // Prior attempt errors do not block subsequent serial attempts.
    }
  }

  let releaseLock!: () => void;
  const lockPromise = new Promise<void>((resolve) => {
    releaseLock = resolve;
  });
  topicConfirmationLocks.set(lockKey, lockPromise);

  try {
    return await action();
  } finally {
    topicConfirmationLocks.delete(lockKey);
    releaseLock();
  }
}

/**
 * Checks whether a lock is currently active for the given channel and topic.
 */
export function isTopicConfirmationLocked(channelId: string, topicId: string): boolean {
  return topicConfirmationLocks.has(`${channelId}:${topicId}`);
}

/**
 * Resets all active locks. Intended primarily for testing teardown.
 */
export function clearAllTopicConfirmationLocks(): void {
  topicConfirmationLocks.clear();
}
