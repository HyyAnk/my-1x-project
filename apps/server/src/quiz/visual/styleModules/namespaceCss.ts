import { StyleModuleManifestSchema } from "./manifestSchema.js";
import { BUILT_IN_STYLE_MODULES } from "./builtins.js";
import type { SlotScopedStyleModule } from "./types.js";

export function renderValidatedModuleCss(module: SlotScopedStyleModule): string {
  const manifest = StyleModuleManifestSchema.parse(module.manifest);
  const css = module.renderer.renderCss();
  const isBuiltIn = BUILT_IN_STYLE_MODULES.some((candidate) => candidate === module);

  if (!isBuiltIn) {
    validateCssSelectors(css, manifest.namespace);
    validateNamespacedKeyframes(css, manifest.namespace, manifest.id);
  }
  return css;
}

type CssBlockVisitor = (prelude: string) => void;

function validateCssSelectors(css: string, namespace: string): void {
  walkCssBlocks(css, (prelude) => {
    const selector = stripCssComments(prelude).trim();
    if (!selector || selector.startsWith("@")) return;

    const selectors = splitTopLevel(selector, ",");
    for (const candidate of selectors) {
      if (!isNamespacedSelector(candidate.trim(), namespace)) {
        throw new Error(`Style module CSS selector must be scoped beneath .${namespace}: ${candidate.trim()}`);
      }
    }
  });
}

function validateNamespacedKeyframes(css: string, namespace: string, moduleId: string): void {
  walkCssBlocks(css, (prelude) => {
    const normalizedPrelude = stripCssComments(prelude).trim();
    const match = normalizedPrelude.match(/^@(?:-webkit-)?keyframes\s+([^\s{]+)/i);
    if (!match) return;

    const animationName = match[1];
    if (animationName !== namespace && !animationName.startsWith(`${namespace}-`) && !animationName.startsWith(`${namespace}__`)) {
      throw new Error(`Style module CSS keyframes must be scoped beneath .${namespace}: ${animationName} (${moduleId})`);
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

function isNamespacedSelector(selector: string, namespace: string): boolean {
  const compounds = splitSelectorCompounds(selector);
  return compounds.length > 0 && compounds.every((compound) => isNamespacedCompound(compound, namespace));
}

function isNamespacedCompound(compound: string, namespace: string): boolean {
  const prefix = `.${namespace}`;
  if (!compound.startsWith(prefix)) return false;

  const suffix = compound.slice(prefix.length);
  return suffix.length === 0 || suffix.startsWith("__") || /^[.:#[>+~]/.test(suffix);
}

function splitSelectorCompounds(selector: string): string[] {
  const compounds: string[] = [];
  let current = "";
  let bracketDepth = 0;
  let parenthesisDepth = 0;
  let quote: string | null = null;

  const pushCurrent = () => {
    const trimmed = current.trim();
    if (trimmed) compounds.push(trimmed);
    current = "";
  };

  for (let index = 0; index < selector.length; index += 1) {
    const character = selector[index];
    if (quote) {
      current += character;
      if (character === quote && selector[index - 1] !== "\\") quote = null;
      continue;
    }
    if (character === "'" || character === '"') {
      quote = character;
      current += character;
      continue;
    }
    if (character === "[") bracketDepth += 1;
    if (character === "]") bracketDepth = Math.max(0, bracketDepth - 1);
    if (character === "(") parenthesisDepth += 1;
    if (character === ")") parenthesisDepth = Math.max(0, parenthesisDepth - 1);

    if (bracketDepth === 0 && parenthesisDepth === 0 && /[\s>+~]/.test(character)) {
      pushCurrent();
      continue;
    }
    current += character;
  }
  pushCurrent();
  return compounds;
}

function splitTopLevel(value: string, delimiter: string): string[] {
  const parts: string[] = [];
  let current = "";
  let bracketDepth = 0;
  let parenthesisDepth = 0;
  let quote: string | null = null;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (quote) {
      current += character;
      if (character === quote && value[index - 1] !== "\\") quote = null;
      continue;
    }
    if (character === "'" || character === '"') {
      quote = character;
      current += character;
      continue;
    }
    if (character === "[") bracketDepth += 1;
    if (character === "]") bracketDepth = Math.max(0, bracketDepth - 1);
    if (character === "(") parenthesisDepth += 1;
    if (character === ")") parenthesisDepth = Math.max(0, parenthesisDepth - 1);

    if (character === delimiter && bracketDepth === 0 && parenthesisDepth === 0) {
      parts.push(current);
      current = "";
      continue;
    }
    current += character;
  }
  parts.push(current);
  return parts;
}

function stripCssComments(value: string): string {
  return value.replace(/\/\*[\s\S]*?\*\//g, "");
}
