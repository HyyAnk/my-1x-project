import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { questionBankJobManager } from "../src/quiz/bank/questionBankJobManager.js";
import type { RepositoryService } from "../src/repository/service.js";

describe("Question Bank Job Manager", () => {
  const mockRepo = {} as RepositoryService;

  beforeEach(() => {
    questionBankJobManager.cancelJob();
  });

  afterEach(() => {
    questionBankJobManager.cancelJob();
  });

  it("reports idle status when no job is active", () => {
    const status = questionBankJobManager.getStatus();
    expect(status).toBeDefined();
    expect(["idle", "completed", "cancelled"]).toContain(status.status);
  });

  it("prevents launching overlapping background jobs", () => {
    const fakeLlmClient = {
      modelName: "test-model",
      executePrompt: async () => "[]",
    };

    const first = questionBankJobManager.startJob(mockRepo, {
      mode: "auto",
      count: 20,
      llmClient: fakeLlmClient as any,
    });

    expect(first.started).toBe(true);
    expect(questionBankJobManager.isJobRunning()).toBe(true);

    const second = questionBankJobManager.startJob(mockRepo, {
      mode: "auto",
      count: 20,
      llmClient: fakeLlmClient as any,
    });

    expect(second.started).toBe(false);
    expect(second.error).toContain("already running");
  });

  it("allows cancelling an active running job", () => {
    const fakeLlmClient = {
      modelName: "test-model",
      executePrompt: async () => new Promise(() => {}), // never resolves
    };

    const first = questionBankJobManager.startJob(mockRepo, {
      mode: "auto",
      count: 40,
      llmClient: fakeLlmClient as any,
    });

    expect(first.started).toBe(true);
    const cancelled = questionBankJobManager.cancelJob();
    expect(cancelled).toBe(true);
    expect(questionBankJobManager.getStatus().status).toBe("cancelled");
    expect(questionBankJobManager.isJobRunning()).toBe(false);
  });

  it("supports dismissJob to manually reset job state to idle", () => {
    questionBankJobManager.cancelJob();
    const dismissed = questionBankJobManager.dismissJob();
    expect(dismissed).toBe(true);
    expect(questionBankJobManager.getStatus().status).toBe("idle");
  });

  it("auto-expires stale completed jobs older than 45 seconds", () => {
    questionBankJobManager.cancelJob();
    const status = questionBankJobManager.getStatus();
    // Simulate an ancient completedAt timestamp
    (status as any).completedAt = new Date(Date.now() - 60_000).toISOString();
    (status as any).status = "completed";

    // Calling getStatus should auto-expire to idle
    const refreshed = questionBankJobManager.getStatus();
    expect(refreshed.status).toBe("idle");
  });
});
