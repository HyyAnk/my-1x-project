/**
 * Rate Limit Error Detector
 * Utility functions and patterns to detect HTTP 429 and RESOURCE_EXHAUSTED responses.
 */

const RATE_LIMIT_PATTERN = /(?:429|resource.*exhausted|rate[_\s]?limit|too many requests|quota|throttl)/i;

/**
 * Detects whether an unknown error represents a rate limit (HTTP 429, RESOURCE_EXHAUSTED, etc.).
 */
export function isRateLimitError(error: unknown): boolean {
  if (!error) return false;
  if (typeof error === "object") {
    const err = error as Record<string, unknown>;
    if (err.status === 429 || err.statusCode === 429 || err.code === 429) {
      return true;
    }
    if (err.code === "RESOURCE_EXHAUSTED" || err.code === "RATE_LIMIT_EXCEEDED") {
      return true;
    }
  }
  let message = "";
  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === "string") {
    message = error;
  } else if (typeof error === "object") {
    try {
      message = JSON.stringify(error);
    } catch {
      message = "";
    }
  }
  return RATE_LIMIT_PATTERN.test(message);
}
