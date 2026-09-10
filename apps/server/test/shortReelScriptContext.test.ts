import { describe, it, expect, vi, afterEach } from "vitest";
import { buildScriptGenerationPrompt } from "../src/shortReel/scriptPrompt.js";
import { generateReelScriptUnit } from "../src/shortReel/packageService.js";
import { generateReelScript, ScriptGenerationError } from "../src/shortReel/scriptService.js";
import { packageFixture } from "./helpers/shortReelPackageFixture.js";
import { repairScript, repairSource } from "./helpers/shortReelRepairFixture.js";
import type { LLMClient } from "../src/utils/promptSanitizer.js";

const cleanups: Array<() => Promise<void>> = [];

afterEach(async () => {
  vi.useRealTimers();
  while (cleanups.length > 0) {
    const fn = cleanups.pop();
    if (fn) await fn();
  }
});

describe("Short-Reel Script Context and Failure Semantics (Phase 03 / S01-S03)", () => {
  it("S01: script prompt builder includes selected mascot name and art direction", () => {
    const prompt = buildScriptGenerationPrompt({
      topic: { topic_id: "t1", topic_title: "Cheetah vs Greyhound" },
      source: repairSource,
      mascotName: "Professor Whiskers",
      artDirection: "Hyper-realistic Claymation with warm volumetric light",
    });

    expect(prompt).toContain("Professor Whiskers");
    expect(prompt).toContain("Hyper-realistic Claymation with warm volumetric light");
    expect(prompt).toContain(repairSource.question_text);
    expect(prompt).toContain(repairSource.selected_answer_text);
  });

  it("S02: absent LLM leaves script unit failed with no fake accepted replacement", async () => {
    const f = await packageFixture();
    cleanups.push(f.cleanup);

    // Call generateReelScriptUnit without an LLM client
    await expect(generateReelScriptUnit(f.repo, f.key, "script-no-llm")).rejects.toThrow(ScriptGenerationError);

    const record = await f.repo.getShortReel(f.key);
    // Verified: script was NOT accepted as ready, and no fake script is attached
    expect(record.units.script.state).toBe("failed");
    expect(record.units.script.last_accepted_payload).toBeNull();
    expect(record.script).toBeNull();
    expect(record.units.script.current_attempt?.error).toBe("PROVIDER_ERROR");
  });

  it("S02: LLM failure preserves existing accepted script and marks attempt failed without fake replacement", async () => {
    const f = await packageFixture();
    cleanups.push(f.cleanup);

    // First accept an initial valid script
    const initialScript = repairScript();
    await f.repo.updateShortReel(
      f.key,
      { expected_revision: 1, request_id: "init-script" },
      { kind: "update_script", script: initialScript },
    );

    const failingClient: LLMClient = {
      async connect() {},
      generateContent: vi.fn().mockRejectedValue(new Error("LLM provider unavailable 503")),
    };

    await expect(generateReelScriptUnit(f.repo, f.key, "script-retry-fail", failingClient)).rejects.toThrow(ScriptGenerationError);

    const record = await f.repo.getShortReel(f.key);
    // Verified: existing script is NOT overwritten with baseline; previous script preserved
    expect(record.script?.segments[0].narrative).toBe(initialScript.segments[0].narrative);
    expect(record.units.script.state).toBe("failed");
    expect(record.units.script.current_attempt?.error).toBe("PROVIDER_ERROR");
  });

  it("S03: 90000 ms default deadline operates at scriptService boundary under fake timers", async () => {
    vi.useFakeTimers();

    const slowClient: LLMClient = {
      async connect() {},
      generateContent: vi.fn(() => new Promise(() => {})),
    };

    const scriptPromise = generateReelScript(
      {
        topic: { topic_id: "t1", topic_title: "Test" },
        source: repairSource,
      },
      slowClient,
    );

    const timeoutExpectation = expect(scriptPromise).rejects.toMatchObject({
      code: "TIMEOUT",
    });

    // Advance to 89,999 ms - should still be pending
    await vi.advanceTimersByTimeAsync(89_999);

    // Advance 2 more ms to cross 90,000 ms
    await vi.advanceTimersByTimeAsync(2);

    await timeoutExpectation;
  });

  it("S03: shorter caller deadline (e.g. 5000 ms) fails deterministically", async () => {
    vi.useFakeTimers();

    const slowClient: LLMClient = {
      async connect() {},
      generateContent: vi.fn(() => new Promise(() => {})),
    };

    const scriptPromise = generateReelScript(
      {
        topic: { topic_id: "t1", topic_title: "Test" },
        source: repairSource,
      },
      slowClient,
      { timeoutMs: 5_000 },
    );

    const timeoutExpectation = expect(scriptPromise).rejects.toMatchObject({
      code: "TIMEOUT",
    });

    await vi.advanceTimersByTimeAsync(5_001);
    await timeoutExpectation;
  });
});
