import { existsSync, readdirSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

/**
 * Resolves the sprite-gen CLI executable path.
 */
export function resolveSpriteGenExecutable(override?: string): string {
  if (override) return override;
  return "sprite-gen";
}

/**
 * Locates the OpenAI Codex CLI directory containing codex.exe.
 */
export function resolveCodexCliDir(): string | null {
  const localAppData = process.env.LOCALAPPDATA || "";
  const userProfile = process.env.USERPROFILE || "";

  const candidates: string[] = [
    path.join(localAppData, "OpenAI", "Codex", "bin", "bffc5354119c8421"),
    path.join(userProfile, ".codex", "plugins", ".plugin-appserver"),
  ];

  const codexBinParent = path.join(localAppData, "OpenAI", "Codex", "bin");
  try {
    if (existsSync(codexBinParent)) {
      const entries = readdirSync(codexBinParent, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          candidates.unshift(path.join(codexBinParent, entry.name));
        }
      }
    }
  } catch {
    // Ignore directory scan errors
  }

  for (const candidate of candidates) {
    const exe = path.join(candidate, "codex.exe");
    if (existsSync(exe)) {
      return candidate;
    }
  }

  return null;
}

/**
 * Builds subprocess environment variables ensuring Codex CLI is on PATH
 * and UTF-8 encoding is strictly enforced for Python.
 */
export function buildSpriteGenEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PYTHONUTF8: "1",
    PYTHONIOENCODING: "utf-8",
    COCKPIT_URL: process.env.COCKPIT_URL || "http://localhost:3177/v1",
    COCKPIT_API_KEY: process.env.COCKPIT_API_KEY || "agt_codex_ujBegE2x4VMJ2d1N8H8ogagBvQUzeTrG",
    COCKPIT_IMAGE_MODEL: process.env.COCKPIT_IMAGE_MODEL || "gpt-image-2.5",
  };

  const codexDir = resolveCodexCliDir();
  if (codexDir) {
    env.PATH = `${codexDir}${path.delimiter}${env.PATH || ""}`;
  }

  return env;
}

/**
 * Ensures an anchor base image exists on disk for sprite-gen prepare.
 */
export async function ensureBaseImage(anchorPath: string | undefined, outputDir: string): Promise<string> {
  if (anchorPath) {
    try {
      const stats = await fs.stat(anchorPath);
      if (stats.isFile() && stats.size > 0) return path.resolve(anchorPath);
    } catch {
      // Not a direct path
    }

    const relativePath = path.resolve(process.cwd(), anchorPath.replace(/^[/\\]+/, ""));
    try {
      const stats = await fs.stat(relativePath);
      if (stats.isFile() && stats.size > 0) return relativePath;
    } catch {
      // Not relative to root
    }

    const filename = path.basename(anchorPath);
    const candidateDirs = [
      path.resolve(process.cwd(), ".quiz-studio", "mascots"),
      path.resolve("D:/1a Cursor Project/My 1x Youtube Channel File/.quiz-studio/mascots"),
    ];
    for (const base of candidateDirs) {
      try {
        if (existsSync(base)) {
          const entries = await fs.readdir(base, { recursive: true });
          for (const entry of entries) {
            if (typeof entry === "string" && path.basename(entry) === filename) {
              const matchedPath = path.join(base, entry);
              const stats = await fs.stat(matchedPath);
              if (stats.isFile() && stats.size > 0) return matchedPath;
            }
          }
        }
      } catch {
        // Ignore candidate scan errors
      }
    }
  }

  const fallbackPath = path.join(outputDir, "base_anchor.png");
  try {
    const stats = await fs.stat(fallbackPath);
    if (stats.isFile() && stats.size > 0) return fallbackPath;
  } catch {
    // Generate fallback
  }

  const defaultSvg = `<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
    <rect width="512" height="512" fill="#00FF00"/>
    <circle cx="256" cy="256" r="180" fill="#3B82F6"/>
    <circle cx="210" cy="220" r="24" fill="#FFFFFF"/>
    <circle cx="302" cy="220" r="24" fill="#FFFFFF"/>
    <circle cx="210" cy="220" r="12" fill="#000000"/>
    <circle cx="302" cy="220" r="12" fill="#000000"/>
    <path d="M 210 290 Q 256 340 302 290" stroke="#000000" stroke-width="8" fill="none" stroke-linecap="round"/>
  </svg>`;
  await sharp(Buffer.from(defaultSvg)).png().toFile(fallbackPath);
  return fallbackPath;
}
