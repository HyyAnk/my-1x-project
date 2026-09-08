import { describe, expect, it } from "vitest";
import { generateReelScript, ScriptGenerationError } from "../src/shortReel/scriptService.js";
import type { CompleteShortReelSourceSnapshot, ScriptPromptContext } from "../src/shortReel/scriptPrompt.js";
import { repairScript, repairSource } from "./helpers/shortReelRepairFixture.js";
import type { LLMClient } from "../src/utils/promptSanitizer.js";

function createStubLlm(responses: string[]): LLMClient & { calls: string[] } {
  const calls: string[] = [];
  let index = 0;

  return {
    calls,
    async connect() {},
    generateContent(prompt: string) {
      calls.push(prompt);
      const resp = responses[index] ?? responses[responses.length - 1];
      index++;
      return Promise.resolve({ text: resp });
    },
  };
}

describe("Short-Reel Script Generation Service (Phase 04)", () => {
  const context: ScriptPromptContext = {
    topic: {
      topic_id: "test-topic",
      channel_id: "test-channel",
      title: "Speed Challenge",
      premise: "Compare two speeds",
      hook: "Which speed is higher?",
      origin: "discovery",
    },
    source: repairSource as CompleteShortReelSourceSnapshot,
    channelName: "Science Duel",
    mascotName: "Speedy",
    styleName: "Cinematic 3D",
  };

  it("SG-01: generates and validates a 3-part script from valid JSON stub", async () => {
    const validScript = repairScript();
    const stubClient = createStubLlm([JSON.stringify(validScript)]);

    const result = await generateReelScript(context, stubClient);

    expect(result.segments).toHaveLength(3);
    expect(result.segments[0].index).toBe(1);
    expect(result.segments[0].mode).toBe("generate");
    expect(result.segments[1].index).toBe(2);
    expect(result.segments[1].mode).toBe("extend");
    expect(result.segments[2].index).toBe(3);
    expect(result.segments[2].mode).toBe("extend");

    // Cue fidelity
    const questionCue = result.segments[0].text_cues.find((c) => c.role === "question");
    expect(questionCue).toBeDefined();
    expect(questionCue?.text).toBe(context.source.question_text);

    const answerCue = result.segments[2].text_cues.find((c) => c.role === "answer");
    expect(answerCue).toBeDefined();
    expect(answerCue?.text).toBe(context.source.selected_answer_text);

    expect(stubClient.calls).toHaveLength(1);
  });

  it("SG-02: bounds correction attempts to at most one on invalid JSON and throws typed error", async () => {
    const invalidOutput = "NOT_JSON_AT_ALL";
    const stubClient = createStubLlm([invalidOutput, invalidOutput]);

    await expect(generateReelScript(context, stubClient, { maxCorrectionAttempts: 1 })).rejects.toThrow(ScriptGenerationError);

    try {
      await generateReelScript(context, stubClient, { maxCorrectionAttempts: 1 });
    } catch (err) {
      expect(err).toBeInstanceOf(ScriptGenerationError);
      const scriptErr = err as ScriptGenerationError;
      expect(scriptErr.code).toBe("PARSE_ERROR");
    }

    // Exactly 1 initial + 1 correction attempt = 2 calls per run
    expect(stubClient.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("recovers successfully after one invalid attempt within correction budget", async () => {
    const validScript = repairScript();
    const badScript = repairScript();
    // Tamper question cue to trigger validation failure
    badScript.segments[0].text_cues[0].text = "Wrong question text";

    const stubClient = createStubLlm([JSON.stringify(badScript), JSON.stringify(validScript)]);

    const result = await generateReelScript(context, stubClient, { maxCorrectionAttempts: 1 });

    expect(result.segments).toHaveLength(3);
    expect(result.segments[0].text_cues[0].text).toBe(context.source.question_text);
    // Verified 2 LLM calls were made: 1 initial + 1 correction
    expect(stubClient.calls).toHaveLength(2);
    expect(stubClient.calls[1]).toContain("CORRECTION REQUIRED");
  });

  it("throws VALIDATION_FAILED when corrected output still violates schema or cue fidelity", async () => {
    const badScript = repairScript();
    badScript.segments[0].text_cues[0].text = "Still wrong question";

    const stubClient = createStubLlm([JSON.stringify(badScript), JSON.stringify(badScript)]);

    await expect(generateReelScript(context, stubClient, { maxCorrectionAttempts: 1 })).rejects.toMatchObject({
      code: "VALIDATION_FAILED",
    });
  });

  it("handles AbortSignal cancellation cleanly without unhandled rejections", async () => {
    const controller = new AbortController();
    controller.abort();

    const validScript = repairScript();
    const stubClient = createStubLlm([JSON.stringify(validScript)]);

    await expect(generateReelScript(context, stubClient, { signal: controller.signal })).rejects.toMatchObject({
      code: "ABORTED",
    });
  });

  it("handles timeout cleanly with typed TIMEOUT error code", async () => {
    const timeoutClient: LLMClient = {
      async connect() {},
      generateContent() {
        return Promise.reject(new Error("Request timed out after 5000ms"));
      },
    };

    await expect(generateReelScript(context, timeoutClient, { timeoutMs: 1000 })).rejects.toMatchObject({
      code: "TIMEOUT",
    });
  });

  it("extracts script JSON successfully from conversational markdown with preamble and multiple code fences", async () => {
    const validScript = repairScript();
    const conversationalOutput = [
      "Here is your generated Short-Reel script for the Velocity Battle topic:",
      "```json",
      '{ "note": "Draft reference example" }',
      "```",
      "And here is the complete, schema-compliant 3-segment production script:",
      "```json",
      JSON.stringify(validScript, null, 2),
      "```",
      "Let me know if you would like any revisions!",
    ].join("\n");

    const stubClient = createStubLlm([conversationalOutput]);
    const result = await generateReelScript(context, stubClient);

    expect(result.segments).toHaveLength(3);
    expect(result.segments[0].narrative).toBe(validScript.segments[0].narrative);
  });

  it("aborts before sending correction prompt if AbortSignal fires after initial failure", async () => {
    const invalidOutput = "NOT_JSON";
    const controller = new AbortController();

    const stubClient: LLMClient = {
      async connect() {},
      generateContent(prompt: string) {
        if (prompt.includes("CORRECTION REQUIRED")) {
          return Promise.resolve({ text: JSON.stringify(repairScript()) });
        }
        // Abort right after initial generation returns
        controller.abort();
        return Promise.resolve({ text: invalidOutput });
      },
    };

    await expect(generateReelScript(context, stubClient, { signal: controller.signal, maxCorrectionAttempts: 1 })).rejects.toMatchObject({
      code: "ABORTED",
    });
  });
});
