import type { AiThumbnailPlanOutput } from "./thumbnailAiPlanTypes.js";

/** Matches the C0 control characters U+0000-U+0008, U+000B, U+000C and U+000E-U+001F. */
function isStrippedControlCharacter(character: string): boolean {
  const code = character.charCodeAt(0);
  return code <= 0x08 || code === 0x0b || code === 0x0c || (code >= 0x0e && code <= 0x1f);
}

function stripControlCharacters(text: string): string {
  return Array.from(text)
    .filter((character) => !isStrippedControlCharacter(character))
    .join("");
}

function extractJsonCandidate(rawOutput: string): string {
  const fenceMatch = rawOutput.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const fenced = fenceMatch ? fenceMatch[1].trim() : "";
  if (fenced) return fenced;

  const firstBrace = rawOutput.indexOf("{");
  const lastBrace = rawOutput.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return rawOutput.slice(firstBrace, lastBrace + 1).trim();
  }
  return rawOutput.trim();
}

export function parseAiPlanJson(rawOutput: string): AiThumbnailPlanOutput | null {
  if (!rawOutput || typeof rawOutput !== "string") return null;

  try {
    const candidate = extractJsonCandidate(rawOutput);
    try {
      return JSON.parse(candidate) as AiThumbnailPlanOutput;
    } catch {
      // Clean common LLM formatting flaws: trailing commas, single-line comments, control characters
      const cleaned = stripControlCharacters(candidate.replace(/,\s*([}\]])/g, "$1").replace(/\/\/[^\n\r]*/g, ""));
      return JSON.parse(cleaned) as AiThumbnailPlanOutput;
    }
  } catch {
    return null;
  }
}
