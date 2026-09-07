const mascotWriteLocks = new Map<string, Promise<void>>();

/**
 * Serializes read-modify-write cycles on a mascot profile. The lock is NOT
 * re-entrant: never call a locked repository helper from inside an operation.
 */
export async function withMascotWriteLock<T>(mascotId: string, operation: () => Promise<T>): Promise<T> {
  const previous = mascotWriteLocks.get(mascotId) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  mascotWriteLocks.set(
    mascotId,
    previous.then(() => current),
  );
  await previous;
  try {
    return await operation();
  } finally {
    release();
    if (mascotWriteLocks.get(mascotId) === current) mascotWriteLocks.delete(mascotId);
  }
}
