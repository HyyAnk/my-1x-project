export type UnknownRecord = Record<string, unknown>;

export function isUnknownRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

/**
 * Reads a property from an untrusted value the same way plain property access would:
 * primitives yield undefined, while null or undefined raise a TypeError.
 */
export function readUntrustedField(value: unknown, key: string): unknown {
  if (value === null || value === undefined) {
    throw new TypeError(`Cannot read properties of ${String(value)} (reading '${key}')`);
  }
  return isUnknownRecord(value) ? value[key] : undefined;
}

export function stripJsonCodeFence(rawOutput: string): string {
  return rawOutput
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

export function parseRemediationJson(cleanedOutput: string): unknown {
  try {
    return JSON.parse(cleanedOutput) as unknown;
  } catch (err) {
    throw new Error(`Failed to parse remediation LLM JSON output: ${(err as Error).message}`, { cause: err });
  }
}

interface StringConvertible {
  toString(): string;
}

function isStringablePrimitive(value: unknown): value is number | boolean | bigint | symbol {
  const valueType = typeof value;
  return valueType === "number" || valueType === "boolean" || valueType === "bigint" || valueType === "symbol";
}

/**
 * Converts an untrusted JSON value to text with the exact semantics of String(value).
 */
export function stringifyUntrustedValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (value === null) return "null";
  if (typeof value === "object" || typeof value === "function") {
    const convertible: StringConvertible = value;
    return String(convertible);
  }
  if (isStringablePrimitive(value)) return String(value);
  return "undefined";
}
