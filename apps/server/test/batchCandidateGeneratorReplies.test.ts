import { describe, expect, it, vi } from "vitest";
import { generateChunkCandidates } from "../src/quiz/bank/batch/services/batchCandidateGenerator.js";
import type { PlannedBatchChunk } from "../src/quiz/bank/matrix/types/matrixPlanner.types.js";
import type { LLMClient } from "../src/utils/promptSanitizer.js";

const chunk: PlannedBatchChunk = {
  chunkIndex: 0,
  totalChunks: 1,
  chunkSize: 2,
  domainId: "nature_animals",
  archetypeId: "verdict_yes_no",
  subtopicId: "marine_life",
  candidates: [],
};

function clientReplying(text: string): LLMClient {
  return {
    connect: vi.fn(() => Promise.resolve(undefined)),
    generateContent: vi.fn(() => Promise.resolve({ text })),
  } as unknown as LLMClient;
}

describe("batch candidate generator model replies", () => {
  it("treats a reply without a JSON array as a retryable failure", async () => {
    const llmClient = clientReplying("Sorry, I could not create questions this time.");
    await expect(generateChunkCandidates(chunk, { count: 2, llmClient }, [])).rejects.toThrow("EMPTY_CHUNK_OUTPUT");
  });

  it("treats a cut-off JSON array as a retryable failure", async () => {
    const llmClient = clientReplying('[{"question": "Can dolphins sleep with one eye open... Yes or No?", "choices": [');
    await expect(generateChunkCandidates(chunk, { count: 2, llmClient }, [])).rejects.toThrow("EMPTY_CHUNK_OUTPUT");
  });

  it("returns an empty list when the array is valid but every item fails validation", async () => {
    const llmClient = clientReplying('[{"question": "Too short"}]');
    await expect(generateChunkCandidates(chunk, { count: 2, llmClient }, [])).resolves.toEqual([]);
  });
});
