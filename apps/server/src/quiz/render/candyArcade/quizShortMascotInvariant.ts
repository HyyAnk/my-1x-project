import type { CandyArcadeCompositionBundle } from "../candyArcadeComposition.js";
import { SCORE_CTA_CLIP_ID } from "./scoreCtaClip.js";

export type QuizShortMascotViolation = {
  clipId: string;
  reason: "mascot_outside_question_or_cta" | "mascot_phase_not_allowed";
  phase?: string;
};

const MASCOT_CONTAINER_PATTERN = /class="[^"]*\bcandy-mascot-container\b[^"]*"/;
const MASCOT_STATE_PHASE_PATTERN = /class="[^"]*\bmascot-v2-state\b[^"]*"[^>]*data-mascot-phase="([^"]+)"/g;
const CLIP_ID_PATTERN = /<section[^>]*\sid="([^"]+)"/;
const QUESTION_CLIP_PHASES = new Set(["thinking", "reveal", "explain"]);

function clipSources(bundle: CandyArcadeCompositionBundle): Array<{ clipId: string; html: string }> {
  return Object.entries(bundle.files)
    .filter(([path]) => path.startsWith("compositions/"))
    .map(([path, html]) => ({ clipId: html.match(CLIP_ID_PATTERN)?.[1] ?? path, html }));
}

function statePhases(html: string): string[] {
  return [...html.matchAll(MASCOT_STATE_PHASE_PATTERN)].map((match) => match[1]);
}

/**
 * QA-visible invariant for Quiz Shorts: inside question clips the mascot may only think (while the
 * question is read) and celebrate the reveal; outside them it appears only on the score CTA clip.
 * A mascot on the kickoff card or any other clip, or any other question-clip state, is reported.
 */
export function findQuizShortMascotViolations(bundle: CandyArcadeCompositionBundle): QuizShortMascotViolation[] {
  const violations: QuizShortMascotViolation[] = [];
  for (const { clipId, html } of clipSources(bundle)) {
    if (!MASCOT_CONTAINER_PATTERN.test(html)) continue;
    if (clipId === SCORE_CTA_CLIP_ID) continue;
    if (!clipId.startsWith("quiz-q")) {
      violations.push({ clipId, reason: "mascot_outside_question_or_cta" });
      continue;
    }
    for (const phase of statePhases(html)) {
      if (!QUESTION_CLIP_PHASES.has(phase)) violations.push({ clipId, reason: "mascot_phase_not_allowed", phase });
    }
  }
  return violations;
}

export function assertQuizShortMascotInvariant(bundle: CandyArcadeCompositionBundle): void {
  const violations = findQuizShortMascotViolations(bundle);
  if (violations.length === 0) return;
  const detail = violations
    .map((violation) => `${violation.clipId}: ${violation.reason}${violation.phase ? ` (${violation.phase})` : ""}`)
    .join("; ");
  throw new Error(`QUIZ_SHORT_MASCOT_VISIBILITY: ${detail}`);
}
