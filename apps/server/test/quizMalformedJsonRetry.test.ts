import { mkdtemp, readdir, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { ContextManifest, Task } from "@studio/shared";
import { StudioLogger } from "../src/logger.js";
import { completeWithOutput } from "../src/tasks/handlers/outputCompletionHandler.js";
import type { ActiveRun, TaskManagerRuntime } from "../src/tasks/runtime.js";
import { isMalformedJsonOutput } from "../src/tasks/validators.js";

const malformedOutput = '{\n  "questions": [\n    { "question": "Who was called "The Iron Lady"?" }\n  ]\n}';

async function createHarness(quizAttempts: number) {
  const root = await mkdtemp(path.join(os.tmpdir(), "quiz-malformed-json-"));
  const logger = new StudioLogger(root);
  logger.setRuntimeRoot(root);
  const runtime = {
    logger,
    retryQuiz: vi.fn(async () => undefined),
    finish: vi.fn(async () => undefined),
  } as unknown as TaskManagerRuntime;
  const active = {
    task: { task_id: "task_quiz_1", task_type: "GENERATE_QUIZ", channel_id: "ch_1", episode_id: "ep_1" } as Task,
    threadId: "thread_1",
    turnId: "turn_1",
    output: malformedOutput,
    manifest: { prompt: "Task type: GENERATE_QUIZ" } as ContextManifest,
    researchAttempts: 0,
    scriptAttempts: 0,
    visualBibleAttempts: 0,
    sequenceAttempts: 0,
    topicSuggestionAttempts: 0,
    quizAttempts,
  } satisfies ActiveRun;
  return { root, runtime, active };
}

describe("GENERATE_QUIZ malformed JSON handling", () => {
  it("recognizes malformed JSON failures from any parser context", () => {
    expect(isMalformedJsonOutput("QuizV2 JSON output malformed: Expected ':' after property name")).toBe(true);
    expect(isMalformedJsonOutput("Codex output did not contain JSON")).toBe(true);
    expect(isMalformedJsonOutput("Quiz script quality gate failed: missing questions")).toBe(false);
  });

  it("saves the raw output and retries once with a strict JSON prompt", async () => {
    const { root, runtime, active } = await createHarness(0);
    await completeWithOutput.call(runtime, active);

    expect(runtime.retryQuiz).toHaveBeenCalledTimes(1);
    expect(vi.mocked(runtime.retryQuiz).mock.calls[0][1]).toMatch(/^QuizV2 JSON output malformed/);
    expect(runtime.finish).not.toHaveBeenCalled();

    const rawDirectory = path.join(root, "logs", "raw-output");
    const [savedFile] = await readdir(rawDirectory);
    expect(savedFile).toContain("GENERATE_QUIZ-task_quiz_1");
    expect(await readFile(path.join(rawDirectory, savedFile), "utf8")).toBe(malformedOutput);
  });

  it("fails the task once the retry budget is spent", async () => {
    const { runtime, active } = await createHarness(1);
    await completeWithOutput.call(runtime, active);

    expect(runtime.retryQuiz).not.toHaveBeenCalled();
    expect(runtime.finish).toHaveBeenCalledWith("task_quiz_1", "FAILED", expect.stringMatching(/^QuizV2 JSON output malformed/));
  });
});
