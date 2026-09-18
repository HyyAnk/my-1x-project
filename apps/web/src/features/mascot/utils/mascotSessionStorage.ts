/**
 * Session storage helpers for tracking mascot batch generation notifications.
 * Ensures notifications are shown once per session even across page reloads.
 */

const ACK_SESSION_KEY_PREFIX = "studio_mascot_ack_batch_";
const DEFAULT_MAX_CATCH_UP_AGE_MS = 10 * 60 * 1000; // 10 minutes

// In-memory fallback for environments without sessionStorage (e.g., SSR or strict test environments)
const inMemoryAcknowledgedBatches = new Set<string>();

/**
 * Checks whether a given batch ID has already been acknowledged in this browser session.
 */
export function isBatchAcknowledgedInSession(batchId: string): boolean {
  if (!batchId) return true;
  if (inMemoryAcknowledgedBatches.has(batchId)) {
    return true;
  }
  try {
    if (typeof window !== "undefined" && window.sessionStorage) {
      return window.sessionStorage.getItem(`${ACK_SESSION_KEY_PREFIX}${batchId}`) === "true";
    }
  } catch {
    // Non-fatal: storage access might be restricted
  }
  return false;
}

/**
 * Marks a batch ID as acknowledged in the current session so it won't prompt again.
 */
export function acknowledgeBatchInSession(batchId: string): void {
  if (!batchId) return;
  inMemoryAcknowledgedBatches.add(batchId);
  try {
    if (typeof window !== "undefined" && window.sessionStorage) {
      window.sessionStorage.setItem(`${ACK_SESSION_KEY_PREFIX}${batchId}`, "true");
    }
  } catch {
    // Non-fatal: storage access might be restricted
  }
}

/**
 * Clears all batch acknowledgments from memory and session storage (useful for testing).
 */
export function clearBatchSessionAcknowledgements(): void {
  inMemoryAcknowledgedBatches.clear();
  try {
    if (typeof window !== "undefined" && window.sessionStorage) {
      const keysToRemove: string[] = [];
      for (let i = 0; i < window.sessionStorage.length; i++) {
        const key = window.sessionStorage.key(i);
        if (key && key.startsWith(ACK_SESSION_KEY_PREFIX)) {
          keysToRemove.push(key);
        }
      }
      for (const key of keysToRemove) {
        window.sessionStorage.removeItem(key);
      }
    }
  } catch {
    // Non-fatal
  }
}

/**
 * Determines if a batch timestamp was within the recent catch-up time window.
 */
export function isBatchRecent(timestamp: string | null | undefined, maxAgeMs: number = DEFAULT_MAX_CATCH_UP_AGE_MS): boolean {
  if (!timestamp) return false;
  const time = new Date(timestamp).getTime();
  if (isNaN(time)) return false;
  const age = Date.now() - time;
  // Allow slight clock drift (up to 1 minute in the future) and within maxAgeMs
  return age >= -60000 && age <= maxAgeMs;
}
