import { describe, expect, it } from "vitest";
import { resolveStageTimelineState, stageBackgroundPhase, stageBackgroundTime } from "./stageTimeline";

describe("Stage Studio canonical rehearsal timeline", () => {
  it("maps the full production phase sequence without skipping thinking or explain", () => {
    expect(resolveStageTimelineState(1, "celebrate")).toEqual({ phase: "intro", pose: "wave" });
    expect(resolveStageTimelineState(3, "celebrate")).toEqual({ phase: "question", pose: "thinking" });
    expect(resolveStageTimelineState(6, "celebrate")).toEqual({ phase: "thinking", pose: "thinking" });
    expect(resolveStageTimelineState(10, "celebrate")).toEqual({ phase: "reveal", pose: "celebrate" });
    expect(resolveStageTimelineState(10, "oops")).toEqual({ phase: "reveal", pose: "oops" });
    expect(resolveStageTimelineState(13, "celebrate")).toEqual({ phase: "explain", pose: "point" });
    expect(resolveStageTimelineState(15, "celebrate")).toEqual({ phase: "outro", pose: "outro" });
  });

  it("keeps background phases separate from mascot visibility phases", () => {
    expect(stageBackgroundPhase("intro")).toBe("question");
    expect(stageBackgroundPhase("outro")).toBe("explain");
    expect(stageBackgroundTime("thinking")).toBe(5);
  });
});
