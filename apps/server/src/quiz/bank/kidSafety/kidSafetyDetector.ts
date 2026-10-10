import type {
  KidSafetyCategory,
  KidSafetyField,
  KidSafetyFinding,
  KidSafetyScreenableEntity,
  KidSafetyScreenableQuestion,
} from "./kidSafety.types.js";
import {
  KID_SAFE_PHRASE_ALLOWLIST,
  KID_UNSAFE_ON_SCREEN_PATTERNS,
  KID_UNSAFE_TOPIC_PATTERNS,
  MATURE_FRANCHISE_TITLES,
} from "./kidSafetyLexicon.js";

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const wholeTermPattern = (alternatives: string) => new RegExp(`(?<![\\w-])(?:${alternatives})(?![\\w-])`);

const MATURE_FRANCHISE_PATTERNS = MATURE_FRANCHISE_TITLES.map((title) => [title, wholeTermPattern(escapeRegExp(title))] as const);
/** Matches whenever any single title pattern would, so the common clean case costs one scan instead of one per title. */
const ANY_MATURE_FRANCHISE_PATTERN = wholeTermPattern(MATURE_FRANCHISE_TITLES.map(escapeRegExp).join("|"));

const TOPIC_PATTERN_ENTRIES = Object.entries(KID_UNSAFE_TOPIC_PATTERNS) as Array<[KidSafetyCategory, RegExp]>;
const ON_SCREEN_PATTERN_ENTRIES = Object.entries(KID_UNSAFE_ON_SCREEN_PATTERNS) as Array<[KidSafetyCategory, RegExp]>;
const ON_SCREEN_FIELDS: ReadonlySet<KidSafetyField> = new Set(["question", "choices"]);

function stripAllowlistedPhrases(text: string): string {
  return KID_SAFE_PHRASE_ALLOWLIST.reduce((current, pattern) => current.replace(pattern, " "), text);
}

/**
 * Returns the first kid-unsafe term found in free text, or null when the text is suitable for children.
 * On-screen text (the question and its choices) is also screened for drinks that are fine only as passing mentions.
 */
export function findKidUnsafeTerm(
  text: string,
  options: { onScreen?: boolean } = {},
): { category: KidSafetyCategory; term: string } | null {
  if (!text.trim()) return null;
  const franchise = findMatureFranchise(text);
  return franchise ? { category: "mature_franchise", term: franchise } : findKidUnsafeTopic(text, options);
}

/** Like findKidUnsafeTerm, but ignores franchise titles and screens only for unsuitable topics. */
export function findKidUnsafeTopic(
  text: string,
  options: { onScreen?: boolean } = {},
): { category: KidSafetyCategory; term: string } | null {
  if (!text.trim()) return null;
  const screened = stripAllowlistedPhrases(text);
  const topicPatterns = options.onScreen ? [...TOPIC_PATTERN_ENTRIES, ...ON_SCREEN_PATTERN_ENTRIES] : TOPIC_PATTERN_ENTRIES;
  for (const [category, pattern] of topicPatterns) {
    const match = pattern.exec(screened);
    if (match) return { category, term: match[0] };
  }
  return null;
}

function screenableFields(question: KidSafetyScreenableQuestion): Array<[KidSafetyField, string]> {
  return [
    ["question", question.question],
    ["choices", question.choices.map((choice) => choice.text).join(" | ")],
    ["explanation", question.explanation ?? ""],
    ["fun_fact", question.fun_fact ?? ""],
  ];
}

/**
 * Screens every viewer-facing field of a question (on-screen text and narration) for content
 * unsuitable for a kids and family audience. Returns the first finding, or null when safe.
 */
export function detectKidSafetyIssue(question: KidSafetyScreenableQuestion): KidSafetyFinding | null {
  for (const [field, text] of screenableFields(question)) {
    const hit = findKidUnsafeTerm(text, { onScreen: ON_SCREEN_FIELDS.has(field) });
    if (hit) return { ...hit, field };
  }
  return null;
}

/** Returns the teen- or adult-rated franchise a text refers to (e.g. "Kratos from God of War"), or null. */
export function findMatureFranchise(text: string): string | null {
  const screened = stripAllowlistedPhrases(text);
  if (!ANY_MATURE_FRANCHISE_PATTERN.test(screened)) return null;
  return MATURE_FRANCHISE_PATTERNS.find(([, pattern]) => pattern.test(screened))?.[0] ?? null;
}

/** A franchise named in this many clues is what the entity is about, not a passing mention (e.g. a console's exclusives). */
const FRANCHISE_MEMBERSHIP_TRAIT_COUNT = 2;

/**
 * The name, visual anchor, and first (defining) clue say what an entity is; a franchise named there,
 * or in several clues, means the entity belongs to it.
 */
function belongsToMatureFranchise(entity: KidSafetyScreenableEntity): boolean {
  const traits = entity.core_traits ?? [];
  const defining = [entity.name, entity.visual_anchor ?? "", traits[0] ?? ""];
  if (defining.some((text) => findMatureFranchise(text) !== null)) return true;
  return traits.filter((trait) => findMatureFranchise(trait) !== null).length >= FRANCHISE_MEMBERSHIP_TRAIT_COUNT;
}

/**
 * True when a Knowledge Base entity may be used as a generation subject for a kids and family channel:
 * its name and aliases are suitable on screen and it does not belong to a teen- or adult-rated franchise.
 * Aliases are screened for topics only, so epithets such as Ares' "God of War" do not read as the game.
 * Individual unsuitable clues are stripped separately so ordinary subjects (France, Medusa) stay usable.
 */
export function isKidSafeEntity(entity: KidSafetyScreenableEntity): boolean {
  if (belongsToMatureFranchise(entity)) return false;
  const identity = [entity.name, ...(entity.aliases ?? [])];
  return identity.every((text) => findKidUnsafeTopic(text, { onScreen: true }) === null);
}

export function describeKidSafetyFinding(finding: KidSafetyFinding): string {
  return `Content is not suitable for a kids and family audience (${finding.category.replace(/_/g, " ")}: "${finding.term}" in ${finding.field.replace("_", " ")}).`;
}
