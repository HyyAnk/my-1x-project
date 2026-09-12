import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { questionBankJobManager } from "../src/quiz/bank/questionBankJobManager.js";
import type { RepositoryService } from "../src/repository/service.js";
import type { LLMClient } from "../src/utils/promptSanitizer.js";

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
    const fakeLlmClient: LLMClient = {
      connect: () => Promise.resolve(),
      generateContent: () => Promise.resolve({ text: "[]" }),
    };

    const first = questionBankJobManager.startJob(mockRepo, {
      mode: "auto",
      count: 20,
      llmClient: fakeLlmClient,
    });

    expect(first.started).toBe(true);
    expect(questionBankJobManager.isJobRunning()).toBe(true);

    const second = questionBankJobManager.startJob(mockRepo, {
      mode: "auto",
      count: 20,
      llmClient: fakeLlmClient,
    });

    expect(second.started).toBe(false);
    expect(second.error).toContain("already running");
  });

  it("allows cancelling an active running job", () => {
    const fakeLlmClient: LLMClient = {
      connect: () => Promise.resolve(),
      generateContent: () => new Promise(() => {}), // never resolves
    };

    const first = questionBankJobManager.startJob(mockRepo, {
      mode: "auto",
      count: 40,
      llmClient: fakeLlmClient,
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
    const completedStatus = status as typeof status & { completedAt: string; status: "completed" };
    completedStatus.completedAt = new Date(Date.now() - 60_000).toISOString();
    completedStatus.status = "completed";

    // Calling getStatus should auto-expire to idle
    const refreshed = questionBankJobManager.getStatus();
    expect(refreshed.status).toBe("idle");
  });

  it("tracks failedChunksCount and errorSummary in job state upon partial chunk failures", async () => {
    questionBankJobManager.cancelJob();
    const mockRepoWithQuery = {
      queryQuestionBankQuestions: () => Promise.resolve({ questions: [], total: 0 }),
      saveQuestionBankQuestion: (q: unknown) => Promise.resolve(q),
    } as unknown as RepositoryService;

    let callCount = 0;
    const mockLlmClient: LLMClient = {
      connect: () => Promise.resolve(),
      generateContent: () => {
        callCount++;
        // Chunk 2 fails on calls 2, 3, 4
        if (callCount >= 2 && callCount <= 4) {
          throw new Error("Temporary provider outage for chunk 2");
        }
        return Promise.resolve({
          text: JSON.stringify([
            {
              entity_id: `ENT-JOB-${callCount}`,
              question: `Valid question ${callCount}?`,
              format: "multiple_choice",
              choices: [
                { id: "A", text: "Alpha", is_correct: true },
                { id: "B", text: "Beta", is_correct: false },
              ],
              correct_choice_id: "A",
              explanation: "Explanation.",
              visual_spec: { intent: "none" },
              difficulty: 1,
              thinking_seconds: 5,
              tags: ["test"],
            },
          ]),
        });
      },
    };

    const launched = questionBankJobManager.startJob(mockRepoWithQuery, {
      mode: "auto",
      count: 40, // 2 chunks of 20
      concurrency: 1,
      persist: false,
      llmClient: mockLlmClient,
      retryAttempts: 3,
      retryBaseDelayMs: 5,
    });

    expect(launched.started).toBe(true);

    // Poll until completed
    const deadline = Date.now() + 5000;
    let finalJob = questionBankJobManager.getStatus();
    while (finalJob.status === "running" && Date.now() < deadline) {
      await new Promise((res) => setTimeout(res, 20));
      finalJob = questionBankJobManager.getStatus();
    }

    expect(finalJob.status).toBe("completed");
    expect(finalJob.failedChunksCount).toBe(1);
    expect(finalJob.failedChunks?.length).toBe(1);
    expect(finalJob.failedChunks?.[0].error).toContain("Temporary provider outage for chunk 2");
    expect(finalJob.errorSummary).toContain("1 of 2 chunk(s) encountered failures");
    expect(finalJob.progress.failedChunksCount).toBe(1);
    expect(finalJob.progress.completedCount).toBeGreaterThanOrEqual(1);
  });
});
