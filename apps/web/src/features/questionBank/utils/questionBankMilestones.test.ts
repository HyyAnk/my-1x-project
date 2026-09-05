import { describe, expect, it } from "vitest";
import {
  QUESTION_BANK_MILESTONES,
  formatMilestoneTarget,
  getMilestoneProgress,
} from "./questionBankMilestones";

describe("questionBankMilestones", () => {
  it("defines exactly 6 progressive tiers", () => {
    expect(QUESTION_BANK_MILESTONES).toHaveLength(6);
    expect(QUESTION_BANK_MILESTONES.map((t) => t.target)).toEqual([
      2000, 5000, 10000, 20000, 50000, 100000,
    ]);
  });

  it("formats milestone targets with K suffix correctly", () => {
    expect(formatMilestoneTarget(2000)).toBe("2K");
    expect(formatMilestoneTarget(5000)).toBe("5K");
    expect(formatMilestoneTarget(10000)).toBe("10K");
    expect(formatMilestoneTarget(20000)).toBe("20K");
    expect(formatMilestoneTarget(50000)).toBe("50K");
    expect(formatMilestoneTarget(100000)).toBe("100K");
    expect(formatMilestoneTarget(500)).toBe("500");
  });

  it("calculates starter tier for zero count", () => {
    const result = getMilestoneProgress(0);
    expect(result.activeTier.id).toBe("seed");
    expect(result.activeTier.target).toBe(2000);
    expect(result.nextTier?.id).toBe("foundation");
    expect(result.targetPercent).toBe(0);
    expect(result.bracketPercent).toBe(0);
    expect(result.isMaxTier).toBe(false);
    expect(result.track[0].status).toBe("active");
    expect(result.track[1].status).toBe("upcoming");
  });

  it("calculates progress inside starter tier", () => {
    const result = getMilestoneProgress(1000);
    expect(result.activeTier.id).toBe("seed");
    expect(result.targetPercent).toBe(50);
    expect(result.bracketPercent).toBe(50);
  });

  it("transitions to Foundation tier when reaching 2000", () => {
    const result = getMilestoneProgress(2000);
    expect(result.activeTier.id).toBe("foundation");
    expect(result.activeTier.target).toBe(5000);
    expect(result.bracketPercent).toBe(0); // 0 out of (5000 - 2000)
    expect(result.targetPercent).toBe(40); // 2000 / 5000
    expect(result.track[0].status).toBe("achieved");
    expect(result.track[1].status).toBe("active");
    expect(result.track[2].status).toBe("upcoming");
  });

  it("calculates mid-bracket progress for Foundation tier", () => {
    // Span: 2000 -> 5000 (3000 questions). 3500 is 1500 into the bracket = 50%
    const result = getMilestoneProgress(3500);
    expect(result.activeTier.id).toBe("foundation");
    expect(result.bracketPercent).toBe(50);
    expect(result.targetPercent).toBe(70); // 3500 / 5000
  });

  it("handles transition at 20000 questions (Master achieved -> Grandmaster active)", () => {
    const result = getMilestoneProgress(20000);
    expect(result.activeTier.id).toBe("grandmaster");
    expect(result.activeTier.target).toBe(50000);
    expect(result.bracketPercent).toBe(0);
    expect(result.targetPercent).toBe(40); // 20000 / 50000
    expect(result.track[3].status).toBe("achieved"); // Master (20K)
    expect(result.track[4].status).toBe("active"); // Grandmaster (50K)
  });

  it("handles reaching max mythic tier at 100000 questions", () => {
    const result = getMilestoneProgress(100000);
    expect(result.activeTier.id).toBe("mythic");
    expect(result.isMaxTier).toBe(true);
    expect(result.nextTier).toBeNull();
    expect(result.targetPercent).toBe(100);
    expect(result.bracketPercent).toBe(100);
    expect(result.track.every((n) => n.status === "achieved")).toBe(true);
  });

  it("handles surpassing 100000 questions gracefully", () => {
    const result = getMilestoneProgress(150000);
    expect(result.activeTier.id).toBe("mythic");
    expect(result.isMaxTier).toBe(true);
    expect(result.targetPercent).toBe(100);
    expect(result.bracketPercent).toBe(100);
  });
});
