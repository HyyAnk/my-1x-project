/**
 * Mascot Slot Job Concurrency Mutex and Lock Helpers
 *
 * Ensures idempotent slot generation and serializes generation
 * of the exact same slot across concurrent workers or requests.
 */

/**
 * Builds a standardized mutex key for an individual mascot slot.
 */
export function buildSlotLockKey(mascotId: string, styleId: string, state: string, slotIndex: number): string {
  return `${mascotId}:${styleId}:${state}:${slotIndex}`;
}

/**
 * Manages in-memory mutual exclusion for active slot generation tasks.
 */
export class SlotJobMutex {
  private readonly locks = new Set<string>();

  /**
   * Attempts to acquire a lock for the specified slot key.
   * Returns true if the lock was acquired, false if it was already held.
   */
  public tryLock(key: string): boolean {
    if (this.locks.has(key)) {
      return false;
    }
    this.locks.add(key);
    return true;
  }

  /**
   * Releases the lock for the specified slot key.
   */
  public unlock(key: string): void {
    this.locks.delete(key);
  }

  /**
   * Checks whether a lock is currently active for the given slot key.
   */
  public isLocked(key: string): boolean {
    return this.locks.has(key);
  }

  /**
   * Returns a copy of all currently active slot lock keys.
   */
  public getActiveLocks(): string[] {
    return Array.from(this.locks);
  }

  /**
   * Clears all locks (used during teardown or reset).
   */
  public clear(): void {
    this.locks.clear();
  }
}
