import type { ProductionAssessment, Scene } from "@studio/shared";
import { WORD_PATTERN } from "../speechChunker.js";

export class AssessmentCollector {
  issues: ProductionAssessment["issues"] = [];
  score = 100;

  add(
    code: string,
    severity: "blocker" | "warning" | "info",
    message: string,
    nextAction: string,
    penalty: number,
    sceneNumbers: number[] = [],
  ): void {
    this.issues.push({ code, severity, message, next_action: nextAction, scene_numbers: sceneNumbers });
    this.score -= penalty;
  }

  get finalScore(): number {
    return Math.max(0, Math.min(100, Math.round(this.score)));
  }

  get rating(): "production_ready" | "needs_work" | "not_ready" {
    const hasBlocker = this.issues.some((issue) => issue.severity === "blocker");
    return !hasBlocker && this.finalScore >= 85 ? "production_ready" : this.finalScore >= 60 ? "needs_work" : "not_ready";
  }
}

export function countFactualAnchors(value: string, markdown = value): number {
  const years = value.match(/\b(?:18|19|20)\d{2}\b/g) ?? [];
  const figures = value.match(/\b\d+(?:\.\d+)?(?:\s?(?:%|percent|million|billion|kilomet(?:er|re)s?|miles?|vehicles?|dollars?))\b/gi) ?? [];
  const claimIds = markdown.match(/\bC\d{2,}\b/g) ?? [];
  return new Set([...years, ...figures, ...claimIds]).size;
}

export function duplicatePromptScenes(scenes: Scene[]): number[] {
  const groups = new Map<string, number[]>();
  for (const scene of scenes) {
    const key = normalize(scene.visual_prompt);
    groups.set(key, [...(groups.get(key) ?? []), scene.scene_number]);
  }
  return [...groups.values()].filter((numbers) => numbers.length > 1).flat();
}

export function wordCoverage(expected: string, actual: string): number {
  const expectedWords = expected.toLowerCase().match(WORD_PATTERN) ?? [];
  const actualCounts = new Map<string, number>();
  for (const word of actual.toLowerCase().match(WORD_PATTERN) ?? []) actualCounts.set(word, (actualCounts.get(word) ?? 0) + 1);
  let matched = 0;
  for (const word of expectedWords) {
    const available = actualCounts.get(word) ?? 0;
    if (available > 0) {
      matched += 1;
      actualCounts.set(word, available - 1);
    }
  }
  return ratio(matched, expectedWords.length);
}

export function normalize(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

export function ratio(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : Number((numerator / denominator).toFixed(4));
}

export function formatDuration(seconds: number): string {
  const rounded = Math.round(seconds);
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, "0")}`;
}
