import type { QuizShortTitleCanvas } from "@studio/shared";

/** Vertical space the title card reserves around the title text inside the canvas. */
export const SHORT_INTRO_CARD_PADDING_PX = 40;
export const SHORT_INTRO_BADGE_BLOCK_PX = 128;
export const SHORT_INTRO_TITLE_LINE_HEIGHT = 1.08;
export const SHORT_INTRO_TITLE_MAX_FONT_PX = 132;
export const SHORT_INTRO_TITLE_MIN_FONT_PX = 60;
const MAX_TITLE_LINES = 5;
/** Average advance of a heavy rounded display face relative to its size; CJK glyphs are square. */
const LATIN_CHAR_WIDTH_RATIO = 0.56;
const WIDE_CHAR_WIDTH_RATIO = 1.0;
const WIDE_CHAR = /[⺀-鿿가-힯豈-﫿＀-￯]/;

export type ShortIntroTitleLayout = {
  fontSizePx: number;
  lineCount: number;
  words: string[];
};

function measureWidth(text: string, fontSizePx: number): number {
  let width = 0;
  for (const char of text) width += (WIDE_CHAR.test(char) ? WIDE_CHAR_WIDTH_RATIO : LATIN_CHAR_WIDTH_RATIO) * fontSizePx;
  return width;
}

/** Greedy word wrap; a single word wider than the line still takes one line of its own. */
export function wrapTitleLines(words: string[], fontSizePx: number, maxWidthPx: number): string[] {
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && measureWidth(candidate, fontSizePx) > maxWidthPx) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function isCharacterScript(title: string): boolean {
  const trimmed = title.trim();
  return !trimmed.includes(" ") && WIDE_CHAR.test(trimmed);
}

/** Splits on spaces, or per character for scripts written without spaces (Chinese, Japanese). */
export function splitTitleWords(title: string): string[] {
  const trimmed = title.trim().replace(/\s+/g, " ");
  if (!trimmed) return [];
  return isCharacterScript(trimmed) ? Array.from(trimmed) : trimmed.split(" ");
}

function fitsCanvas(lines: string[], fontSizePx: number, widthPx: number, heightPx: number): boolean {
  if (lines.length > MAX_TITLE_LINES) return false;
  if (lines.some((line) => measureWidth(line, fontSizePx) > widthPx)) return false;
  return lines.length * fontSizePx * SHORT_INTRO_TITLE_LINE_HEIGHT <= heightPx;
}

/**
 * Picks the largest title size whose wrapped lines fit the blank canvas of the intro loop after
 * the badge is reserved. Long titles fall back to the minimum size.
 */
export function layoutShortIntroTitle(title: string, canvas: QuizShortTitleCanvas): ShortIntroTitleLayout {
  const words = splitTitleWords(title);
  const textWidth = Math.max(120, canvas.width - SHORT_INTRO_CARD_PADDING_PX * 2);
  const textHeight = Math.max(120, canvas.height - SHORT_INTRO_CARD_PADDING_PX * 2 - SHORT_INTRO_BADGE_BLOCK_PX);
  const wrap = (size: number) =>
    isCharacterScript(title) ? wrapCharacters(words, size, textWidth) : wrapTitleLines(words, size, textWidth);
  for (let size = SHORT_INTRO_TITLE_MAX_FONT_PX; size >= SHORT_INTRO_TITLE_MIN_FONT_PX; size -= 4) {
    const lines = wrap(size);
    if (fitsCanvas(lines, size, textWidth, textHeight)) return { fontSizePx: size, lineCount: lines.length, words };
  }
  return { fontSizePx: SHORT_INTRO_TITLE_MIN_FONT_PX, lineCount: wrap(SHORT_INTRO_TITLE_MIN_FONT_PX).length, words };
}

function wrapCharacters(chars: string[], fontSizePx: number, maxWidthPx: number): string[] {
  const perLine = Math.max(1, Math.floor(maxWidthPx / (WIDE_CHAR_WIDTH_RATIO * fontSizePx)));
  const lines: string[] = [];
  for (let index = 0; index < chars.length; index += perLine) lines.push(chars.slice(index, index + perLine).join(""));
  return lines;
}
