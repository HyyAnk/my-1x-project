import type { ThumbnailAspectRatio, ThumbnailLayoutType } from "@studio/shared";

/**
 * Strips forbidden emoji stickers and unicode checkmarks/crosses from AI prompt text.
 */
export function stripForbiddenStickers(text: string): string {
  return text
    .replace(/[✅❌✓✗✔✖]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Sanitizes true/false and yes/no prompt text to ensure binary buttons only appear in the designated
 * tactile pushbuttons at the base, eliminating duplicate labels on props, mascots, or backgrounds.
 */
export function sanitizeBinaryPromptTokens(prompt: string): string {
  let sanitized = prompt;

  // Replace any accidental mascot prop mentions of true/false or yes/no paddles or signs
  sanitized = sanitized.replace(
    /\b(paddle|sign|placard|card)\s+with\s+(?:'|")?(?:true|false|yes|no)(?:\s+(?:or|\/)\s+(?:true|false|yes|no))?(?:'|")?\b/gi,
    "hand resting thoughtfully under chin in skeptical contemplation",
  );

  // Replace standalone true/false or yes/no paddle mentions
  sanitized = sanitized.replace(
    /\b(?:true|false|yes|no)\s+(?:paddle|sign|card)\b/gi,
    "thoughtful contemplation gesture",
  );

  return sanitized;
}

export const sanitizeTrueFalsePromptTokens = sanitizeBinaryPromptTokens;

/**
 * Ensures safe-zone directives are present and properly phrased for the given aspect ratio.
 */
export function ensureSafeZoneDirectives(prompt: string, aspectRatio: ThumbnailAspectRatio): string {
  if (aspectRatio === "16:9") {
    if (!prompt.includes("bottom-right corner")) {
      return `${prompt} Keep the bottom-right corner clean with zero text (YouTube timestamp safe zone).`;
    }
    return prompt;
  }

  // 9:16 vertical shorts format
  let updated = prompt;
  if (!updated.includes("440px bottom buffer") && !updated.includes("bottom 25%")) {
    updated = `${updated} STRICT SAFE ZONE: Enforce 440px bottom buffer / clear bottom 25% safe zone area free of text, crucial visual focal points, or mascot details to avoid vertical TikTok/Shorts UI overlays. Center all crucial subjects, text hooks, and mascot within the middle 60% vertical safe zone.`;
  }
  return updated;
}

/**
 * Sanitizes and normalizes compiled thumbnail prompt strings:
 * - Strips forbidden stickers and glyphs (✅, ❌, ✓, ✗).
 * - Enforces single-location button rules for true_false and yes_no layouts.
 * - Collapses duplicate whitespace and redundant punctuation.
 * - Verifies safe-zone compliance.
 */
export function sanitizeCompiledPrompt(
  rawPrompt: string,
  layout: ThumbnailLayoutType,
  aspectRatio: ThumbnailAspectRatio,
): string {
  let cleaned = stripForbiddenStickers(rawPrompt);

  if (layout === "true_false" || layout === "yes_no") {
    cleaned = sanitizeBinaryPromptTokens(cleaned);
  }

  // Normalize punctuation and spacing
  cleaned = cleaned
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return ensureSafeZoneDirectives(cleaned, aspectRatio);
}
