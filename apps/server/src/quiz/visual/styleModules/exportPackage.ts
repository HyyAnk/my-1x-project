import { createZipArchive, parseZipArchive } from "../../zipHelper.js";
import { StyleModuleManifestSchema } from "./manifestSchema.js";
import { renderValidatedModuleCss } from "./namespaceCss.js";
import type { SlotScopedStyleModule } from "./types.js";

const PACKAGE_VERSION = 1;
const SAFE_ENTRY = /^[a-z0-9][a-z0-9._/-]*$/i;

type PackageManifest = {
  packageVersion: number;
  manifest: unknown;
  requiredAssets?: string[];
};

export type ImportedStyleModule = SlotScopedStyleModule & { assets?: Record<string, Uint8Array> };

export function exportStyleModulePackage(module: SlotScopedStyleModule): { zipBuffer: Buffer; filename: string } {
  const manifest = StyleModuleManifestSchema.parse(module.manifest);
  const files = [
    {
      filename: "package.json",
      data: Buffer.from(JSON.stringify({ packageVersion: PACKAGE_VERSION, manifest, requiredAssets: manifest.assetPaths }, null, 2)),
    },
    { filename: "manifest.json", data: Buffer.from(JSON.stringify(manifest, null, 2)) },
    { filename: "style.css", data: Buffer.from(renderValidatedModuleCss(module)) },
  ];
  const html = renderHtml(module);
  if (html) files.push({ filename: "module.html", data: Buffer.from(html) });
  const assets = (module as ImportedStyleModule).assets ?? {};
  for (const [assetPath, data] of Object.entries(assets)) {
    assertSafeEntry(assetPath);
    files.push({ filename: `assets/${assetPath}`, data: Buffer.from(data) });
  }
  const safeName = manifest.id.replaceAll(/[^a-z0-9_-]+/gi, "_");
  return { zipBuffer: createZipArchive(files), filename: `style-module_${safeName}.zip` };
}

export function importStyleModulePackage(
  zipBuffer: Buffer,
  options: { existingIds?: Iterable<string>; allowRevision?: boolean } = {},
): ImportedStyleModule {
  const entries = parseZipArchive(zipBuffer);
  const byName = new Map<string, Uint8Array>();
  for (const entry of entries) {
    assertSafeEntry(entry.filename);
    if (byName.has(entry.filename)) throw new Error(`Duplicate package entry: ${entry.filename}`);
    byName.set(entry.filename, entry.data);
  }
  const packageEntry = byName.get("package.json");
  const manifestEntry = byName.get("manifest.json");
  if (!packageEntry || !manifestEntry) throw new Error("Invalid style module package: missing package.json or manifest.json");
  const parsedPackage = JSON.parse(Buffer.from(packageEntry).toString("utf8")) as PackageManifest;
  if (parsedPackage.packageVersion !== PACKAGE_VERSION) throw new Error(`Unsupported style package version: ${String(parsedPackage.packageVersion)}`);
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
  const module = createCssModule(manifest, css, html, assets);
  renderValidatedModuleCss(module);
  return module;
}

function createCssModule(manifest: ReturnType<typeof StyleModuleManifestSchema.parse>, css: string, html: string, assets: Record<string, Uint8Array>): ImportedStyleModule {
  const renderer =
    manifest.slot === "answer-card"
      ? {
          id: manifest.id as never,
          displayName: manifest.displayName,
          description: manifest.description,
          className: manifest.namespace,
          renderCss: () => css,
        }
      : { renderHtml: () => html, renderCss: () => css };
  return { manifest, renderer, assets } as ImportedStyleModule;
}

function renderHtml(module: SlotScopedStyleModule): string {
  const renderer = module.renderer as unknown as { renderHtml?: (context: never) => string };
  try {
    return renderer.renderHtml ? renderer.renderHtml({} as never) : "";
  } catch {
    return "";
  }
}

function assertSafeEntry(entry: string): void {
  if (!entry || entry.startsWith("/") || entry.includes("\\") || entry.split("/").includes("..") || !SAFE_ENTRY.test(entry)) {
    throw new Error(`Unsafe package path: ${entry}`);
  }
}

export { PACKAGE_VERSION as STYLE_MODULE_PACKAGE_VERSION };
