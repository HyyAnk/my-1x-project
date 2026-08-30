import type { Beat } from "../sceneTiming.js";
import { countWords, extractNarration, hasHumorPolicyMarker, scriptWordBounds } from "../production.js";
import { parseContinuityBundles } from "../visualBundles.js";
import {
  extractArtifactSectionNumbers,
  formatArtifactSectionNumbers,
  missingArtifactSectionNumbers,
  contiguousArtifactNumbers,
} from "../artifactSections.js";
import { resolveVisibleQuizChoice } from "../quiz/domain/quiz.js";
import { validateQuizResearchCopyright, validateQuizScriptCopyright } from "../quiz/qa/copyrightValidator.js";

export function validateNarrationSegmentDuration(duration: number, text: string, wordsPerSecond: number, segmentNumber: number): void {
  const expectedDuration = countWords(text) / Math.max(0.1, wordsPerSecond);
  if (!Number.isFinite(duration) || duration <= 0 || duration < expectedDuration * 0.4) {
    throw new Error(
      `Narration segment ${segmentNumber} appears truncated (${Number.isFinite(duration) ? duration.toFixed(1) : "0.0"}s for ${countWords(text)} words)`,
    );
  }
}

export function validateResearch(markdown: string): void {
  const sourceCount = new Set(markdown.match(/https?:\/\/[^\s)>\]]+/g) ?? []).size;
  const claimCount = new Set(markdown.match(/\bC\d{2,}\b/g) ?? []).size;
  if (sourceCount < 5) throw new Error(`Research quality gate failed: found ${sourceCount} source URLs; at least 5 are required`);
  if (claimCount < 5) throw new Error(`Research quality gate failed: found ${claimCount} claim IDs; at least 5 are required`);
}

export function validateQuizResearch(markdown: string, questionCount: number): void {
  const copyrightCheck = validateQuizResearchCopyright(markdown);
  if (copyrightCheck.violated) {
    throw new Error(
      `Quiz research quality gate failed: ${copyrightCheck.questionNumber ? `Question ${copyrightCheck.questionNumber}` : "Research dossier"} contains prohibited term '${copyrightCheck.term}'. Please regenerate without using copyrighted characters or lion cubs.`,
    );
  }
  const sourceCount = new Set(markdown.match(/https?:\/\/[^\s)>\]]+/g) ?? []).size;
  const claimCount = new Set(markdown.match(/\bC\d{2,}\b/g) ?? []).size;
  if (sourceCount < Math.max(3, Math.ceil(questionCount / 2)))
    throw new Error(`Quiz research quality gate failed: found ${sourceCount} source URLs`);
  if (claimCount < questionCount)
    throw new Error(`Quiz research quality gate failed: found ${claimCount} claim IDs for ${questionCount} questions`);
}

