export const QUIZ_ASSET_SUBJECT_MAX_LENGTH = 280;

/**
 * Image prompts can contain a complete camera/style brief, while the asset
 * schema deliberately keeps `subject` short and semantic. Preserve the first
 * complete descriptive clauses, then safely trim on a word boundary; the
 * prompt compiler supplies the shared visual-style contract separately.
 */
export function compactQuizAssetSubject(value: string, fallback: string): string {
  const normalized = value.normalize("NFKC").replace(/\s+/g, " ").trim();
  const source = normalized || fallback.normalize("NFKC").replace(/\s+/g, " ").trim() || "Quiz subject";
  if (source.length <= QUIZ_ASSET_SUBJECT_MAX_LENGTH) return source;

  const clauses = source.split(/(?<=[,;:.!?])\s+/u);
  let compact = "";
  for (const clause of clauses) {
    const candidate = compact ? `${compact} ${clause}` : clause;
    if (candidate.length > QUIZ_ASSET_SUBJECT_MAX_LENGTH) break;
    compact = candidate;
  }
  if (compact.length >= 24) return compact.replace(/[,:;\-–—]+$/u, "").trim();

  const fragment = source.slice(0, QUIZ_ASSET_SUBJECT_MAX_LENGTH).trimEnd();
  const boundary = fragment.lastIndexOf(" ");
  const safe = boundary >= Math.floor(QUIZ_ASSET_SUBJECT_MAX_LENGTH * 0.55) ? fragment.slice(0, boundary) : fragment;
  return safe.replace(/[,:;\-–—]+$/u, "").trim() || "Quiz subject";
}
