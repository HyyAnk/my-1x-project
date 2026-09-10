import type { VisualProxyRule, VisualSafetyValidation } from "./sanitizerTypes.js";
import { EXTENDED_VISUAL_RULES } from "./extendedVisualRules.js";
import { buildStage1VisualProxyRules } from "./stage1ProxyAdapter.js";

const ALL_RULES: VisualProxyRule[] = [
  ...EXTENDED_VISUAL_RULES,
  ...buildStage1VisualProxyRules(),
];

const BRAND_SCRUBBERS: Array<[RegExp, string]> = [
  [/\b(?:nintendo|bandai\s+namco|konami|capcom)\b/gi, "retro arcade studio"],
  [/\bpok[eé]mon\b/gi, "fantasy creature"],
  [/\bpok[eé]ball\b/gi, "energy capsule"],
  [/\b(?:marvel|dc\s+comics)\b/gi, "superhero fiction"],
  [/\bmojang\b/gi, "voxel game studio"],
];

function isPrimarilySubjectMatch(text: string, matchLength: number): boolean {
  const trimmed = text.trim();
  if (trimmed.length <= matchLength + 10) return true;
  return matchLength / trimmed.length >= 0.6;
}

export function sanitizeSubjectString(subject: string): string {
  let result = subject.trim();
  for (const rule of ALL_RULES) {
    const match = result.match(rule.pattern);
    if (!match) continue;

    if (isPrimarilySubjectMatch(result, match[0].length)) {
      return rule.fullProxy;
    }
    result = result.replace(rule.pattern, rule.inlineProxy);
  }

  for (const [pattern, replacement] of BRAND_SCRUBBERS) {
    result = result.replace(pattern, replacement);
  }

  return result.replace(/\s{2,}/g, " ").trim();
}

export function sanitizePromptString(prompt: string): string {
  let sanitized = prompt;

  for (const rule of ALL_RULES) {
    if (rule.pattern.test(sanitized)) {
      sanitized = sanitized.replace(rule.pattern, rule.inlineProxy);
    }
  }

  for (const [pattern, replacement] of BRAND_SCRUBBERS) {
    sanitized = sanitized.replace(pattern, replacement);
  }

  return sanitized.replace(/\s{2,}/g, " ").trim();
}

export function validateSafety(text: string): VisualSafetyValidation {
  const violations: string[] = [];

  for (const rule of ALL_RULES) {
    const match = text.match(rule.pattern);
    if (match) {
      violations.push(match[0]);
    }
  }

  for (const [pattern] of BRAND_SCRUBBERS) {
    const match = text.match(pattern);
    if (match) {
      violations.push(match[0]);
    }
  }

  return {
    safe: violations.length === 0,
    violations: Array.from(new Set(violations)),
  };
}
