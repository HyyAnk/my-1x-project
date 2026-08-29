/**
 * WCAG 2.1 Contrast Calculation Utilities
 */

export type ContrastReport = {
  ok: boolean;
  ratio: number;
  required_ratio: number;
  message: string;
};

/**
 * Parses a hex color string (#RGB, #RRGGBB, #RGBA, #RRGGBBAA) into [r, g, b] (0-255).
 * Falls back to black [0, 0, 0] if invalid.
 */
export function parseHexColor(hex: string): [number, number, number] {
  if (!hex || typeof hex !== "string") return [0, 0, 0];
  const cleaned = hex.trim().replace(/^#/, "");
  if (cleaned.length === 3 || cleaned.length === 4) {
    const r = parseInt(cleaned[0] + cleaned[0], 16);
    const g = parseInt(cleaned[1] + cleaned[1], 16);
    const b = parseInt(cleaned[2] + cleaned[2], 16);
    if (!Number.isNaN(r) && !Number.isNaN(g) && !Number.isNaN(b)) return [r, g, b];
  } else if (cleaned.length === 6 || cleaned.length === 8) {
    const r = parseInt(cleaned.slice(0, 2), 16);
    const g = parseInt(cleaned.slice(2, 4), 16);
    const b = parseInt(cleaned.slice(4, 6), 16);
    if (!Number.isNaN(r) && !Number.isNaN(g) && !Number.isNaN(b)) return [r, g, b];
  }
  return [0, 0, 0];
}

/**
 * Calculates WCAG 2.1 relative luminance for an sRGB color.
 * Normalized to 0.0 (darkest black) - 1.0 (lightest white).
 */
export function relativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r / 255, g / 255, b / 255].map((c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Computes the contrast ratio between two hex colors according to WCAG 2.1 specifications.
 * Returns a value between 1.0 and 21.0.
 */
export function computeContrastRatio(textColor: string, bgColor: string): number {
  const [tr, tg, tb] = parseHexColor(textColor);
  const [br, bg, bb] = parseHexColor(bgColor);

  const l1 = relativeLuminance(tr, tg, tb);
  const l2 = relativeLuminance(br, bg, bb);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  const ratio = (lighter + 0.05) / (darker + 0.05);
  return Math.round(ratio * 100) / 100;
}

/**
 * Evaluates contrast between text and background, generating a structured report.
 */
export function evaluateContrast(textColor: string, bgColor: string, requiredRatio = 4.5): ContrastReport {
  const ratio = computeContrastRatio(textColor, bgColor);
  const ok = ratio >= requiredRatio;
  const message = ok
    ? `Passes WCAG AA (Text contrast ratio is ${ratio.toFixed(2)}:1, required >= ${requiredRatio}:1)`
    : `Fails WCAG AA (Text contrast ratio is ${ratio.toFixed(2)}:1, required >= ${requiredRatio}:1)`;

  return {
    ok,
    ratio,
    required_ratio: requiredRatio,
    message,
  };
}
