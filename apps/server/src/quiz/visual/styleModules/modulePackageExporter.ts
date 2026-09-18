import { createZipArchive, parseZipArchive } from "../../zipHelper.js";
import { StyleModuleManifestSchema } from "./manifestSchema.js";
import { renderValidatedModuleCss } from "./namespaceCss.js";
import type { SlotScopedStyleModule } from "./types.js";

export const STYLE_MODULE_PACKAGE_VERSION = 1;
export const SAFE_ENTRY = /^[a-z0-9][a-z0-9._/-]*$/i;

export type PackageManifest = {
  packageVersion: number;
  kind?: "module" | "preset";
  manifest: unknown;
  requiredAssets?: string[];
  htmlTemplate?: boolean;
};

export const TEMPLATE_FIELD = /\{\{([a-zA-Z][a-zA-Z0-9]*(?:\.[a-zA-Z][a-zA-Z0-9]*)?)\}\}/g;
export const ALLOWED_TEMPLATE_FIELDS = new Set([
  "clipStart",
  "questionNarrationStart",
  "revealStart",
  "thinkingStart",
  "duration",
  "questionNumber",
  "totalQuestions",
  "paletteAccent",
  "isFinal",
  "question",
  "visualOpportunity",
  "tier",
  "highlightedHtml",
  "surface",
  "questionIndex",
  "seed",
  "palette.id",
  "palette.backgroundPrimary",
  "palette.backgroundSecondary",
  "palette.accent",
  "palette.surfaceAccent",
  "palette.onAccent",
  "palette.answerBadge",
  "palette.correct",
  "palette.incorrect",
  "palette.surface",
  "palette.text",
  "palette.muted",
]);

export type ImportedStyleModule = SlotScopedStyleModule & { assets?: Record<string, Uint8Array> };

const BASE_RENDER_CONTEXT: Record<string, unknown> = {
  clipStart: 1.125,
  questionNarrationStart: 2.25,
  revealStart: 8.875,
  thinkingStart: 3.5,
  duration: 9.5,
  questionNumber: 2,
  totalQuestions: 7,
  paletteAccent: "#12ABCD",
  isFinal: false,
  question: "Portable question",
  visualOpportunity: "Portable visual opportunity",
  tier: "long",
  highlightedHtml: '<strong class="keyword-highlight">Portable</strong>',
  surface: "production",
  questionIndex: 1,
  seed: "portable-seed",
  palette: {
    id: "aqua",
    backgroundPrimary: "#123456",
    backgroundSecondary: "#234567",
    accent: "#345678",
    surfaceAccent: "#456789",
    onAccent: "#56789A",
    answerBadge: "#6789AB",
    correct: "#789ABC",
    incorrect: "#89ABCD",
    surface: "#9ABCDE",
    text: "#ABCDEF",
    muted: "#BCDEF0",
  },
};

const PROBE_PALETTE = {
  id: "orange",
  backgroundPrimary: "#FEDCBA",
  backgroundSecondary: "#EDCBA9",
  accent: "#DCBA98",
  surfaceAccent: "#CBA987",
  onAccent: "#BA9876",
  answerBadge: "#A98765",
  correct: "#987654",
  incorrect: "#876543",
  surface: "#765432",
  text: "#654321",
  muted: "#543210",
};

export function assertSafeEntry(entry: string): void {
  const invalid =
    !entry ||
    entry.startsWith("/") ||
    entry.includes("\\") ||
    entry.split("/").some((segment) => !segment || segment === "." || segment === "..") ||
    !SAFE_ENTRY.test(entry);
  if (invalid) throw new Error(`Unsafe package path: ${entry}`);
}

export function indexPackageEntries(entries: readonly { filename: string; data: Uint8Array }[]): Map<string, Uint8Array> {
  const byName = new Map<string, Uint8Array>();
  for (const entry of entries) {
    assertSafeEntry(entry.filename);
    if (byName.has(entry.filename)) throw new Error(`Duplicate package entry: ${entry.filename}`);
    byName.set(entry.filename, entry.data);
  }
  return byName;
}

export function exportStyleModulePackage(module: SlotScopedStyleModule): { zipBuffer: Buffer; filename: string } {
  const manifest = StyleModuleManifestSchema.parse(module.manifest);
  const html = renderPortableHtml(module);
  const pkgMeta = {
    packageVersion: STYLE_MODULE_PACKAGE_VERSION,
    kind: "module" as const,
    manifest,
    requiredAssets: manifest.assetPaths,
    htmlTemplate: html.includes("{{"),
  };
  const files = [
    { filename: "package.json", data: Buffer.from(JSON.stringify(pkgMeta, null, 2)) },
    { filename: "manifest.json", data: Buffer.from(JSON.stringify(manifest, null, 2)) },
    { filename: "style.css", data: Buffer.from(renderValidatedModuleCss(module)) },
  ];
  if (html) files.push({ filename: "module.html", data: Buffer.from(html) });
  const assets = (module as ImportedStyleModule).assets ?? {};
  for (const [assetPath, data] of Object.entries(assets)) {
    assertSafeEntry(assetPath);
    files.push({ filename: `assets/${assetPath}`, data: Buffer.from(data) });
  }
  return { zipBuffer: createZipArchive(files), filename: `style-module_${manifest.id.replaceAll(/[^a-z0-9_-]+/gi, "_")}.zip` };
}

