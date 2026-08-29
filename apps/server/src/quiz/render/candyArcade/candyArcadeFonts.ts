import { createHash } from "node:crypto";
import fs from "node:fs";
import { copyFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { channelBrandMarkFitScript } from "./channelBrandMark.js";

export type CandyArcadeFontMode = "preview" | "render";

export type CandyArcadeFontDefinition = {
  id: string;
  family: string;
  filename: string;
  format: "opentype" | "truetype";
  mimeType: "font/otf" | "font/ttf";
  testWeight: number;
};

export const CANDY_ARCADE_FONTS = [
  {
    id: "svn-hello-headline",
    family: "SVN-Hello Headline",
    filename: "SVN-Hello Headline.otf",
    format: "opentype",
    mimeType: "font/otf",
    testWeight: 900,
  },
  {
    id: "fredoka",
    family: "Fredoka",
    filename: "Fredoka-VariableFont_wdth,wght.ttf",
    format: "truetype",
    mimeType: "font/ttf",
    testWeight: 800,
  },
  {
    id: "baloo-2",
    family: "Baloo 2",
    filename: "Baloo2-VariableFont_wght.ttf",
    format: "truetype",
    mimeType: "font/ttf",
    testWeight: 900,
  },
  {
    id: "nunito",
    family: "Nunito",
    filename: "Nunito-VariableFont_wght.ttf",
    format: "truetype",
    mimeType: "font/ttf",
    testWeight: 700,
  },
] as const satisfies readonly CandyArcadeFontDefinition[];

export type ResolvedCandyArcadeFont = CandyArcadeFontDefinition & {
  absolutePath: string;
  sha256: string;
};

const resolvedFontCache = new Map<string, { signature: string; font: ResolvedCandyArcadeFont }>();

export function resolveCandyArcadeFont(fontId: string, rootDirectory = process.cwd()): ResolvedCandyArcadeFont | null {
  const definition = CANDY_ARCADE_FONTS.find((font) => font.id === fontId);
  if (!definition) return null;
  const absolutePath = resolveFontPath(definition.filename, rootDirectory);
  if (!absolutePath) return null;
  const metadata = fs.statSync(absolutePath);
  const signature = `${metadata.size}:${metadata.mtimeMs}`;
  const cached = resolvedFontCache.get(absolutePath);
  if (cached?.signature === signature) return cached.font;
  const sha256 = createHash("sha256").update(fs.readFileSync(absolutePath)).digest("hex");
  const font = { ...definition, absolutePath, sha256 };
  resolvedFontCache.set(absolutePath, { signature, font });
  return font;
}

export function resolveCandyArcadeFonts(rootDirectory = process.cwd()): ResolvedCandyArcadeFont[] {
  return CANDY_ARCADE_FONTS.map((font) => {
    const resolved = resolveCandyArcadeFont(font.id, rootDirectory);
    if (!resolved) throw new Error(`CANDY_ARCADE_FONT_MISSING: ${font.filename}`);
    return resolved;
  });
}

export function candyArcadeFontFaceCss(mode: CandyArcadeFontMode, rootDirectory = process.cwd()): string {
  return resolveCandyArcadeFonts(rootDirectory)
    .map((font) => {
      const source =
        mode === "preview" ? `/api/quiz/fonts/${font.id}?v=${font.sha256.slice(0, 16)}` : `./fonts/${encodeURIComponent(font.filename)}`;
      return `@font-face {
  font-family: "${font.family}";
  src: url("${source}") format("${font.format}");
  font-weight: 100 900;
  font-style: normal;
  font-display: block;
}`;
    })
    .join("\n");
}

export async function copyCandyArcadeFonts(renderRoot: string, rootDirectory: string): Promise<void> {
  const targetDirectory = path.join(renderRoot, "fonts");
  await mkdir(targetDirectory, { recursive: true });
  await Promise.all(
    resolveCandyArcadeFonts(rootDirectory).map(async (font) => {
      const target = path.join(targetDirectory, font.filename);
      await copyFile(font.absolutePath, target);
      const copiedHash = createHash("sha256")
        .update(await readFile(target))
        .digest("hex");
      if (copiedHash !== font.sha256) throw new Error(`CANDY_ARCADE_FONT_HASH_MISMATCH: ${font.filename}`);
    }),
  );
}

export function candyArcadeFontReadinessScript(): string {
  const checks = CANDY_ARCADE_FONTS.map(({ family, testWeight }) => ({ family, testWeight }));
  return `(function(){
    ${channelBrandMarkFitScript()}
    const checks=${JSON.stringify(checks)};
    const sample="BẠN CÓ BIẾT? Hành tinh kỳ thú 0123456789";
    window.__playerReady=false;
    window.__renderReady=false;
    window.__fontStatus={state:"loading",families:checks.map((item)=>item.family)};
    window.__fontReadyPromise=(async()=>{
      try {
        for (const item of checks) {
          const descriptor=item.testWeight+' 64px "'+item.family+'"';
          const loaded=await document.fonts.load(descriptor,sample);
          if (!loaded.length || !document.fonts.check(descriptor,sample)) throw new Error('Font unavailable: '+item.family);
        }
        await document.fonts.ready;
        fitChannelBrandMarks();
        document.documentElement.dataset.fontsReady="true";
        window.__fontStatus={state:"ready",families:checks.map((item)=>item.family)};
        window.__playerReady=true;
        window.__renderReady=true;
        if (window.parent!==window) window.parent.postMessage({type:"quiz-fonts-ready",families:checks.map((item)=>item.family)},"*");
        return window.__fontStatus;
      } catch (error) {
        const message=error instanceof Error?error.message:String(error);
        window.__fontStatus={state:"error",message,families:checks.map((item)=>item.family)};
        document.documentElement.dataset.fontsError="true";
        if (window.parent!==window) window.parent.postMessage({type:"quiz-fonts-error",message},"*");
        throw error;
      }
    })();
  })();`;
}

function resolveFontPath(filename: string, rootDirectory: string): string | null {
  const roots = [rootDirectory, path.resolve(rootDirectory, ".."), path.resolve(rootDirectory, "..", "..")];
  for (const root of new Set(roots.map((candidate) => path.resolve(candidate)))) {
    for (const directory of [path.join(root, "assets", "fonts"), path.join(root, "templates", "fonts")]) {
      const candidate = path.join(directory, filename);
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
    }
  }
  return null;
}
