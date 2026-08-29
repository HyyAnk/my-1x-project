export * from "./countries.js";
export * from "./continuity.js";

export function nowIso(): string {
  return new Date().toISOString();
}

export function makeId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "").slice(0, 16)}`;
}

export function estimateSpokenSeconds(dialogue: string, wordsPerSecond: number): number {
  const words = dialogue.trim().split(/\s+/).filter(Boolean).length;
  return words / Math.max(0.1, wordsPerSecond);
}
