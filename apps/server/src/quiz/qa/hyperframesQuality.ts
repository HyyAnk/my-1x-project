export type HyperframesFinding = {
  severity?: string;
  message?: string;
  text?: string;
  ratio?: number;
  requiredRatio?: number;
  time?: number;
};

export type HyperframesCheckReport = {
  ok?: boolean;
  contrast?: { findings?: HyperframesFinding[] };
  lint?: { findings?: HyperframesFinding[] };
  runtime?: { findings?: HyperframesFinding[] };
  layout?: { findings?: HyperframesFinding[] };
  motion?: { findings?: HyperframesFinding[] };
};

export function parseHyperframesCheckReport(output: string | undefined): HyperframesCheckReport | null {
  if (!output) return null;
  const jsonStart = output.lastIndexOf("\n{");
  const candidate = (jsonStart >= 0 ? output.slice(jsonStart + 1) : output).trim();
  try {
    const parsed = JSON.parse(candidate) as unknown;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

const DECORATIVE_GLYPH_PATTERN = /^[\s\u00A0\u2000-\u200B✦★☆•✓✕✖✗×?✧⚡○●·»«►◄▲▼♪♫🔥🏆💎|/:_#\-–—]*$/u;
const CHOICE_BADGE_PATTERN = /^[\(\[]?[A-F1-4][\.\:\)\]]?$/i;
const COUNTDOWN_DIGIT_PATTERN = /^(?:[0-9]{1,2}|\?)$/;

export function isExemptContrastFinding(finding: HyperframesFinding): boolean {
  // Non-blocking warnings are always exempt
  if (finding.severity?.toLowerCase() === "warning") {
    return true;
  }

  if (!finding.text) return false;
  const trimmed = finding.text.trim();

  // 1. Purely decorative symbols, glyphs, punctuation, icons
  if (DECORATIVE_GLYPH_PATTERN.test(trimmed)) {
    return true;
  }

  // 2. Choice badges (A, B, C, D, etc.) on quiz cards
  // WCAG 2.1 Criterion 1.4.3 exempts inactive UI components from contrast minimums.
  // In a quiz, choice text and badges on inactive/dimmed cards during the reveal phase
  // are intentionally dimmed and visually distinguished by styling/strokes.
  if (CHOICE_BADGE_PATTERN.test(trimmed)) {
    return true;
  }

  // 3. Countdown numbers / Timer digits (0-9, ?)
  if (COUNTDOWN_DIGIT_PATTERN.test(trimmed)) {
    return true;
  }

  return false;
}

export function actionableContrastFindings(report: HyperframesCheckReport | null): HyperframesFinding[] {
  return (report?.contrast?.findings ?? []).filter((finding) => !isExemptContrastFinding(finding));
}

export function hasHyperframesContrastIssue(report: HyperframesCheckReport | null): boolean {
  return actionableContrastFindings(report).length > 0;
}

export function isBlockingFinding(finding: HyperframesFinding): boolean {
  const sev = finding.severity?.toLowerCase();
  return sev === "error" || sev === "fatal";
}

export function hasHyperframesBlockingIssues(report: HyperframesCheckReport | null): boolean {
  if (!report) return false;
  if (hasHyperframesContrastIssue(report)) return true;

  const categories = [report.layout?.findings, report.runtime?.findings, report.motion?.findings, report.lint?.findings];
  return categories.some((findings) => findings?.some((finding) => isBlockingFinding(finding)) ?? false);
}

export function formatHyperframesCheckFailure(report: HyperframesCheckReport | null, fallback?: string): string {
  if (!report) return `HyperFrames composition check failed${fallback ? `: ${fallback}` : ""}`;

  const contrastFindings = actionableContrastFindings(report);
  const categories = [
    ["contrast", contrastFindings],
    ["layout", report.layout?.findings?.filter(isBlockingFinding)],
    ["runtime", report.runtime?.findings?.filter(isBlockingFinding)],
    ["motion", report.motion?.findings?.filter(isBlockingFinding)],
    ["lint", report.lint?.findings?.filter(isBlockingFinding)],
  ] as const;
  const details = categories
    .flatMap(([category, findings]) => (findings ?? []).map((finding) => formatFinding(category, finding)))
    .slice(0, 8);
  if (details.length === 0) return `HyperFrames composition check failed${fallback ? `: ${fallback}` : ""}`;
  return `HyperFrames composition check failed:\n${details.join("\n")}`;
}

function formatFinding(category: string, finding: HyperframesFinding): string {
  const severity = finding.severity?.toUpperCase() ?? "ERROR";
  const text = finding.text ? ` “${finding.text}”` : "";
  const time = Number.isFinite(finding.time) ? ` at ${finding.time!.toFixed(2)}s` : "";
  const ratio =
    Number.isFinite(finding.ratio) && Number.isFinite(finding.requiredRatio)
      ? ` (${finding.ratio!.toFixed(2)}:1; need ${finding.requiredRatio!.toFixed(2)}:1)`
      : "";
  return `• [${severity}] ${category}${text}${time}: ${finding.message ?? "Check failed"}${ratio}`;
}
