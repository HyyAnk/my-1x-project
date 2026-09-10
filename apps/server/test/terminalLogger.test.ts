import { describe, expect, it } from "vitest";
import { Writable } from "node:stream";
import { log, logStartupSummary, logFinalSummary } from "../../../scripts/lib/terminalLogger.mjs";

class MemoryStream extends Writable {
  lines: string[] = [];
  isTTY = false;

  _write(chunk: Buffer | string, _encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
    this.lines.push(chunk.toString());
    callback();
  }

  getOutput(): string {
    return this.lines.join("");
  }
}

describe("Terminal Logger (scripts/lib/terminalLogger.mjs)", () => {
  it("formats messages with timestamp, level, and step in non-TTY mode without ANSI codes", () => {
    const stream = new MemoryStream();
    stream.isTTY = false;

    log("INFO", "Starting execution", { step: "INIT", stream });

    const output = stream.getOutput();
    expect(output).toContain("[INFO]");
    expect(output).toContain("[STEP:INIT]");
    expect(output).toContain("Starting execution");
    // Should NOT contain ANSI escape codes
    expect(output).not.toMatch(/\u001b\[\d+m/);
    // Should contain valid ISO timestamp
    expect(output).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it("applies ANSI styles in TTY mode when NO_COLOR is not set", () => {
    const originalNoColor = process.env.NO_COLOR;
    delete process.env.NO_COLOR;
    try {
      const stream = new MemoryStream();
      stream.isTTY = true;

      log("OK", "Task finished successfully", { step: "DONE", stream });

      const output = stream.getOutput();
      expect(output).toContain("[OK]");
      expect(output).toContain("[STEP:DONE]");
      expect(output).toContain("Task finished successfully");
      // Must contain ANSI styling
      expect(output).toMatch(/\u001b\[\d+m/);
    } finally {
      if (originalNoColor !== undefined) {
        process.env.NO_COLOR = originalNoColor;
      }
    }
  });

  it("respects NO_COLOR even when TTY is true", () => {
    const originalNoColor = process.env.NO_COLOR;
    process.env.NO_COLOR = "1";
    try {
      const stream = new MemoryStream();
      stream.isTTY = true;

      log("WARN", "Warning condition", { step: "CHECK", stream });

      const output = stream.getOutput();
      expect(output).toContain("[WARN]");
      expect(output).not.toMatch(/\u001b\[\d+m/);
    } finally {
      if (originalNoColor !== undefined) {
        process.env.NO_COLOR = originalNoColor;
      } else {
        delete process.env.NO_COLOR;
      }
    }
  });

  it("logStartupSummary logs configuration while masking secrets", () => {
    const stream = new MemoryStream();
    stream.isTTY = false;

    logStartupSummary(
      {
        method: "HTTP API",
        executionMode: "dry-run",
        profileCount: 0,
        concurrency: 1,
        config: {
          archetype: "speed_blitz",
          domain: "nature_animals",
          api_key: "super-secret-token",
          authPassword: "hidden-password",
        },
      },
      stream,
    );

    const output = stream.getOutput();
    expect(output).toContain("Method: HTTP API");
    expect(output).toContain("Mode: dry-run");
    expect(output).toContain("Profiles: 0");
    expect(output).toContain("Concurrency: 1");
    expect(output).toContain("archetype=speed_blitz");
    expect(output).toContain("domain=nature_animals");
    // Secrets must NOT be logged
    expect(output).not.toContain("super-secret-token");
    expect(output).not.toContain("hidden-password");
  });

  it("logFinalSummary outputs correct execution metrics and summary tag", () => {
    const stream = new MemoryStream();
    stream.isTTY = false;

    logFinalSummary(
      {
        total: 10,
        success: 8,
        failed: 2,
        skipped: 0,
        retries: 1,
        elapsedMs: 1420,
      },
      stream,
    );

    const output = stream.getOutput();
    expect(output).toContain("[WARN]");
    expect(output).toContain("[STEP:COMPLETE]");
    expect(output).toContain("Total=10 Success=8 Failed=2 Skipped=0 Retries=1 Elapsed=1420ms");
  });
});
