/**
 * Namespace isolation and CSS variable compiler for motion templates.
 * Prevents DOM and stylesheet leakage across different video scene boundaries.
 */

export interface MotionThemeContext {
  primaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  textColor?: string;
  aspectRatio?: "16:9" | "9:16" | "1:1";
}

const DEFAULT_PRIMARY = "#7928CA";
const DEFAULT_ACCENT = "#FF0080";
const DEFAULT_BG = "#0A0A0C";
const DEFAULT_TEXT = "#FFFFFF";

/**
 * Compiles scoped CSS custom properties for a motion scene.
 */
export function generateMotionCssVariables(theme: MotionThemeContext = {}): string {
  const primary = theme.primaryColor || DEFAULT_PRIMARY;
  const accent = theme.accentColor || DEFAULT_ACCENT;
  const bg = theme.backgroundColor || DEFAULT_BG;
  const text = theme.textColor || DEFAULT_TEXT;

  return [
    `--motion-primary: ${primary};`,
    `--motion-accent: ${accent};`,
    `--motion-bg: ${bg};`,
    `--motion-text: ${text};`,
    `--motion-glow: rgba(${hexToRgb(accent)}, 0.45);`,
  ].join(" ");
}

/**
 * Scopes internal element IDs and references (url(#...)) in SVG/HTML markup to avoid cross-clip collisions.
 */
export function scopeMotionMarkup(html: string, scopeId: string): string {
  if (!scopeId || !html) return html;
  const sanitizedScope = scopeId.replace(/[^a-zA-Z0-9_-]/g, "");

  // Rewrite id="foo" -> id="scope-foo"
  const withScopedIds = html.replace(/\bid="([a-zA-Z0-9_-]+)"/g, `id="${sanitizedScope}-$1"`);

  // Rewrite url(#foo) -> url(#scope-foo) and href="#foo" -> href="#scope-foo"
  const withScopedUrls = withScopedIds.replace(/url\(#([a-zA-Z0-9_-]+)\)/g, `url(#${sanitizedScope}-$1)`);
  return withScopedUrls.replace(/href="#([a-zA-Z0-9_-]+)"/g, `href="#${sanitizedScope}-$1"`);
}

/**
 * Converts hexadecimal color to comma-separated RGB values.
 */
function hexToRgb(hex: string): string {
  const cleaned = hex.replace("#", "").trim();
  if (cleaned.length === 3) {
    const r = parseInt(cleaned[0] + cleaned[0], 16);
    const g = parseInt(cleaned[1] + cleaned[1], 16);
    const b = parseInt(cleaned[2] + cleaned[2], 16);
    return `${r}, ${g}, ${b}`;
  }
  if (cleaned.length === 6) {
    const r = parseInt(cleaned.slice(0, 2), 16);
    const g = parseInt(cleaned.slice(2, 4), 16);
    const b = parseInt(cleaned.slice(4, 6), 16);
    return `${r}, ${g}, ${b}`;
  }
  return "255, 0, 128";
}
