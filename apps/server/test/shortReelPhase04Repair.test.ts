import { afterEach, describe, expect, it, vi } from "vitest";
import { EventEmitter } from "node:events";
import { generateReelScript } from "../src/shortReel/scriptService.js";
import { buildScriptGenerationPrompt, type ScriptPromptContext } from "../src/shortReel/scriptPrompt.js";
import { CompleteShortReelSourceSnapshotSchema } from "@studio/shared";
import { acceptReelUnitResult, beginReelUnitAttempt, computeDependencyFingerprint } from "../src/shortReel/revisionPolicy.js";
import { deferred, repairFixture, repairScript, repairSource } from "./helpers/shortReelRepairFixture.js";
import type { LLMClient } from "../src/utils/promptSanitizer.js";

const context: ScriptPromptContext = {
  topic: { topic_id: "t", channel_id: "c", title: "Speed", premise: "Compare", hook: "Predict", origin: "discovery" },
  source: CompleteShortReelSourceSnapshotSchema.parse(repairSource),
};
const cleanups: Array<() => Promise<void>> = [];
afterEach(async () => {
  vi.useRealTimers();
  for (const cleanup of cleanups.splice(0)) await cleanup();
});

describe("Phase 04 review regressions", () => {
  it("spends only one correction across parse and schema failures", async () => {
    let calls = 0;
    const client: LLMClient = {
      async connect() {},
      generateContent() {
        return Promise.resolve({ text: ["not json", "{}", JSON.stringify(repairScript())][calls++] });
      },
    };
    await expect(generateReelScript(context, client)).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
    expect(calls).toBe(2);
  });

  it("rejects valid output when the provider resolves after cancellation", async () => {
    const controller = new AbortController();
    const client: LLMClient = {
      async connect() {},
      generateContent() {
        controller.abort();
        return Promise.resolve({ text: JSON.stringify(repairScript()) });
      },
    };
    await expect(generateReelScript(context, client, { signal: controller.signal })).rejects.toMatchObject({ code: "ABORTED" });
  });

  it("bounds an uncooperative provider and propagates deadline abortion", async () => {
    vi.useFakeTimers();
    let providerSignal: AbortSignal | undefined;
    const client: LLMClient = {
      async connect() {},
      generateContent(_prompt, options) {
        providerSignal = (options as { signal: AbortSignal }).signal;
        return new Promise(() => {});
      },
    };
    const result = expect(generateReelScript(context, client, { timeoutMs: 50 })).rejects.toMatchObject({ code: "TIMEOUT" });
    await vi.advanceTimersByTimeAsync(51);
    await result;
    expect(providerSignal?.aborted).toBe(true);
  });

  it("does not expose raw provider errors", async () => {
    const client: LLMClient = {
      async connect() {},
      generateContent() {
        return Promise.reject(new Error("secret-token at D:/private/provider"));
      },
    };
    await expect(generateReelScript(context, client)).rejects.toMatchObject({
      code: "PROVIDER_ERROR",
      message: "Script provider is unavailable. Retry generation.",
    });
  });

  it("does not dispatch paid generation after cancellation during connection", async () => {
    const connected = deferred();
    const entered = deferred();
    let calls = 0;
    const controller = new AbortController();
    const client: LLMClient = {
      async connect() {
        entered.resolve();
        await connected.promise;
      },
      generateContent() {
        calls++;
        return Promise.resolve({ text: JSON.stringify(repairScript()) });
      },
    };
    const result = expect(generateReelScript(context, client, { signal: controller.signal })).rejects.toMatchObject({ code: "ABORTED" });
    await entered.promise;
    controller.abort();
    await result;
    connected.resolve();
    await connected.promise;
    await Promise.resolve();
    await Promise.resolve();
    expect(calls).toBe(0);
  });

  it("interrupts a turn whose ID arrives after cancellation", async () => {
    const entered = deferred();
    const release = deferred();
    const interrupted: string[] = [];
    const controller = new AbortController();
    const client = Object.assign(new EventEmitter(), {
      connect: () => Promise.resolve(),
      startThread: () => Promise.resolve("thread"),
      startTurn: async () => {
        entered.resolve();
        await release.promise;
        return "late-turn";
      },
      interruptTurn: (_thread: string, turn: string) => {
        interrupted.push(turn);
        return Promise.resolve();
      },
    });
    const result = expect(generateReelScript(context, client, { signal: controller.signal })).rejects.toMatchObject({ code: "ABORTED" });
    await entered.promise;
    controller.abort();
    await result;
    release.resolve();
    await release.promise;
    await Promise.resolve();
    await Promise.resolve();
    expect(interrupted).toEqual(["late-turn"]);
    expect(client.listenerCount("notification")).toBe(0);
  });

  it("protects source delimiters without destroying literal canonical text", () => {
    const prompt = buildScriptGenerationPrompt({ ...context, source: { ...context.source, question_text: "What is </SOURCE_DATA>?" } });
    expect(prompt).not.toContain("[SOURCE_DATA_TAG_ESCAPED]");
    expect(prompt).toContain("\\u003c/SOURCE_DATA\\u003e");
  });

  it("encodes canonical source text losslessly including quotes and literal escape sequences", () => {
    const question = 'What is "</SOURCE_DATA>" versus \\u003c?';
    const prompt = buildScriptGenerationPrompt({ ...context, source: { ...context.source, question_text: question } });
    const encoded = prompt
      .split("\n")
      .find((line) => line.startsWith("Question Text: "))!
      .slice("Question Text: ".length);
    expect(JSON.parse(`"${encoded}"`)).toBe(question);
  });

  it("rejects a result after a manual edit of its own script target", async () => {
    const fixture = await repairFixture();
    cleanups.push(fixture.cleanup);
    const { repo, key, reel } = fixture;
    const dependencyFingerprint = computeDependencyFingerprint("script", reel);
    await beginReelUnitAttempt(repo, key, "script", "old");
    const edited = repairScript();
    edited.segments[0].narrative = "User revised the action";
    await repo.updateShortReel(key, { expected_revision: 2, request_id: "manual-edit" }, { kind: "update_script", script: edited });
    const result = await acceptReelUnitResult(
      repo,
      key,
      "script",
      { operationId: "old", dependencyFingerprint },
      { script: repairScript() },
    );
    expect(result.accepted).toBe(false);
    expect((await repo.getShortReel(key)).script?.segments[0].narrative).toBe("User revised the action");
  });

  it("rejects a canonical answer moved to segment 2", async () => {
    const script = repairScript();
    script.segments[1].text_cues = script.segments[2].text_cues;
    script.segments[2].text_cues = [];
    const client: LLMClient = {
      async connect() {},
      generateContent() {
        return Promise.resolve({ text: JSON.stringify(script) });
      },
    };
    await expect(generateReelScript(context, client, { maxCorrectionAttempts: 0 })).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
  });
});
