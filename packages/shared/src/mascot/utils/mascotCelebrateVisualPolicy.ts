const EXCLUDED_CELEBRATE_VISUAL_PATTERNS: readonly RegExp[] = [
  /\bconfetti\b/i,
  /\bparty\s+(?:popper|cannon|horn)s?\b/i,
  /\bstreamers?\b/i,
  /\bsparklers?\b/i,
  /\bglitter(?:ing|y)?\b/i,
  /\bcelebration\s+wand\b/i,
  /\b(?:floating|bright|glittering)\s+stars?\b/i,
  /\b(?:celebratory|star)\s+sparkles?\b/i,
  /\b(?:floating\s+)?paper\s+(?:bits|pieces|shapes)\b/i,
  /\bparticle\s+(?:bursts?|explosions?)\b/i,
  /\b(?:colorful\s+)?stream\s+explosions?\b/i,
];

export const MASCOT_CELEBRATE_SAFE_FALLBACK_PROMPT =
  "Joyful victory pose with both arms raised, an energetic stance, and a big radiant smile";

export function hasExcludedMascotCelebrateVisual(prompt: string): boolean {
  return EXCLUDED_CELEBRATE_VISUAL_PATTERNS.some((pattern) => pattern.test(prompt));
}

export function resolveSafeMascotCelebratePrompt(prompt: string, fallbackPrompt = MASCOT_CELEBRATE_SAFE_FALLBACK_PROMPT): string {
  const requestedPrompt = prompt.trim();
  if (requestedPrompt && !hasExcludedMascotCelebrateVisual(requestedPrompt)) return requestedPrompt;

  const requestedFallback = fallbackPrompt.trim();
  return requestedFallback && !hasExcludedMascotCelebrateVisual(requestedFallback)
    ? requestedFallback
    : MASCOT_CELEBRATE_SAFE_FALLBACK_PROMPT;
}
