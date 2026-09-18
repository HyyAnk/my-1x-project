import { beforeEach, describe, expect, it } from "vitest";
import {
  isBatchAcknowledgedInSession,
  acknowledgeBatchInSession,
  clearBatchSessionAcknowledgements,
  isBatchRecent,
} from "./mascotSessionStorage";

describe("mascotSessionStorage", () => {
  beforeEach(() => {
    clearBatchSessionAcknowledgements();
  });

  it("identifies unacknowledged batch and acknowledges it in session", () => {
    const batchId = "batch_test_123";
    expect(isBatchAcknowledgedInSession(batchId)).toBe(false);

    acknowledgeBatchInSession(batchId);
    expect(isBatchAcknowledgedInSession(batchId)).toBe(true);
  });

  it("handles empty or falsy batch IDs gracefully", () => {
    expect(isBatchAcknowledgedInSession("")).toBe(true);
    acknowledgeBatchInSession("");
  });

  it("clears acknowledgments properly", () => {
    const batchId = "batch_clear_test";
    acknowledgeBatchInSession(batchId);
    expect(isBatchAcknowledgedInSession(batchId)).toBe(true);

    clearBatchSessionAcknowledgements();
    expect(isBatchAcknowledgedInSession(batchId)).toBe(false);
  });

  it("determines if a batch timestamp is recent within maxAge window", () => {
    const now = Date.now();
    const twoMinutesAgo = new Date(now - 2 * 60 * 1000).toISOString();
    const fifteenMinutesAgo = new Date(now - 15 * 60 * 1000).toISOString();

    expect(isBatchRecent(twoMinutesAgo)).toBe(true);
    expect(isBatchRecent(fifteenMinutesAgo)).toBe(false);
    expect(isBatchRecent(null)).toBe(false);
    expect(isBatchRecent("invalid-date")).toBe(false);
  });
});
