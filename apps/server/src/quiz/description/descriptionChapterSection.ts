import type { QuizTimeline } from "@studio/shared";
import type { DescriptionChapter } from "./description.types.js";
import { buildDescriptionChapters, formatChaptersBlock } from "./descriptionChapters.js";
import { ALL_CHAPTER_HEADERS, ALL_SCORING_HEADERS, getDescriptionSectionLocale } from "./descriptionSectionLocales.js";

const PARAGRAPH_SEPARATOR = /\n\s*\n/;
const HASHTAG_ONLY_PARAGRAPH = /^(?:#\S+\s*)+$/u;

function splitParagraphs(text: string): string[] {
  return text
    .split(PARAGRAPH_SEPARATOR)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function startsWithAny(paragraph: string, headers: readonly string[]): boolean {
  const firstLine = paragraph.split("\n")[0].trim();
  return headers.some((header) => firstLine === header);
}

function resolveInsertIndex(paragraphs: string[]): number {
  const scoringIndex = paragraphs.findIndex((paragraph) => startsWithAny(paragraph, ALL_SCORING_HEADERS));
  if (scoringIndex !== -1) return scoringIndex;
  const lastIndex = paragraphs.length - 1;
  if (lastIndex >= 0 && HASHTAG_ONLY_PARAGRAPH.test(paragraphs[lastIndex])) return lastIndex;
  return paragraphs.length;
}

/**
 * Replaces (or inserts, or removes when empty) the chapter block inside a description,
 * preserving every other paragraph the creator may have edited by hand.
 */
export function upsertChaptersSection(text: string, chaptersBlock: string): string {
  const paragraphs = splitParagraphs(text);
  const existingIndex = paragraphs.findIndex((paragraph) => startsWithAny(paragraph, ALL_CHAPTER_HEADERS));

  if (existingIndex !== -1) {
    if (chaptersBlock) paragraphs[existingIndex] = chaptersBlock;
    else paragraphs.splice(existingIndex, 1);
    return paragraphs.join("\n\n");
  }

  if (chaptersBlock) paragraphs.splice(resolveInsertIndex(paragraphs), 0, chaptersBlock);
  return paragraphs.join("\n\n");
}

export interface RefreshDescriptionChaptersInput {
  text: string;
  timeline: QuizTimeline | null;
  language?: string;
  videoDurationSeconds?: number;
}

/**
 * Rebuilds chapters from the latest timeline so exports never ship stale timestamps
 * after intro toggles or voice re-timing. Without a timeline the text is left untouched.
 */
export function refreshDescriptionChapters(input: RefreshDescriptionChaptersInput): { text: string; chapters: DescriptionChapter[] } {
  if (!input.timeline || !input.text.trim()) return { text: input.text, chapters: [] };
  const locale = getDescriptionSectionLocale(input.language);
  const chapters = buildDescriptionChapters(input.timeline, locale.chapterLabels, input.videoDurationSeconds);
  const text = upsertChaptersSection(input.text, formatChaptersBlock(chapters, locale.chaptersHeader));
  return { text, chapters };
}
