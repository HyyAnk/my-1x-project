import { StyleModuleManifestSchema } from "./manifestSchema.js";
import { BUILT_IN_STYLE_MODULES } from "./builtins.js";
import type { SlotScopedStyleModule } from "./types.js";

export function renderValidatedModuleCss(module: SlotScopedStyleModule): string {
  const manifest = StyleModuleManifestSchema.parse(module.manifest);
  const css = module.renderer.renderCss();
  const isBuiltIn = BUILT_IN_STYLE_MODULES.some((candidate) => candidate === module);

  if (!isBuiltIn) {
    validateCssSelectors(css, manifest.namespace);
    if (/@(?:-webkit-)?keyframes\b/i.test(css)) {
      throw new Error(`Style module CSS must not declare global keyframes: ${manifest.id}`);
    }
  }
  return css;
}

type CssBlockVisitor = (prelude: string) => void;

function validateCssSelectors(css: string, namespace: string): void {
  walkCssBlocks(css, (prelude) => {
    const selector = stripCssComments(prelude).trim();
    if (!selector || selector.startsWith("@")) return;

    const selectors = selector.split(",");
    for (const candidate of selectors) {
      if (!containsNamespaceSelector(candidate.trim(), namespace)) {
        throw new Error(`Style module CSS selector must be scoped beneath .${namespace}: ${candidate.trim()}`);
      }
    }
  });
}

function walkCssBlocks(css: string, visitor: CssBlockVisitor, visitKeyframeChildren = false): void {
  let cursor = 0;
  while (cursor < css.length) {
    const openingBrace = findNextOpeningBrace(css, cursor);
    if (openingBrace === -1) return;
    const closingBrace = findMatchingBrace(css, openingBrace);
    if (closingBrace === -1) throw new Error("Style module CSS contains an unmatched opening brace");

    const prelude = css.slice(cursor, openingBrace);
    const normalizedPrelude = stripCssComments(prelude).trim();
    visitor(prelude);
    if (visitKeyframeChildren || !/^@(?:-webkit-)?keyframes\b/i.test(normalizedPrelude)) {
      if (normalizedPrelude.startsWith("@")) walkCssBlocks(css.slice(openingBrace + 1, closingBrace), visitor, visitKeyframeChildren);
    }
    cursor = closingBrace + 1;
  }
}

function findNextOpeningBrace(css: string, start: number): number {
  let quote: string | null = null;
  for (let index = start; index < css.length; index += 1) {
    const character = css[index];
    if (quote) {
      if (character === quote && css[index - 1] !== "\\") quote = null;
      continue;
    }
    if (character === "'" || character === '"') {
      quote = character;
      continue;
    }
    if (character === "/" && css[index + 1] === "*") {
      const commentEnd = css.indexOf("*/", index + 2);
      if (commentEnd === -1) return -1;
      index = commentEnd + 1;
      continue;
    }
    if (character === "{") return index;
  }
  return -1;
}

function findMatchingBrace(css: string, openingBrace: number): number {
  let depth = 0;
  let quote: string | null = null;
  for (let index = openingBrace; index < css.length; index += 1) {
    const character = css[index];
    if (quote) {
      if (character === quote && css[index - 1] !== "\\") quote = null;
      continue;
    }
    if (character === "'" || character === '"') {
      quote = character;
      continue;
    }
    if (character === "/" && css[index + 1] === "*") {
      const commentEnd = css.indexOf("*/", index + 2);
      if (commentEnd === -1) return -1;
      index = commentEnd + 1;
      continue;
    }
    if (character === "{") depth += 1;
    if (character === "}" && --depth === 0) return index;
  }
  return -1;
}

function containsNamespaceSelector(selector: string, namespace: string): boolean {
  return new RegExp(`(?:^|[\\s>+~,(])\\.${escapeRegExp(namespace)}(?=$|[\\s.:#[>+~])`).test(selector);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripCssComments(value: string): string {
  return value.replace(/\/\*[\s\S]*?\*\//g, "");
}
