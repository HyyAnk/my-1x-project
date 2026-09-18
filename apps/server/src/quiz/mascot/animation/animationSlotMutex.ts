const slotLocks = new Map<string, Promise<void>>();

export function buildSlotLockKey(mascotId: string, styleId: string, state: string, slotIndex: number): string {
  return `${mascotId}:${styleId}:${state}:${slotIndex}`;
}

export function isSlotLocked(key: string): boolean {
  return slotLocks.has(key);
}

/**
 * Serializes execution on a specific animation slot to prevent race conditions
 * or overlapping generation runs on the exact same mascot, style, state, and slot.
 */
export async function withAnimationSlotLock<T>(key: string, operation: () => Promise<T>): Promise<T> {
  const previous = slotLocks.get(key) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });

  slotLocks.set(
    key,
    previous.then(() => current),
  );

  await previous;
  try {
    return await operation();
  } finally {
    release();
    if (slotLocks.get(key) === current) {
      slotLocks.delete(key);
    }
  }
}
