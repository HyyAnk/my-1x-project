import type { Episode } from "@studio/shared";
import { calibratedScriptTargetWords, scriptWordBounds, SCRIPT_WORD_TOLERANCE } from "../speechChunker.js";
import { hasHumorPolicyMarker } from "../narrationExtractor.js";
import type { AssessmentCollector } from "./assessmentContext.js";

export function evaluatePreproductionRules(
  input: {
    episode: Episode;
    research: string;
    treatment: string;
    visualBible: string;
    script: string;
    fallbackWordsPerSecond: number;
  },
  metrics: {
    researchSourceCount: number;
    factualAnchorCount: number;
    narrationWords: number;
    pace: number;
    calibratedTargetWords: number;
  },
  collector: AssessmentCollector,
): void {
  const { episode, treatment, visualBible, script } = input;
  const { researchSourceCount, factualAnchorCount, narrationWords, pace, calibratedTargetWords } = metrics;

  if (researchSourceCount < 5) {
    collector.add(
      "research_sources",
      "blocker",
      `Research has ${researchSourceCount} linked sources; production requires at least 5.`,
      "Regenerate or edit research with primary and authoritative source URLs.",
      18,
    );
  }

  const treatmentSequenceCount = Math.max(
    new Set(treatment.match(/\bSequence\s+\d+\b/gi) ?? []).size,
    (treatment.match(/\bTime budget\b/gi) ?? []).length,
  );
  if (!treatment.trim() || treatmentSequenceCount < 5) {
    collector.add(
      "treatment_structure",
      "blocker",
      "The treatment does not define at least five timed sequences.",
      "Generate a treatment before writing the script.",
      12,
    );
  }

  if (!visualBible.trim() || !/continuity bundle/i.test(visualBible)) {
    collector.add(
      "visual_bible",
      "blocker",
      "The visual bible has no continuity bundles.",
      "Generate the visual bible and define reusable identity locks.",
      12,
    );
  }

  if (script.trim() && !hasHumorPolicyMarker(script)) {
    collector.add(
      "humor_policy",
      "warning",
      "This script predates the current humor policy and has not been reviewed for restrained humor or audio cues.",
      "Regenerate the script once to apply the current humor layer.",
      2,
    );
  }

  const bounds = scriptWordBounds(calibratedTargetWords);
  if (narrationWords < bounds.lower || narrationWords > bounds.upper) {
    collector.add(
      "script_length",
      "blocker",
      `Narration is ${narrationWords} words against a calibrated ${calibratedTargetWords}-word target (${episode.target_duration_minutes} minutes at ${pace.toFixed(2)} words/sec).`,
      `Regenerate or edit the script to stay within ${Math.round(SCRIPT_WORD_TOLERANCE * 100)}% of the calibrated word target.`,
      15,
    );
  }

  if (factualAnchorCount < 6) {
    collector.add(
      "factual_density",
      "blocker",
      `The script contains only ${factualAnchorCount} measurable factual anchors.`,
      "Add dated events, named programs, figures, decisions, and claim IDs from research.",
      15,
    );
  }
}
