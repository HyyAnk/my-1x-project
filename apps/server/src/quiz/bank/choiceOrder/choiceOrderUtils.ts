import type { BankGameplayArchetypeId } from "@studio/shared";

/**
 * Archetypes whose visible choice order is fixed by design:
 * Yes/No buttons always render Yes first, and a mystery reveal shows a single answer.
 */
const FIXED_ORDER_ARCHETYPES: ReadonlySet<string> = new Set<BankGameplayArchetypeId>(["verdict_yes_no", "mystery_reveal"]);

export function hasFixedChoiceOrder(archetypeId: string | undefined, choiceCount: number): boolean {
  return choiceCount < 2 || (archetypeId !== undefined && FIXED_ORDER_ARCHETYPES.has(archetypeId));
}

/**
 * Deterministic 32-bit FNV-1a hash so the same question always receives the same choice order.
 */
export function stableHash(text: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

/**
 * Moves the correct choice to `targetIndex`, keeping the distractors in their original relative order.
 */
export function placeCorrectChoiceAt<T extends { id: string }>(choices: readonly T[], correctId: string, targetIndex: number): T[] {
  const correct = choices.find((choice) => choice.id === correctId);
  if (!correct || targetIndex < 0 || targetIndex >= choices.length) return [...choices];
  const distractors = choices.filter((choice) => choice !== correct);
  return [...distractors.slice(0, targetIndex), correct, ...distractors.slice(targetIndex)];
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findName(question: string, name: string): { index: number; text: string } | null {
  const start = /^\w/.test(name) ? "\\b" : "";
  const end = /\w$/.test(name) ? "\\b" : "";
  const match = new RegExp(`${start}${escapeRegExp(name)}${end}`, "i").exec(question);
  return match ? { index: match.index, text: match[0] } : null;
}

function matchCase(replacement: string, original: string): string {
  return original === original.toLowerCase() ? replacement.toLowerCase() : replacement;
}

/**
 * After the two versus choices trade sides, rewrites a stem that names both contenders in the old
 * left/right order ("Belgium vs Netherlands: ...") so the spoken order keeps matching the split screen.
 * Stems that name only one contender, or already name them in the new order, are returned unchanged.
 */
export function swapContenderNamesInStem(question: string, previousLeft: string, previousRight: string): string {
  const left = previousLeft.trim();
  const right = previousRight.trim();
  if (!left || !right || left.toLowerCase() === right.toLowerCase()) return question;

  const leftMatch = findName(question, left);
  const rightMatch = findName(question, right);
  if (!leftMatch || !rightMatch || leftMatch.index + leftMatch.text.length > rightMatch.index) return question;

  return (
    question.slice(0, leftMatch.index) +
    matchCase(right, leftMatch.text) +
    question.slice(leftMatch.index + leftMatch.text.length, rightMatch.index) +
    matchCase(left, rightMatch.text) +
    question.slice(rightMatch.index + rightMatch.text.length)
  );
}