export function importStyleModulePackage(
  zipBuffer: Buffer,
  options: { existingIds?: Iterable<string>; allowRevision?: boolean } = {},
): ImportedStyleModule {
  const entries = parseZipArchive(zipBuffer);
  const byName = indexPackageEntries(entries);
  const packageEntry = byName.get("package.json");
  const manifestEntry = byName.get("manifest.json");
  if (!packageEntry || !manifestEntry) throw new Error("Invalid style module package: missing package.json or manifest.json");
  const parsedPackage = JSON.parse(Buffer.from(packageEntry).toString("utf8")) as PackageManifest;
  if (parsedPackage.packageVersion !== STYLE_MODULE_PACKAGE_VERSION || parsedPackage.kind !== "module") {
    throw new Error("Unsupported style module package");
  }
  const manifest = StyleModuleManifestSchema.parse(JSON.parse(Buffer.from(manifestEntry).toString("utf8")));
  const existingIds = new Set(options.existingIds ?? []);
  if (existingIds.has(manifest.id) && !options.allowRevision) throw new Error(`Duplicate style module ID: ${manifest.id}`);
  const cssData = byName.get("style.css");
  if (!cssData) throw new Error("Invalid style module package: missing style.css");
  const assets: Record<string, Uint8Array> = {};
  for (const assetPath of manifest.assetPaths) {
    const data = byName.get(`assets/${assetPath}`);
    if (!data) throw new Error(`Missing required asset: ${assetPath}`);
    assets[assetPath] = data;
  }
  const css = Buffer.from(cssData).toString("utf8");
  const html = byName.has("module.html") ? Buffer.from(byName.get("module.html")!).toString("utf8") : "";
  validateHtmlTemplate(html);
  const module = createCssModule(manifest, css, html, assets);
  renderValidatedModuleCss(module);
  return module;
}

function createCssModule(
  manifest: ReturnType<typeof StyleModuleManifestSchema.parse>,
  css: string,
  html: string,
  assets: Record<string, Uint8Array>,
): ImportedStyleModule {
  const template = html.includes("{{") ? html : undefined;
  const renderer =
    manifest.slot === "answer-card"
      ? {
          id: manifest.id as never,
          displayName: manifest.displayName,
          description: manifest.description,
          className: manifest.namespace,
          renderCss: () => css,
        }
      : {
          id: manifest.id as never,
          displayName: manifest.displayName,
          description: manifest.description,
          renderHtml: (context: unknown) => renderHtmlTemplate(html, context),
          renderCss: () => css,
          ...(template ? { renderTemplate: template } : {}),
        };
  return { manifest, renderer, assets } as ImportedStyleModule;
}

export function renderPortableHtml(module: SlotScopedStyleModule, options: { requireTemplate?: boolean } = {}): string {
  const renderer = module.renderer as unknown as { renderHtml?: (context: never) => string; renderTemplate?: string };
  if (!renderer.renderHtml) return "";
  const render = renderer.renderHtml;
  if (renderer.renderTemplate !== undefined) {
    validateHtmlTemplate(renderer.renderTemplate);
    return renderer.renderTemplate;
  }
  const first = safeRender({ renderHtml: render }, BASE_RENDER_CONTEXT);
  const dynamic = Object.keys(BASE_RENDER_CONTEXT).some((field) => {
    const context = { ...BASE_RENDER_CONTEXT, [field]: probeValue(field) };
    return safeRender({ renderHtml: render }, context) !== first;
  });
  if (dynamic) {
    if (options.requireTemplate !== false) throw new Error("Dynamic style renderers require a portable renderTemplate");
    return `__dynamic_renderer__:${render.toString()}`;
  }
  return first;
}

function probeValue(field: string): unknown {
  if (field === "isFinal") return true;
  if (["clipStart", "questionNarrationStart", "revealStart", "thinkingStart", "duration"].includes(field)) return 42.75;
  if (["questionNumber", "totalQuestions", "questionIndex"].includes(field)) return 99;
  if (field === "highlightedHtml") return '<em class="probe">Changed</em>';
  if (field === "paletteAccent") return "#FEDCBA";
  if (field === "surface") return "sandbox";
  return field === "seed" ? "other-seed" : field === "palette" ? PROBE_PALETTE : "Changed portable question";
}

function safeRender(renderer: { renderHtml: (context: never) => string }, context: Record<string, unknown>): string {
  try {
    return renderer.renderHtml(context as never);
  } catch (error) {
    throw new Error(`Style renderer could not be exported: ${error instanceof Error ? error.message : "render failed"}`, { cause: error });
  }
}

function toPrimitiveString(val: unknown): string {
  if (val === null || val === undefined) return "";
  return typeof val === "string"
    ? val
    : typeof val === "number" || typeof val === "boolean" || typeof val === "bigint"
      ? String(val)
      : JSON.stringify(val);
}

export function validateHtmlTemplate(template: string): void {
  for (const match of template.matchAll(TEMPLATE_FIELD)) {
    if (!ALLOWED_TEMPLATE_FIELDS.has(match[1])) throw new Error(`Unsupported style template field: ${match[1]}`);
  }
  if (template.replace(TEMPLATE_FIELD, "").includes("{{")) throw new Error("Invalid style renderer template token");
}

export function renderHtmlTemplate(template: string, context: unknown): string {
  validateHtmlTemplate(template);
  const values = context && typeof context === "object" ? (context as Record<string, unknown>) : {};
  return template.replace(TEMPLATE_FIELD, (_token, field: string) =>
    field === "highlightedHtml" ? toPrimitiveString(values[field]) : escapeTemplateValue(resolveTemplateValue(values, field)),
  );
}

function resolveTemplateValue(values: Record<string, unknown>, field: string): unknown {
  const [root, nested] = field.split(".");
  const parent = values[root];
  return nested ? (parent && typeof parent === "object" ? (parent as Record<string, unknown>)[nested] : undefined) : parent;
}

function escapeTemplateValue(value: unknown): string {
  return toPrimitiveString(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
