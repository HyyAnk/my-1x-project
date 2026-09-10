import { GeneratedReelPublishingSchema, type GeneratedReelPublishing } from "@studio/shared";

/**
 * Parses and strictly validates LLM-generated publishing JSON.
 *
 * Requirements:
 * - Exactly two fields: "title" (<=80 chars) and "description" (<=600 chars)
 * - Strict schema validation: rejects extra fields, missing fields, or out-of-bound strings
 * - Returns null on any validation failure, malformed JSON, or out-of-range character counts
 */
export function parsePublishingJson(raw: string): GeneratedReelPublishing | null {
  if (!raw || typeof raw !== "string") return null;

  const trimmed = raw.trim();

  // Extract candidate JSON strings (raw, inside code blocks, or between outermost curly braces)
  const codeBlocks = [...trimmed.matchAll(/```(?:json)?\s*([\s\S]*?)\s*```/gi)].map((m) => m[1].trim());

  const candidates: string[] = [];
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    candidates.push(trimmed);
  }
  candidates.push(...codeBlocks);

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    candidates.push(trimmed.slice(firstBrace, lastBrace + 1));
  }

  for (const candidate of candidates) {
    try {
      const parsed: unknown = JSON.parse(candidate);
      const result = GeneratedReelPublishingSchema.safeParse(parsed);
      if (result.success) {
        return result.data;
      }
    } catch {
      // Continue to next candidate
    }
  }

  return null;
}
