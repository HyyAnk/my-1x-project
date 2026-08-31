import type { Episode } from "@studio/shared";
import { sanitizeTextForSpeech, canSplitBetweenWords } from "../utils/speechSanitizer.js";

export const WORD_PATTERN = /[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*/gu;
export const PARALINGUISTIC_TAG_PATTERN = /\[(?:chuckle|laugh)\]/gi;

// A duration target is more useful than the historical word-count default once a
// real narrator pace is known. Keep the gate permissive enough for natural
// narrative phrasing while still catching scripts that would materially miss
// the requested runtime.
export const SCRIPT_WORD_TOLERANCE = 0.2;

export function calibratedScriptTargetWords(
  episode: Pick<Episode, "target_duration_minutes" | "measured_narration_words_per_second">,
  fallbackWordsPerSecond: number,
): number {
  const pace = episode.measured_narration_words_per_second ?? fallbackWordsPerSecond;
  return Math.max(1, Math.round(episode.target_duration_minutes * 60 * Math.max(0.1, pace)));
}

export function scriptWordBounds(targetWords: number): { lower: number; upper: number } {
  return {
    lower: Math.floor(targetWords * (1 - SCRIPT_WORD_TOLERANCE)),
    upper: Math.ceil(targetWords * (1 + SCRIPT_WORD_TOLERANCE)),
  };
}

export function countWords(value: string): number {
  return (
    value
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(PARALINGUISTIC_TAG_PATTERN, " ")
      .match(WORD_PATTERN)?.length ?? 0
  );
}

export function splitAtNarrativeBoundaries(dialogue: string, maxWords: number): string[] {
  const value = sanitizeTextForSpeech(dialogue.trim());
  if (!value || countWords(value) <= maxWords) return value ? [value] : [];
  const units = value
    .match(/[^.!?;:]+(?:[.!?;:]|$)/g)
    ?.map((unit) => unit.trim())
    .filter(Boolean) ?? [value];
  const chunks: string[] = [];
  let current = "";
  const flush = () => {
    if (current.trim()) chunks.push(current.trim());
    current = "";
  };
  for (const unit of units) {
    if (countWords(unit) > maxWords) {
      flush();
      chunks.push(...splitLongUnit(unit, maxWords));
      continue;
    }
    const candidate = `${current} ${unit}`.trim();
    if (current && countWords(candidate) > maxWords) flush();
    current = `${current} ${unit}`.trim();
  }
  flush();
  return chunks;
}

export function splitLongUnit(unit: string, maxWords: number): string[] {
  const clauses = unit
    .split(/(?<=[,—–])\s+/)
    .map((value) => value.trim())
    .filter(Boolean);
  if (clauses.length > 1 && clauses.every((clause) => countWords(clause) <= maxWords)) {
    const chunks: string[] = [];
    let current = "";
    for (const clause of clauses) {
      const candidate = `${current} ${clause}`.trim();
      if (current && countWords(candidate) > maxWords) {
        chunks.push(current);
        current = clause;
      } else current = candidate;
    }
    if (current) chunks.push(current);
    return chunks;
  }
  const words = unit.match(WORD_PATTERN) ?? [];
  const chunks: string[] = [];
  let cursor = 0;
  while (cursor < words.length) {
    if (words.length - cursor <= maxWords) {
      chunks.push(words.slice(cursor).join(" "));
      break;
    }
    let target = cursor + maxWords;
    while (target > cursor + 3 && !canSplitBetweenWords(words[target - 1], words[target])) {
      target--;
    }
    chunks.push(words.slice(cursor, target).join(" "));
    cursor = target;
  }
  return chunks;
}
