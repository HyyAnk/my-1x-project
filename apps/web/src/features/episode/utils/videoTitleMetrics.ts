import { VIDEO_TITLE_KEYWORD_WINDOW_CHARS, VIDEO_TITLE_MAX_CHARS, VIDEO_TITLE_VISIBLE_CHARS } from "@studio/shared";

export type TitleLengthStatus = "optimal" | "truncated" | "overflow";

export interface TitleSeoMetrics {
  charCount: number;
  lengthStatus: TitleLengthStatus;
  /** True when the primary keyword starts within the front-loaded window. */
  keywordFrontLoaded: boolean;
  keywordPresent: boolean;
}

export function resolveTitleLengthStatus(charCount: number): TitleLengthStatus {
  if (charCount > VIDEO_TITLE_MAX_CHARS) return "overflow";
  if (charCount > VIDEO_TITLE_VISIBLE_CHARS) return "truncated";
  return "optimal";
}

export function computeTitleSeoMetrics(title: string, primaryKeyword: string): TitleSeoMetrics {
  const keyword = primaryKeyword.normalize("NFKC").toLowerCase().trim();
  const position = keyword ? title.normalize("NFKC").toLowerCase().indexOf(keyword) : -1;
  return {
    charCount: title.length,
    lengthStatus: resolveTitleLengthStatus(title.length),
    keywordPresent: position !== -1,
    keywordFrontLoaded: position !== -1 && position <= VIDEO_TITLE_KEYWORD_WINDOW_CHARS,
  };
}
