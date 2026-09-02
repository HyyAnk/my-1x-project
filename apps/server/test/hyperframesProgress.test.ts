import { describe, expect, it } from "vitest";
import { mapRenderTaskPercent, parseHyperframesProgress } from "../src/tasks/video/hyperframesProgress.js";

describe("hyperframesProgress", () => {
  it("parses a structured capture checkpoint and calculates ETA", () => {
    const sample = parseHyperframesProgress(
      '[Render:trace] {"phase":"capture_streaming","status":"checkpoint","framesCompleted":960,"totalFrames":3840,"workerCount":6,"stageElapsedMs":30000}',
    );

    expect(sample).toEqual({
      phase: "capture_streaming",
      framesCompleted: 960,
      totalFrames: 3840,
      workerCount: 6,
      elapsedMs: 30_000,
      etaSeconds: 90,
    });
    expect(mapRenderTaskPercent(sample!)).toBe(76.63);
  });

  it("parses fallback frame output with ANSI and carriage returns", () => {
    const sample = parseHyperframesProgress("\u001b[36mStreaming frame 2130/3840 (6 workers)\u001b[0m\r");

    expect(sample).toEqual({
      phase: "capture_streaming",
      framesCompleted: 2130,
      totalFrames: 3840,
      workerCount: 6,
      elapsedMs: null,
      etaSeconds: null,
    });
    expect(mapRenderTaskPercent(sample!)).toBe(81.65);

    const noWorkersSample = parseHyperframesProgress("Rendering frame 1200 / 3840");
    expect(noWorkersSample).toEqual({
      phase: "capture_streaming",
      framesCompleted: 1200,
      totalFrames: 3840,
      workerCount: 1,
      elapsedMs: null,
      etaSeconds: null,
    });
  });

  it("clamps inconsistent frame counters before mapping progress", () => {
    const sample = parseHyperframesProgress(
      '[Render:trace] {"phase":"capture_streaming","framesCompleted":4100,"totalFrames":3840,"workerCount":6,"stageElapsedMs":60000}',
    );

    expect(sample?.framesCompleted).toBe(3840);
    expect(sample?.etaSeconds).toBe(0);
    expect(mapRenderTaskPercent(sample!)).toBe(89);
  });

  it("ignores malformed, unknown, and unusable progress lines", () => {
    expect(parseHyperframesProgress("[Render:trace] not-json")).toBeNull();
    expect(parseHyperframesProgress('[Render:trace] {"phase":"encode","status":"checkpoint"}')).toBeNull();
    expect(parseHyperframesProgress("Streaming frame 8/0 (2 workers)")).toBeNull();
    expect(parseHyperframesProgress("ordinary HyperFrames output")).toBeNull();
  });
});
