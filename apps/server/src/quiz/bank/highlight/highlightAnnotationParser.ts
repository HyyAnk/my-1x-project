import { resolveQuestionHighlightPhrase } from "../../formatting/questionHighlightPhrase.js";
import type { HighlightAnnotationSubject } from "./highlightAnnotation.types.js";

function extractJsonObject(rawOutput: string): Record<string, unknown> | null {
  const fenced = rawOutput.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)?.[1];
  const text = (fenced ?? rawOutput).trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const parsed: unknown = JSON.parse(text.slice(start, end + 1));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/**
 * Reads the model's `{ id: phrase }` reply and keeps only phrases that are valid spans of their question.
 * Returns a map from question id to the phrase in the question's own casing.
 */
export function parseHighlightAnnotationOutput(
  rawOutput: string,
  subjects: readonly HighlightAnnotationSubject[],
): Map<string, string> {
  const phrasesById = extractJsonObject(rawOutput) ?? {};
  const resolved = new Map<string, string>();
  for (const subject of subjects) {
    const phrase = resolveQuestionHighlightPhrase(subject.question, phrasesById[subject.id]);
    if (phrase) resolved.set(subject.id, phrase);
  }
  return resolved;
}
