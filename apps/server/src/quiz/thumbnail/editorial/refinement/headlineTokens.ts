const WORD_SEGMENTER = new Intl.Segmenter(undefined, { granularity: "word" });

/** Lowercases and strips a simple plural/possessive so "SECRETS" and "secret's" compare equal to "secret". */
export function stemHeadlineToken(token: string): string {
  const lower = token.toLowerCase().replace(/['’]s$/, "");
  if (lower.length > 3 && lower.endsWith("s") && !/(ss|us|is)$/.test(lower)) return lower.slice(0, -1);
  return lower;
}

export function tokenizeHeadlineText(text: string): string[] {
  return [...WORD_SEGMENTER.segment(text)].filter((segment) => segment.isWordLike).map((segment) => stemHeadlineToken(segment.segment));
}
