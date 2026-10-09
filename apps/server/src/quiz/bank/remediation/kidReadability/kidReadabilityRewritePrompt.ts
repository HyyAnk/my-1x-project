import { KID_AUDIENCE_POLICY_LINES } from "../../prompts/kidAudiencePolicy.js";
import type { KidReadabilityRewriteInput } from "./kidReadabilityRewrite.types.js";

/**
 * Builds a prompt that rewrites the narrated explanation and fun fact of several bank questions
 * for children aged 6-12 while keeping every fact unchanged.
 */
export function buildKidReadabilityRewritePrompt(items: readonly KidReadabilityRewriteInput[]): string {
  const payload = items.map((item) => ({
    id: item.id,
    question: item.question,
    correct_answer: item.correctAnswer,
    explanation: item.explanation,
    fun_fact: item.funFact,
  }));
  return [
    "You are a children's TV quiz writer. Rewrite the narrated 'explanation' and 'fun_fact' of each quiz question below so a 9-year-old understands them instantly when read aloud.",
    "",
    ...KID_AUDIENCE_POLICY_LINES,
    "",
    "=== REWRITE RULES ===",
    "1. KEEP THE FACTS: never change, add, or invent facts, numbers, names, or the correct answer. Only simplify the wording.",
    "2. EXPLANATION: name the correct answer plainly (for Yes/No questions, start with 'Yes!' or 'No!'), then one simple reason. 1-2 sentences, at most 25 words.",
    "3. FUN FACT: one cheerful, surprising sentence of at most 20 words. If the original fun fact is unsuitable for children, replace it with a different true, kid-friendly fact about the same subject.",
    "4. Never refer to choices by letter (A, B, C). Never use double quotes inside values; use single quotes for titles and names.",
    "5. Write 100% in English.",
    "",
    "=== QUESTIONS (JSON) ===",
    JSON.stringify(payload, null, 1),
    "",
    "=== OUTPUT CONTRACT ===",
    `Return ONLY a JSON array with exactly ${items.length} objects, one per input id, in the same order: [{ "id": "...", "explanation": "...", "fun_fact": "..." }]. No markdown, no commentary.`,
  ].join("\n");
}

/** Index just past the bracket that closes the array opened at `start`, skipping brackets inside strings. */
function findArrayEnd(text: string, start: number): number {
  let depth = 0;
  let inString = false;
  for (let index = start; index < text.length; index++) {
    const char = text[index];
    if (inString) {
      if (char === "\\") index++;
      else if (char === '"') inString = false;
    } else if (char === '"') inString = true;
    else if (char === "[") depth++;
    else if (char === "]" && --depth === 0) return index + 1;
  }
  return -1;
}

/** Models sometimes add commentary or a second block after the array; only the first complete array is read. */
function extractJsonArray(rawOutput: string): unknown {
  const start = rawOutput.indexOf("[");
  const end = start === -1 ? -1 : findArrayEnd(rawOutput, start);
  if (end === -1) throw new Error("Rewrite output does not contain a complete JSON array.");
  return JSON.parse(rawOutput.slice(start, end));
}

/** Parses the model's rewrite array into id-keyed explanation and fun fact strings. Invalid entries are skipped. */
export function parseKidReadabilityRewriteOutput(rawOutput: string): Map<string, { explanation: string; funFact: string }> {
  const parsed = extractJsonArray(rawOutput);
  if (!Array.isArray(parsed)) throw new Error("Rewrite output must be a JSON array.");
  const rewrites = new Map<string, { explanation: string; funFact: string }>();
  for (const entry of parsed) {
    if (typeof entry !== "object" || entry === null) continue;
    const record = entry as Record<string, unknown>;
    if (typeof record.id !== "string" || typeof record.explanation !== "string") continue;
    rewrites.set(record.id.trim(), {
      explanation: record.explanation.trim(),
      funFact: typeof record.fun_fact === "string" ? record.fun_fact.trim() : "",
    });
  }
  return rewrites;
}
