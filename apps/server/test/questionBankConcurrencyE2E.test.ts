import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { RepositoryService } from "../src/repository/service.js";
import { questionBankJobManager } from "../src/quiz/bank/questionBankJobManager.js";
import type { LLMClient } from "../src/utils/promptSanitizer.js";

describe("QuestionBank Concurrency & Background Job E2E Stress Tests", () => {
  let tempDir: string;
  let repo: RepositoryService;
  const jobManager = questionBankJobManager;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "qb-concurrency-e2e-"));
    repo = new RepositoryService(tempDir);
    questionBankJobManager.cancelJob();
  });

  afterEach(async () => {
    questionBankJobManager.cancelJob();
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
  });

  it("executes 100-question batch across 5 concurrent workers in background job", async () => {
    let activeCalls = 0;
    let maxConcurrent = 0;
    let callCounter = 0;

    const distinctTemplates = [
      "Which animal is known for building complex dams in rivers?",
      "What European country is famous for the Eiffel Tower and baguette?",
      "How many total continents are recognized globally across planet Earth?",
      "What atomic gas makes up the largest percentage of atmospheric air?",
      "Which instrument in the orchestra produces the deepest bass notes?",
    ];

    const mockLlmClient: LLMClient = {
      connect: async () => {},
      generateContent: async () => {
        callCounter++;
        const id = callCounter;
        const qText = distinctTemplates[(id - 1) % distinctTemplates.length];

        activeCalls++;
        if (activeCalls > maxConcurrent) {
          maxConcurrent = activeCalls;
        }
        // Small delay to simulate LLM network latency and verify concurrent overlap
        await new Promise((res) => setTimeout(res, 35));
        activeCalls--;

        return {
          text: JSON.stringify([
            {
              entity_id: `ENT-E2E-00${id}`,
              question: qText,
              format: "multiple_choice",
              choices: [
                { id: "A", text: "Option Alpha", is_correct: true },
                { id: "B", text: "Option Beta", is_correct: false },
              ],
              correct_choice_id: "A",
              explanation: "Clear verified explanation for test purposes.",
              visual_spec: { intent: "none" },
              difficulty: 2,
              thinking_seconds: 5,
              tags: ["e2e"],
            },
          ]),
        };
      },
    };

    const startRes = jobManager.startJob(repo, {
      mode: "auto",
      count: 100,
      concurrency: 5,
      persist: false,
      llmClient: mockLlmClient,
    });

    expect(startRes.started).toBe(true);
    expect(startRes.job.status).toBe("running");
    expect(startRes.job.progress.totalChunks).toBe(5);

    // Poll until completed (with timeout protection)
    const startTime = Date.now();
    while (jobManager.getStatus().status === "running") {
      if (Date.now() - startTime > 10000) {
        throw new Error("Timeout waiting for 5-worker background job to complete");
      }
      await new Promise((res) => setTimeout(res, 20));
    }

    const finalStatus = jobManager.getStatus();
    expect(finalStatus.status).toBe("completed");
    expect(finalStatus.result).toBeDefined();
    expect(finalStatus.result?.requestedCount).toBe(100);

    // Verify 5 workers ran concurrently
    expect(maxConcurrent).toBeGreaterThanOrEqual(2);
    expect(finalStatus.progress.completedCount).toBe(5);
    expect(finalStatus.progress.currentChunk).toBe(5);
    expect(finalStatus.progress.totalChunks).toBe(5);
  });

  it("cancels 5-worker background job cleanly without dangling execution", async () => {
    let callCounter = 0;
    const mockLlmClient: LLMClient = {
      connect: async () => {},
      generateContent: async () => {
        callCounter++;
        await new Promise((res) => setTimeout(res, 40));
        return {
          text: JSON.stringify([
            {
              entity_id: `ENT-CANCEL-00${callCounter}`,
              question: `Sample question ${callCounter}?`,
              format: "multiple_choice",
              choices: [
                { id: "A", text: "A", is_correct: true },
                { id: "B", text: "B", is_correct: false },
              ],
              correct_choice_id: "A",
              explanation: "Explanation",
              visual_spec: { intent: "none" },
              difficulty: 1,
              thinking_seconds: 5,
              tags: ["cancel"],
            },
          ]),
        };
      },
    };

    // Start 200-question job (10 chunks) with concurrency = 3
    const startRes = jobManager.startJob(repo, {
      mode: "auto",
      count: 200,
      concurrency: 3,
      persist: false,
      llmClient: mockLlmClient,
    });

    expect(startRes.started).toBe(true);
    expect(jobManager.isJobRunning()).toBe(true);

    // Wait a brief moment for wave 1 to begin, then cancel
    await new Promise((res) => setTimeout(res, 15));
    const cancelRes = jobManager.cancelJob();

    expect(cancelRes).toBe(true);
    expect(jobManager.isJobRunning()).toBe(false);

    // Wait for in-flight wave to settle
    await new Promise((res) => setTimeout(res, 80));

    const finalStatus = jobManager.getStatus();
    expect(finalStatus.status).toBe("cancelled");
    // Should not have executed all 10 chunks
    expect(callCounter).toBeLessThan(10);
  });

  it("rejects concurrent job starts while a background batch is active", async () => {
    const mockLlmClient: LLMClient = {
      connect: async () => {},
      generateContent: async () => {
        await new Promise((res) => setTimeout(res, 150));
        return { text: "[]" };
      },
    };

    const firstJob = jobManager.startJob(repo, {
      mode: "auto",
      count: 40,
      concurrency: 2,
      persist: false,
      llmClient: mockLlmClient,
    });
    expect(firstJob.started).toBe(true);

    // Try starting a second job immediately
    const secondJob = jobManager.startJob(repo, {
      mode: "auto",
      count: 40,
      concurrency: 2,
      persist: false,
      llmClient: mockLlmClient,
    });

    expect(secondJob.started).toBe(false);
    expect(secondJob.error).toContain("already running");

    jobManager.cancelJob();
  });
});
