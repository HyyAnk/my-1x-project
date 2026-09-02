import { copyFile, mkdir, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { copyCandyArcadeFonts, resolveCandyArcadeFonts } from "../../quiz/render/candyArcade/candyArcadeFonts.js";

const SFX_FILES = [
  "ui_pop.wav",
  "bubble_splash.wav",
  "lightning_brush.wav",
  "countdown_tick.wav",
  "countdown_final.wav",
  "countdown_5.wav",
  "countdown_4.wav",
  "countdown_3.wav",
  "countdown_2.wav",
  "countdown_1.wav",
  "correct_ding.wav",
  "correct_triumph.wav",
  "streak.wav",
];

async function copyFileIfChanged(sourcePath: string, destPath: string): Promise<void> {
  try {
    const [sourceStat, destStat] = await Promise.all([stat(sourcePath), stat(destPath)]);
    if (sourceStat.size === destStat.size && sourceStat.mtimeMs <= destStat.mtimeMs) {
      return;
    }
  } catch {
    // Destination file does not exist or stat failed, continue with copy
  }
  await copyFile(sourcePath, destPath);
}

export async function syncSfxAssets(renderRoot: string, rootDir: string): Promise<void> {
  const sfxTargetDir = path.join(renderRoot, "sfx");
  await mkdir(sfxTargetDir, { recursive: true });
  const sfxCandidates = [
    path.join(rootDir, "templates", "sfx"),
    path.join(rootDir, "assets", "audio", "sfx"),
    path.resolve("templates", "sfx"),
    path.resolve("assets", "audio", "sfx"),
  ];

  await Promise.all(
    SFX_FILES.map(async (file) => {
      for (const candidateDir of sfxCandidates) {
        const candidateFile = path.join(candidateDir, file);
        try {
          await copyFileIfChanged(candidateFile, path.join(sfxTargetDir, file));
          break;
        } catch {
          // Candidate file not found in this folder, try next
        }
      }
    }),
  );
}

export async function syncBgmAssets(renderRoot: string, rootDir: string): Promise<void> {
  const bgmTargetDir = path.join(renderRoot, "bgm");
  await mkdir(bgmTargetDir, { recursive: true });
  const bgmCandidates = [
    path.join(rootDir, "assets", "audio", "bgm", "tracks"),
    path.resolve("assets", "audio", "bgm", "tracks"),
    path.join(rootDir, "assets", "audio", "bgm"),
    path.resolve("assets", "audio", "bgm"),
  ];

  for (const candidateDir of bgmCandidates) {
    try {
      const entries = await readdir(candidateDir);
      const mp3s = entries.filter((entry) => entry.endsWith(".mp3"));
      if (mp3s.length > 0) {
        await Promise.all(mp3s.map((entry) => copyFileIfChanged(path.join(candidateDir, entry), path.join(bgmTargetDir, entry))));
        break;
      }
    } catch {
      // Candidate dir not found or not readable, try next
    }
  }
}

export async function syncStaticMediaAssets(renderRoot: string, rootDir: string): Promise<{ fontFingerprints: string[] }> {
  await Promise.all([syncSfxAssets(renderRoot, rootDir), syncBgmAssets(renderRoot, rootDir), copyCandyArcadeFonts(renderRoot, rootDir)]);

  const fontFingerprints = resolveCandyArcadeFonts(rootDir).map((font) => `${font.id}:${font.sha256}`);
  return { fontFingerprints };
}
