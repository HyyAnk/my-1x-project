import { VIDEO_TITLE_KEYWORD_WINDOW_CHARS, VIDEO_TITLE_MAX_CHARS } from "@studio/shared";
import { findSpoilerLeaks } from "../description/descriptionSpoilerGuard.js";
import type { TitleDraft, TitleIssue, TitleReviewContext } from "./videoTitle.types.js";

const ANGLE_BRACKETS = /[<>]/g;
const HASHTAGS = /(^|\s)#[\p{L}\p{N}_]+/gu;
const WRAPPING_QUOTES = /^["'“”‘’「」『』]+|["'“”‘’「」『』]+$/gu;
const TRAILING_PERIODS = /[.。]+$/u;
const SHOUTING_WORD = /(?<!\p{L})\p{Lu}{4,}(?!\p{L})/gu;
/** One all-caps word is tolerated for acronyms such as "NASA". */
const MAX_SHOUTING_WORDS = 1;
const DUPLICATE_SIMILARITY_THRESHOLD = 0.8;

function normalizeForCompare(text: string): string {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function characterBigrams(text: string): Set<string> {
  const compact = text.replace(/\s+/g, "");
  const bigrams = new Set<string>();
  for (let index = 0; index < compact.length - 1; index++) bigrams.add(compact.slice(index, index + 2));
  return bigrams;
}

function bigramSimilarity(left: string, right: string): number {
  const leftBigrams = characterBigrams(left);
  const rightBigrams = characterBigrams(right);
  if (leftBigrams.size === 0 || rightBigrams.size === 0) return 0;
  let shared = 0;
  for (const bigram of leftBigrams) if (rightBigrams.has(bigram)) shared++;
  return shared / (leftBigrams.size + rightBigrams.size - shared);
}

/** Removes characters YouTube rejects or that waste title space (hashtags, wrapping quotes, trailing periods). */
export function sanitizeVideoTitle(rawTitle: string): string {
  return rawTitle
    .replace(ANGLE_BRACKETS, "")
    .replace(HASHTAGS, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(WRAPPING_QUOTES, "")
    .replace(TRAILING_PERIODS, "")
    .trim();
}

export function isNearDuplicateTitle(candidate: string, existing: string): boolean {
  const normalizedCandidate = normalizeForCompare(candidate);
  const normalizedExisting = normalizeForCompare(existing);
  if (!normalizedCandidate || !normalizedExisting) return false;
  if (normalizedCandidate === normalizedExisting) return true;
  return bigramSimilarity(normalizedCandidate, normalizedExisting) >= DUPLICATE_SIMILARITY_THRESHOLD;
}

/** Returns the character index where the keyword starts, or -1 when absent. */
export function findKeywordPosition(title: string, keyword: string): number {
  const normalizedKeyword = keyword.normalize("NFKC").toLowerCase().trim();
  if (!normalizedKeyword) return -1;
  return title.normalize("NFKC").toLowerCase().indexOf(normalizedKeyword);
}

export function containsQuestionCount(title: string, questionCount: number): boolean {
  return new RegExp(`(?<!\\d)${questionCount}(?!\\d)`).test(title.normalize("NFKC"));
}

function collectFormatIssues(title: string): TitleIssue[] {
  const issues: TitleIssue[] = [];
  if (title.length > VIDEO_TITLE_MAX_CHARS) {
    issues.push({ code: "TOO_LONG", severity: "blocker", detail: `Title has ${title.length} characters; YouTube allows ${VIDEO_TITLE_MAX_CHARS}.` });
  }
  const shoutingWords = title.match(SHOUTING_WORD) ?? [];
  if (shoutingWords.length > MAX_SHOUTING_WORDS) {
    issues.push({ code: "SHOUTING", severity: "advisory", detail: `Avoid ALL CAPS words: ${shoutingWords.join(", ")}.` });
  }
  return issues;
}

function collectKeywordIssues(draft: TitleDraft): TitleIssue[] {
  const position = findKeywordPosition(draft.title, draft.primaryKeyword);
  if (position === -1) {
    return [{ code: "KEYWORD_MISSING", severity: "advisory", detail: `Primary keyword "${draft.primaryKeyword}" must appear verbatim.` }];
  }
  if (position > VIDEO_TITLE_KEYWORD_WINDOW_CHARS) {
    return [
      {
        code: "KEYWORD_NOT_FRONT_LOADED",
        severity: "advisory",
        detail: `Primary keyword starts at character ${position}; it must start within the first ${VIDEO_TITLE_KEYWORD_WINDOW_CHARS}.`,
      },
    ];
  }
  return [];
}

function collectContentIssues(title: string, context: TitleReviewContext): TitleIssue[] {
  const issues: TitleIssue[] = [];
  if (!containsQuestionCount(title, context.questionCount)) {
    issues.push({ code: "QUESTION_COUNT_MISSING", severity: "advisory", detail: `Include the exact question count (${context.questionCount}) as digits.` });
  }
  const duplicate = context.recentTitles.find((recent) => isNearDuplicateTitle(title, recent));
  if (duplicate) {
    issues.push({ code: "DUPLICATE_OF_RECENT", severity: "blocker", detail: `Too similar to an existing channel title: "${duplicate}".` });
  }
  for (const leak of findSpoilerLeaks(title, context.answerKeys)) {
    issues.push({ code: "SPOILER", severity: "blocker", detail: `Reveals the correct answer "${leak.answerText}".` });
  }
  return issues;
}

/** Runs every deterministic YouTube SEO and safety check against a sanitized draft. */
export function reviewTitleDraft(draft: TitleDraft, context: TitleReviewContext): TitleIssue[] {
  if (!draft.title) return [{ code: "EMPTY", severity: "blocker", detail: "Title is empty." }];
  return [...collectFormatIssues(draft.title), ...collectKeywordIssues(draft), ...collectContentIssues(draft.title, context)];
}

export function hasBlockingIssue(issues: TitleIssue[]): boolean {
  return issues.some((issue) => issue.severity === "blocker");
}
