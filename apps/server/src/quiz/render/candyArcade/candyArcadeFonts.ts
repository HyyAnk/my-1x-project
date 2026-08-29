import fs from "node:fs";
import path from "node:path";

let cachedHeadlineFontBase64: string | null = null;

export function getHeadlineFontBase64(): string {
  if (cachedHeadlineFontBase64 !== null) return cachedHeadlineFontBase64;
  const candidates = [
    path.resolve(process.cwd(), "assets", "fonts", "SVN-Hello Headline.otf"),
    path.resolve(process.cwd(), "..", "assets", "fonts", "SVN-Hello Headline.otf"),
    path.resolve(process.cwd(), "..", "..", "assets", "fonts", "SVN-Hello Headline.otf"),
  ];
  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) {
        cachedHeadlineFontBase64 = fs.readFileSync(candidate).toString("base64");
        return cachedHeadlineFontBase64;
      }
    } catch {
      // Font file probing fallback
    }
  }
  let curr = process.cwd();
  for (let i = 0; i < 5; i++) {
    const probe = path.join(curr, "assets", "fonts", "SVN-Hello Headline.otf");
    try {
      if (fs.existsSync(probe)) {
        cachedHeadlineFontBase64 = fs.readFileSync(probe).toString("base64");
        return cachedHeadlineFontBase64;
      }
    } catch {
      // Directory walk probing fallback
    }
    const parent = path.dirname(curr);
    if (parent === curr) break;
    curr = parent;
  }
  cachedHeadlineFontBase64 = "";
  return cachedHeadlineFontBase64;
}
