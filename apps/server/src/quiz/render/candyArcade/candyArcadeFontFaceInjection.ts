/**
 * Font-Face Declaration Auto-Injection for HyperFrames Compliance.
 *
 * HyperFrames enforces a strict pre-render lint rule (font_family_without_font_face)
 * requiring every font-family referenced in CSS to have an explicit @font-face declaration.
 * For system or uncaptured fonts, a declaration with `src: local('Font Name')` satisfies
 * the check without needing physical font files on disk.
 */

export interface SystemFontDeclaration {
  family: string;
  localName: string;
  weight?: string;
  style?: string;
}

export const KNOWN_SYSTEM_FONTS: readonly SystemFontDeclaration[] = [
  { family: "Titan One", localName: "Titan One" },
  { family: "Comic Sans MS", localName: "Comic Sans MS" },
  { family: "Bangers", localName: "Bangers" },
  { family: "Impact", localName: "Impact" },
  { family: "Quicksand", localName: "Quicksand" },
  { family: "Trebuchet MS", localName: "Trebuchet MS" },
  { family: "Georgia", localName: "Georgia" },
  { family: "Plus Jakarta Sans", localName: "Plus Jakarta Sans" },
] as const;

const GENERIC_CSS_FAMILIES = new Set([
  "serif",
  "sans-serif",
  "monospace",
  "cursive",
  "fantasy",
  "system-ui",
  "-apple-system",
  "blinkmacsystemfont",
  "ui-serif",
  "ui-sans-serif",
  "ui-monospace",
  "ui-rounded",
  "math",
  "emoji",
  "fangsong",
  "inherit",
  "initial",
  "unset",
  "revert",
  "revert-layer",
]);

export function extractDeclaredFontFaceFamilies(css: string): Set<string> {
  const declared = new Set<string>();
  const fontFaceRegex = /@font-face\s*\{[^}]*\}/gi;
  const familyRegex = /font-family\s*:\s*(['"]?)([^;'"]+)\1/i;
  let match: RegExpExecArray | null;
  while ((match = fontFaceRegex.exec(css)) !== null) {
    const familyMatch = match[0].match(familyRegex);
    if (familyMatch?.[2]) {
      declared.add(familyMatch[2].trim().toLowerCase());
    }
  }
  return declared;
}

export function extractUsedFontFamilies(css: string): string[] {
  const used: string[] = [];
  const seen = new Set<string>();
  const withoutFontFace = css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/@font-face\s*\{[^}]*\}/gi, "");

  const propRegex = /font-family\s*:\s*([^;}{]+)/gi;
  let match: RegExpExecArray | null;
  while ((match = propRegex.exec(withoutFontFace)) !== null) {
    const parts = match[1].split(",");
    for (const part of parts) {
      const cleaned = part
        .trim()
        .replace(/\s*!important\s*$/i, "")
        .replace(/^['"]|['"]$/g, "")
        .trim();

      if (!cleaned || cleaned.startsWith("var(") || cleaned.startsWith("--")) {
        continue;
      }

      const normalized = cleaned.replace(/^[()]+|[()]+$/g, "").trim();
      const lower = normalized.toLowerCase();
      if (!lower || GENERIC_CSS_FAMILIES.has(lower) || seen.has(lower)) {
        continue;
      }

      seen.add(lower);
      used.push(normalized);
    }
  }

  return used;
}

export function formatSystemFontFace(family: string, localName = family): string {
  const normalizedLower = family.trim().toLowerCase();
  const declarations = [
    `@font-face {
  font-family: "${family}";
  src: local("${localName}");
  font-display: swap;
}`,
  ];

  if (normalizedLower !== family) {
    declarations.push(`@font-face {
  font-family: "${normalizedLower}";
  src: local("${localName}");
  font-display: swap;
}`);
  }

  return declarations.join("\n");
}

export function candyArcadeSystemFontFaceCss(): string {
  return KNOWN_SYSTEM_FONTS.map((font) => formatSystemFontFace(font.family, font.localName)).join("\n");
}

export function autoInjectFontFaces(css: string): string {
  const declared = extractDeclaredFontFaceFamilies(css);
  const used = extractUsedFontFamilies(css);
  const additions: string[] = [];

  for (const known of KNOWN_SYSTEM_FONTS) {
    const lower = known.family.toLowerCase();
    if (!declared.has(lower)) {
      additions.push(formatSystemFontFace(known.family, known.localName));
      declared.add(lower);
    }
  }

  for (const fontName of used) {
    const lower = fontName.toLowerCase();
    if (!declared.has(lower)) {
      additions.push(formatSystemFontFace(fontName, fontName));
      declared.add(lower);
    }
  }

  if (additions.length === 0) {
    return css;
  }

  return `${additions.join("\n")}\n\n${css}`;
}

export function injectFontFacesIntoHtml(html: string): string {
  const styleMatch = html.match(/<style\b[^>]*>([\s\S]*?)<\/style>/i);
  if (!styleMatch) {
    const systemCss = candyArcadeSystemFontFaceCss();
    if (html.includes("</head>")) {
      return html.replace("</head>", `<style>\n${systemCss}\n</style>\n</head>`);
    }
    return `<style>\n${systemCss}\n</style>\n${html}`;
  }

  const existingCss = styleMatch[1];
  const updatedCss = autoInjectFontFaces(existingCss);
  if (updatedCss === existingCss) {
    return html;
  }

  return html.replace(styleMatch[0], `<style>${updatedCss}</style>`);
}
