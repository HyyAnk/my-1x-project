import { describe, expect, it } from "vitest";
import {
  formatHyperframesCheckFailure,
  hasHyperframesBlockingIssues,
  hasHyperframesContrastIssue,
  isExemptContrastFinding,
  parseHyperframesCheckReport,
} from "../src/quiz/qa/hyperframesQuality.js";

describe("HyperFrames quality reporting", () => {
  it("flags actionable contrast findings for telemetry and healing without blocking render", () => {
    const report = parseHyperframesCheckReport(
      `[INFO] compiler ready\n${JSON.stringify({
        ok: false,
        contrast: {
          findings: [
            {
              severity: "error",
              message: "Contrast is 1.41:1; WCAG AA requires 3:1.",
              text: "Question Title",
              ratio: 1.41,
              requiredRatio: 3,
              time: 56.69,
            },
          ],
        },
      })}`,
    );

    expect(hasHyperframesContrastIssue(report)).toBe(true);
    expect(hasHyperframesBlockingIssues(report)).toBe(false);
    expect(formatHyperframesCheckFailure(report)).toContain("“Question Title” at 56.69s");
    expect(formatHyperframesCheckFailure(report)).toContain("need 3.00:1");
  });

  it("ignores contrast warnings on purely decorative symbols", () => {
    const report = parseHyperframesCheckReport(
      JSON.stringify({
        ok: true,
        contrast: {
          findings: [
            {
              severity: "warning",
              message: "Contrast is 1.59:1; WCAG AA requires 3:1.",
              text: "✦",
              ratio: 1.59,
              requiredRatio: 3,
              time: 71.32,
            },
          ],
        },
      }),
    );

    expect(hasHyperframesContrastIssue(report)).toBe(false);
    expect(hasHyperframesBlockingIssues(report)).toBe(false);
  });

  it("does not block a successful check that only has non-contrast findings", () => {
    const report = parseHyperframesCheckReport(
      JSON.stringify({
        ok: true,
        lint: { findings: [{ severity: "warning", message: "Track is dense" }] },
        contrast: { findings: [] },
      }),
    );

    expect(hasHyperframesContrastIssue(report)).toBe(false);
    expect(hasHyperframesBlockingIssues(report)).toBe(false);
  });

  it("does not block build on non-blocking contrast warnings for dimmed answer choices during reveal", () => {
    const report = parseHyperframesCheckReport(
      JSON.stringify({
        ok: true,
        contrast: {
          findings: [
            {
              severity: "warning",
              message: "Contrast is 1.96:1; WCAG AA requires 3:1.",
              text: "Mount Everest",
              ratio: 1.96,
              requiredRatio: 3,
              time: 209.53,
            },
          ],
        },
      }),
    );

    expect(hasHyperframesContrastIssue(report)).toBe(false);
    expect(hasHyperframesBlockingIssues(report)).toBe(false);
  });

  it("exempts choice badges (A, B, C, D) even when flagged with error severity during reveal", () => {
    const report = parseHyperframesCheckReport(
      JSON.stringify({
        ok: false,
        contrast: {
          findings: [
            {
              severity: "error",
              message: "Contrast is 2.77:1; WCAG AA requires 3:1.",
              text: "A",
              ratio: 2.77,
              requiredRatio: 3,
              time: 45.42,
            },
            {
              severity: "error",
              message: "Contrast is 2.50:1; WCAG AA requires 3:1.",
              text: "B.",
              ratio: 2.5,
              requiredRatio: 3,
              time: 45.42,
            },
            {
              severity: "error",
              message: "Contrast is 2.65:1; WCAG AA requires 3:1.",
              text: "[C]",
              ratio: 2.65,
              requiredRatio: 3,
              time: 45.42,
            },
          ],
        },
        runtime: {
          findings: [
            {
              severity: "warning",
              message: "The resource http://127.0.0.1:7173/mascot-assets/master_concept_1787905113496.png was preloaded...",
              time: 50.81,
            },
          ],
        },
      }),
    );

    expect(hasHyperframesContrastIssue(report)).toBe(false);
    expect(hasHyperframesBlockingIssues(report)).toBe(false);
  });

  it("exempts countdown timer digits and decorative glyphs", () => {
    expect(isExemptContrastFinding({ severity: "error", text: "5" })).toBe(true);
    expect(isExemptContrastFinding({ severity: "error", text: "1" })).toBe(true);
    expect(isExemptContrastFinding({ severity: "error", text: "?" })).toBe(true);
    expect(isExemptContrastFinding({ severity: "error", text: "★" })).toBe(true);
    expect(isExemptContrastFinding({ severity: "error", text: "✓" })).toBe(true);
    expect(isExemptContrastFinding({ severity: "error", text: "•" })).toBe(true);

    // Real content text must still be flagged
    expect(isExemptContrastFinding({ severity: "error", text: "Mercury is the smallest planet" })).toBe(false);
  });

  it("treats layout, runtime, motion, and lint error findings as blocking issues", () => {
    const report = parseHyperframesCheckReport(
      JSON.stringify({
        ok: false,
        layout: {
          findings: [
            {
              severity: "error",
              message: "Element overflows viewport bounds",
              text: "Header",
            },
          ],
        },
        contrast: {
          findings: [
            {
              severity: "error",
              message: "Contrast is 1.41:1; WCAG AA requires 3:1.",
              text: "Subtitle",
              ratio: 1.41,
              requiredRatio: 3,
            },
          ],
        },
      }),
    );

    expect(hasHyperframesContrastIssue(report)).toBe(true);
    expect(hasHyperframesBlockingIssues(report)).toBe(true);
    const failureMsg = formatHyperframesCheckFailure(report);
    expect(failureMsg.indexOf("[ERROR] layout")).toBeLessThan(failureMsg.indexOf("[ERROR] contrast"));
  });

  it("prioritizes true blockers over contrast findings in failure formatting", () => {
    const report = parseHyperframesCheckReport(
      JSON.stringify({
        ok: false,
        runtime: {
          findings: [
            {
              severity: "fatal",
              message: "Uncaught ReferenceError: foo is not defined",
              time: 12.34,
            },
          ],
        },
        contrast: {
          findings: [
            {
              severity: "error",
              message: "Contrast is 2.1:1; WCAG AA requires 3:1.",
              text: "Card",
              ratio: 2.1,
              requiredRatio: 3,
            },
          ],
        },
      }),
    );

    expect(hasHyperframesBlockingIssues(report)).toBe(true);
    const formatted = formatHyperframesCheckFailure(report);
    expect(formatted).toContain("• [FATAL] runtime");
    expect(formatted.indexOf("• [FATAL] runtime")).toBeLessThan(formatted.indexOf("• [ERROR] contrast"));
  });

  it("does not treat fatal or error contrast findings as blocking when no other blockers exist", () => {
    const report = parseHyperframesCheckReport(
      JSON.stringify({
        ok: false,
        contrast: {
          findings: [
            {
              severity: "fatal",
              message: "Extreme contrast deficit",
              text: "Critical Alert",
              ratio: 1.1,
              requiredRatio: 4.5,
            },
            {
              severity: "error",
              message: "Contrast is 1.5:1",
              text: "Option D",
              ratio: 1.5,
              requiredRatio: 3,
            },
          ],
        },
      }),
    );

    expect(hasHyperframesContrastIssue(report)).toBe(true);
    expect(hasHyperframesBlockingIssues(report)).toBe(false);
  });
});
