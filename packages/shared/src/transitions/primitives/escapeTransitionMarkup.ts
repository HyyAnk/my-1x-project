/**
 * Escapes characters for HTML attribute or text context in transition markup.
 */
export function escapeTransitionMarkup(str: string): string {
  if (typeof str !== "string") {
    return "";
  }
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * Sanitizes a CSS color string to ensure it contains only safe characters
 * and cannot break out of CSS custom property or attribute contexts.
 */
export function sanitizeTransitionColor(color: string): string {
  if (typeof color !== "string") {
    return "#000000";
  }
  const trimmed = color.trim();
  // Safe CSS color values (hex, rgb/rgba, hsl/hsla, safe named colors, var())
  if (/^[#a-zA-Z0-9(),%_.-]+$/.test(trimmed) && !/on\w+/i.test(trimmed) && !/javascript/i.test(trimmed)) {
    return escapeTransitionMarkup(trimmed);
  }
  return "#000000";
}
