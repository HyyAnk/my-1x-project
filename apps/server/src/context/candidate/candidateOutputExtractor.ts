/**
 * Utility for extracting raw candidate data from LLM responses.
 * Handles markdown fences, JSON objects with nested candidate/topic arrays,
 * and embedded JSON substrings.
 */

export function extractRawCandidates(rawOutput: unknown): unknown[] {
  if (Array.isArray(rawOutput)) {
    return rawOutput;
  }

  if (typeof rawOutput === "object" && rawOutput !== null) {
    const record = rawOutput as Record<string, unknown>;
    if (Array.isArray(record.candidates)) {
      return record.candidates;
    }
    if (Array.isArray(record.topics)) {
      return record.topics;
    }
  }

  if (typeof rawOutput === "string") {
    let clean = rawOutput.trim();
    clean = clean
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    try {
      const parsed: unknown = JSON.parse(clean);
      return extractRawCandidates(parsed);
    } catch {
      const startIdx = clean.indexOf("[");
      const endIdx = clean.lastIndexOf("]");
      if (startIdx !== -1 && endIdx > startIdx) {
        try {
          const parsed: unknown = JSON.parse(clean.substring(startIdx, endIdx + 1));
          if (Array.isArray(parsed)) return parsed;
        } catch {
          // Fall through to next check
        }
      }

      const objStart = clean.indexOf("{");
      const objEnd = clean.lastIndexOf("}");
      if (objStart !== -1 && objEnd > objStart) {
        try {
          const parsed: unknown = JSON.parse(clean.substring(objStart, objEnd + 1));
          return extractRawCandidates(parsed);
        } catch {
          // Fall through to throw
        }
      }
    }
  }

  throw new Error("Raw output does not contain an array of topic candidates");
}
