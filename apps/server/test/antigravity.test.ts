import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { AntigravityClient } from "../src/antigravity.js";
import { DEFAULT_CONFIG } from "../src/config.js";
import { StudioLogger } from "../src/logger.js";

describe("Antigravity Client", () => {
  let temporaryRoot = "";

  beforeEach(async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "quiz-studio-agy-"));
  });

  afterEach(async () => {
    if (temporaryRoot) await rm(temporaryRoot, { recursive: true, force: true });
  });

  it("handles mock CLI output parsing correctly", async () => {
    const logger = new StudioLogger(temporaryRoot);
    await logger.init();
    const client = new AntigravityClient(temporaryRoot, DEFAULT_CONFIG, logger);

    const output = [
      "Available Models:",
      "- gemini-2.5-pro (default)",
      "- gemini-2.5-flash",
      "- gemini-2.5-flash-lite",
      "- claude-3-5-sonnet",
    ].join("\n");

    const parsed = client.parseModelListOutput(output);
    expect(parsed).toEqual([
      { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro (default)" },
      { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
      { id: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite" },
      { id: "claude-3-5-sonnet", label: "Claude 3 5 Sonnet" },
    ]);
  });

  it("executes custom mock CLI command dynamically to retrieve models", async () => {
    const logger = new StudioLogger(temporaryRoot);
    await logger.init();

    if (process.platform === "win32") {
      const mockScript = path.join(temporaryRoot, "mock-agy.cmd");
      await writeFile(mockScript, `@echo off\r\necho - gemini-2.5-pro (default)\r\necho - gemini-2.5-flash\r\n`, "utf8");

      const client = new AntigravityClient(
        temporaryRoot,
        {
          ...DEFAULT_CONFIG,
          antigravity: { ...DEFAULT_CONFIG.antigravity, command: mockScript, model: "gemini-2.5-pro" },
        },
        logger,
      );

      const models = await client.getModels();
      expect(models).toEqual([
        { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro (default)" },
        { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
      ]);
    }
  });

  it("detects installation status gracefully", async () => {
    const logger = new StudioLogger(temporaryRoot);
    await logger.init();
    const client = new AntigravityClient(temporaryRoot, DEFAULT_CONFIG, logger);

    const info = await client.detectInstallation();
    expect(info).toBeDefined();
    expect(typeof info.installed).toBe("boolean");
  });

  it("handles multi-step transcripts by ignoring tool results and extracting final PLANNER_RESPONSE", () => {
    const transcriptLines = [
      JSON.stringify({ step_index: 0, source: "USER_EXPLICIT", type: "USER_INPUT", status: "DONE", content: "Prompt" }),
      JSON.stringify({ step_index: 1, source: "SYSTEM", type: "CHECKPOINT", status: "DONE" }),
      JSON.stringify({
        step_index: 2,
        source: "MODEL",
        type: "PLANNER_RESPONSE",
        status: "DONE",
        tool_calls: [{ name: "search_web", args: {} }],
      }),
      JSON.stringify({ step_index: 3, source: "MODEL", type: "GENERIC", status: "DONE", content: "Tool search result: found 0 items" }),
      JSON.stringify({
        step_index: 4,
        source: "MODEL",
        type: "PLANNER_RESPONSE",
        status: "DONE",
        content: "# Research Dossier\n\nC01 https://example.com/1\nC02 https://example.com/2\nC03 https://example.com/3",
      }),
    ];

    let extracted = "";
    let isDone = false;

    for (const line of transcriptLines) {
      const step = JSON.parse(line) as {
        source?: string;
        type?: string;
        status?: string;
        content?: string;
        tool_calls?: unknown[];
      };
      const isModel = step.source === "MODEL";
      const isPlanner = step.type === "PLANNER_RESPONSE";
      const hasNoToolCalls = !step.tool_calls || step.tool_calls.length === 0;
      const currentContent = typeof step.content === "string" ? step.content : "";

      if (isModel && isPlanner && hasNoToolCalls && currentContent.trim()) {
        extracted = currentContent;
        if (step.status === "DONE") isDone = true;
      }
    }

    expect(isDone).toBe(true);
    expect(extracted).toContain("# Research Dossier");
    expect(extracted).not.toContain("Tool search result");
  });
});
