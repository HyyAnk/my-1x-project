import type { VisualSafetyValidation, VisualProxyRule } from "./sanitizer/sanitizerTypes.js";
import {
  sanitizeSubjectString,
  sanitizePromptString,
  validateSafety,
} from "./sanitizer/visualPromptSanitizerCore.js";

export type { VisualSafetyValidation, VisualProxyRule };

/**
 * Sanitizes an image prompt subject string, replacing known trademark characters,
 * franchises, and sensitive terms with safe, vivid, generic visual artistic proxies.
 */
export function sanitizeVisualSubject(subject: string): string {
  if (!subject || typeof subject !== "string") return "";
  return sanitizeSubjectString(subject);
}

/**
 * Sanitizes a full compiled image prompt string before dispatching to image generation providers.
 * Scans for any prohibited trademark names or brand terms and replaces them with safe generic descriptions.
 */
export function sanitizeVisualPrompt(prompt: string): string {
  if (!prompt || typeof prompt !== "string") return "";
  return sanitizePromptString(prompt);
}

/**
 * Pre-flight check to verify if a prompt or subject contains prohibited visual terms.
 */
export function containsProhibitedVisualTerms(text: string): { found: boolean; term?: string } {
  const result = validateSafety(text);
  return {
    found: !result.safe,
    term: result.violations[0],
  };
}

/**
 * Validates whether a visual prompt is safe for dispatch to AI image providers.
 */
export function validateVisualPromptSafety(prompt: string): VisualSafetyValidation {
  return validateSafety(prompt);
}