export function validateQuizTreatment(markdown: string, questionCount: number): void {
  const copyrightCheck = validateQuizScriptCopyright(markdown);
  if (copyrightCheck.violated) {
    throw new Error(
      `Quiz treatment quality gate failed: ${copyrightCheck.questionNumber ? `Question ${copyrightCheck.questionNumber}` : "Treatment"} contains prohibited term '${copyrightCheck.term}'. Please regenerate without using copyrighted characters or lion cubs.`,
    );
  }
  const headings = new Set(markdown.match(/^#{2,3}\s+Question\s+\d+/gim) ?? []).size;
  if (headings < questionCount)
    throw new Error(`Quiz treatment quality gate failed: found ${headings} question blocks for ${questionCount} questions`);
  if (!/time budget/i.test(markdown) || !/correct answer/i.test(markdown))
    throw new Error("Quiz treatment quality gate failed: each question needs time budget and correct answer");
}

export function validateQuizScript(markdown: string, questionCount: number): void {
  if (!hasHumorPolicyMarker(markdown)) throw new Error("Quiz script quality gate failed: HUMOR_POLICY v1 marker is missing");
  const copyrightCheck = validateQuizScriptCopyright(markdown);
  if (copyrightCheck.violated) {
    throw new Error(
      `Quiz script quality gate failed: ${copyrightCheck.questionNumber ? `Question ${copyrightCheck.questionNumber}` : "Script"} contains prohibited term '${copyrightCheck.term}'. Please regenerate this question using a safe alternative subject without using copyrighted characters or lion cubs.`,
    );
  }
  const headingNumbers = [...markdown.matchAll(/^#{2,3}\s+Question\s+(\d+)\b/gim)].map((match) => Number(match[1]));
  const listNumbers = [...markdown.matchAll(/(?:^|\n)\s*(?:Question\s*)?(\d+)[.)—:-]\s*/gi)].map((match) => Number(match[1]));
  const questionNumbers = new Set(headingNumbers.length > 0 ? headingNumbers : listNumbers);
  const numbered = questionNumbers.size;
  if (numbered < questionCount)
    throw new Error(`Quiz script quality gate failed: found ${numbered} numbered question blocks for ${questionCount} questions`);
  if (!Array.from({ length: questionCount }, (_, index) => index + 1).every((number) => questionNumbers.has(number)))
    throw new Error(`Quiz script quality gate failed: question blocks must be numbered 1-${questionCount}`);
  if (!/answer|correct/i.test(markdown) || !/guess|think/i.test(markdown))
    throw new Error("Quiz script quality gate failed: guess and answer beats are required");
}

export function validateQuizVisualBible(markdown: string, requiredBundleNumbers: number[]): void {
  const bundles = parseContinuityBundles(markdown);
  const missing = missingArtifactSectionNumbers(markdown, requiredBundleNumbers, "continuity_bundle");
  if (missing.length)
    throw new Error(
      `Quiz visual bible quality gate failed: missing continuity bundle${missing.length === 1 ? "" : "s"} ${formatArtifactSectionNumbers(missing)}`,
    );
  if (bundles.length < requiredBundleNumbers.length)
    throw new Error(
      `Quiz visual bible quality gate failed: found ${bundles.length} continuity bundles for ${requiredBundleNumbers.length} questions`,
    );
  for (const required of ["safe motion"])
    if (!markdown.toLowerCase().includes(required)) throw new Error(`Quiz visual bible quality gate failed: missing ${required}`);
}

export function validateTreatment(markdown: string): void {
  const sequenceNumbers = extractArtifactSectionNumbers(markdown, "sequence");
  const sequenceCount = Math.max(new Set(sequenceNumbers).size, (markdown.match(/\bTime budget\b/gi) ?? []).length);
  if (sequenceCount < 5) throw new Error(`Treatment quality gate failed: found ${sequenceCount} sequences; at least 5 are required`);
  if (
    sequenceNumbers.length > 0 &&
    (!contiguousArtifactNumbers(sequenceNumbers) || new Set(sequenceNumbers).size !== sequenceNumbers.length)
  ) {
    throw new Error("Treatment quality gate failed: sequence headings must be numbered consecutively from 1");
  }
  if (!/time budget/i.test(markdown) || !/claim/i.test(markdown))
    throw new Error("Treatment quality gate failed: time budgets and claim IDs are required");
}

export function validateScript(markdown: string, targetWords: number): void {
  const narration = extractNarration(markdown);
  const words = countWords(narration);
  if (!hasHumorPolicyMarker(markdown))
    throw new Error("Script quality gate failed: HUMOR_POLICY v1 marker is missing; regenerate the script with the current humor layer");
  const bounds = scriptWordBounds(targetWords);
  if (words < bounds.lower || words > bounds.upper)
    throw new Error(
      `Script quality gate failed: ${words} words is outside ±20% of the calibrated ${targetWords}-word target (${bounds.lower}–${bounds.upper} words)`,
    );
  const anchors = new Set([
    ...(narration.match(/\b(?:18|19|20)\d{2}\b/g) ?? []),
    ...(markdown.match(/\bC\d{2,}\b/g) ?? []),
    ...(narration.match(/\b\d+(?:\.\d+)?\s?(?:%|percent|million|billion|miles?|kilomet(?:er|re)s?)\b/gi) ?? []),
  ]).size;
  if (anchors < 6) throw new Error(`Script quality gate failed: found ${anchors} factual anchors; at least 6 are required`);
}

export function validateVisualBible(markdown: string, requiredBundleNumbers: number[] = []): void {
  const bundles = parseContinuityBundles(markdown);
  const bundleNumbers = [...new Set(bundles.map((bundle) => bundle.bundle_number))];
  const missing = missingArtifactSectionNumbers(markdown, requiredBundleNumbers, "continuity_bundle");
  const minimum = requiredBundleNumbers.length > 0 ? requiredBundleNumbers.length : 5;
  if (!/continuity bundle/i.test(markdown) || bundles.length < 5)
    throw new Error(`Visual bible quality gate failed: found ${bundles.length} stable continuity bundle IDs; at least 5 are required`);
  if (bundles.length < minimum)
    throw new Error(`Visual bible quality gate failed: found ${bundles.length} stable continuity bundles; ${minimum} are required`);
  if (missing.length)
    throw new Error(
      `Visual bible quality gate failed: missing continuity bundle${missing.length === 1 ? "" : "s"} ${formatArtifactSectionNumbers(missing)}`,
    );
  if (bundleNumbers.length > 0 && !contiguousArtifactNumbers(bundleNumbers))
    throw new Error("Visual bible quality gate failed: continuity bundle IDs must be numbered consecutively from 1");
  for (const required of ["palette", "lighting", "reference asset", "anchor-frame"]) {
    if (!markdown.toLowerCase().includes(required)) throw new Error(`Visual bible quality gate failed: missing ${required}`);
  }
}

export function isSequenceOutputFailure(message: string): boolean {
  return (
    message.startsWith("Shot-plan quality gate failed") ||
    message.startsWith("Quiz scene quality gate failed") ||
    message.startsWith("Shot-plan JSON output malformed") ||
    message === "Codex output did not contain JSON" ||
    message.startsWith("Codex beat ") ||
    message.includes("timed out") ||
    message.includes("inactivity") ||
    message.includes("stream was interrupted")
  );
}

export function validateBeatOutput(beats: Beat[], minimumSequences = 5, quiz = false): void {
  const sequences = new Set(beats.map((beat) => beat.sequence_id));
  if (sequences.size < minimumSequences)
    throw new Error(`Shot-plan quality gate failed: found ${sequences.size} sequences; at least ${minimumSequences} are required`);
  const prompts = beats.map((beat) => beat.visual_prompt.replace(/\s+/g, " ").trim().toLowerCase());
  const uniqueRatio = new Set(prompts).size / beats.length;
  if (uniqueRatio < 0.9)
    throw new Error(`Shot-plan quality gate failed: ${Math.round((1 - uniqueRatio) * 100)}% of prompts are exact duplicates`);
  const incomplete = beats.filter(
    (beat) =>
      !["CAMERA", "ACTION", "LIGHTING", "ATMOSPHERE", "CONTINUITY"].every((label) => beat.visual_prompt.toUpperCase().includes(label)) ||
      !beat.continuity_bundle_id ||
      !beat.continuity_note,
  );
  if (incomplete.length > Math.max(1, Math.floor(beats.length * 0.05)))
    throw new Error(`Shot-plan quality gate failed: ${incomplete.length} prompts lack structure or continuity metadata`);
  const sourced = beats.filter((beat) => beat.asset_type === "transition" || beat.source_ids.length > 0).length / beats.length;
  if (sourced < 0.75) throw new Error(`Shot-plan quality gate failed: only ${Math.round(sourced * 100)}% of shots carry source IDs`);
  const overlayCoverage = beats.filter((beat) => beat.editorial_overlay.kind !== "none").length / beats.length;
  if (overlayCoverage > 0.45)
    throw new Error(
      `Shot-plan quality gate failed: editorial overlays cover ${Math.round(overlayCoverage * 100)}% of beats; keep overlays selective and below 45%`,
    );
  const invalidCharts = beats.filter(
    (beat) => ["bar_chart", "line_chart"].includes(beat.editorial_overlay.kind) && beat.editorial_overlay.data.length < 2,
  );
  if (invalidCharts.length) throw new Error("Shot-plan quality gate failed: charts require at least two sourced data points");
  if (quiz) {
    const incompleteQuiz = beats.filter(
      (beat) =>
        !beat.quiz ||
        (!["intro", "outro"].includes(beat.quiz.phase) && (!beat.quiz.question_number || !beat.quiz.question || !beat.quiz.answer)),
    );
    if (incompleteQuiz.length)
      throw new Error(`Quiz scene quality gate failed: ${incompleteQuiz.length} beats lack structured question or answer data`);
    const invalidAnswers = beats.flatMap((beat, index) =>
      beat.quiz && !["intro", "outro"].includes(beat.quiz.phase) && resolveVisibleQuizChoice(beat.quiz.choices, beat.quiz.answer) === null
        ? [index + 1]
        : [],
    );
    if (invalidAnswers.length)
      throw new Error(
        `Quiz scene quality gate failed: ${invalidAnswers.length} beats contain an answer that does not match a visible choice (beats ${invalidAnswers.join(", ")})`,
      );
  }
}

export function validateNarrationCoverage(script: string, beats: Beat[], threshold: number): void {
  const expected =
    extractNarration(script)
      .toLowerCase()
      .match(/[\p{L}\p{N}]+/gu) ?? [];
  const actual =
    beats
      .map((beat) => beat.dialogue)
      .join(" ")
      .toLowerCase()
      .match(/[\p{L}\p{N}]+/gu) ?? [];
  const counts = new Map<string, number>();
  for (const word of actual) counts.set(word, (counts.get(word) ?? 0) + 1);
  let matched = 0;
  for (const word of expected) {
    const available = counts.get(word) ?? 0;
    if (available > 0) {
      matched += 1;
      counts.set(word, available - 1);
    }
  }
  const coverage = expected.length ? matched / expected.length : 0;
  if (coverage < threshold)
    throw new Error(
      `Shot-plan quality gate failed: narration coverage is ${(coverage * 100).toFixed(1)}%; at least ${(threshold * 100).toFixed(1)}% is required`,
    );
}

export function isPlaceholderArtifact(content: string): boolean {
  const value = content.trim();
  return !value || /(?:has not started|generation has not started|breakdown has not started)/i.test(value);
}
