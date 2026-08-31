import { access, constants, readdir, readFile, stat } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import type { StudioLogger } from "../../logger.js";

export async function findGeneratedImage(
  imageNamePrefix: string,
  turnStartTime?: number,
  specificConvId?: string | null,
  logger?: StudioLogger,
): Promise<Uint8Array | null> {
  const userHome = homedir();
  const brainDir = path.join(userHome, ".gemini", "antigravity", "brain");
  const exists = await access(brainDir, constants.R_OK)
    .then(() => true)
    .catch(() => false);
  if (!exists) return null;

  try {
    const normalizedPrefix = imageNamePrefix.toLowerCase().replace(/[^a-z0-9_]/g, "_");

    // 1. If specific conversation ID is known, search that folder first
    if (specificConvId) {
      const specificPath = path.join(brainDir, specificConvId);
      try {
        const files = await readdir(specificPath);
        for (const file of files) {
          if (
            /\.(png|jpe?g|webp)$/i.test(file) &&
            (file.toLowerCase().startsWith(normalizedPrefix) || file.toLowerCase().includes(normalizedPrefix))
          ) {
            const data = await readFile(path.join(specificPath, file));
            if (data.length >= 8) return new Uint8Array(data);
          }
        }
        // Also check any image file created in this specific folder after turn start
        for (const file of files) {
          if (/\.(png|jpe?g|webp)$/i.test(file)) {
            const filePath = path.join(specificPath, file);
            const st = await stat(filePath);
            if (!turnStartTime || st.mtimeMs >= turnStartTime - 10_000) {
              const data = await readFile(filePath);
              if (data.length >= 8) return new Uint8Array(data);
            }
          }
        }
      } catch {
        // Ignore conversation-specific directory read error
      }
    }

    // 2. Scan top recent conversation directories
    const conversations = await readdir(brainDir);
    const convStats = await Promise.all(
      conversations.map(async (conv) => {
        const convPath = path.join(brainDir, conv);
        try {
          const st = await stat(convPath);
          return { conv, convPath, mtime: st.mtimeMs, isDir: st.isDirectory() };
        } catch {
          return null;
        }
      }),
    );

    const validConvs = convStats.filter((c): c is NonNullable<typeof c> => Boolean(c && c.isDir)).sort((a, b) => b.mtime - a.mtime);

    for (const { convPath } of validConvs.slice(0, 10)) {
      try {
        const files = await readdir(convPath);
        const imageFiles: Array<{ filename: string; filePath: string; mtime: number }> = [];

        for (const file of files) {
          if (/\.(png|jpe?g|webp)$/i.test(file)) {
            const filePath = path.join(convPath, file);
            try {
              const st = await stat(filePath);
              imageFiles.push({ filename: file, filePath, mtime: st.mtimeMs });
            } catch {
              // Ignore stat error for individual file
            }
          }
        }

        imageFiles.sort((a, b) => b.mtime - a.mtime);

        // Look for image starting with our imageName prefix
        const matching = imageFiles.find(
          (img) => img.filename.toLowerCase().startsWith(normalizedPrefix) || img.filename.toLowerCase().includes(normalizedPrefix),
        );
        if (matching) {
          const data = await readFile(matching.filePath);
          if (data.length >= 8) return new Uint8Array(data);
        }

        // If recent image created during this turn or within the last 5 minutes
        const minMtime = turnStartTime ? turnStartTime - 10_000 : Date.now() - 5 * 60 * 1000;
        const recentImage = imageFiles.find((img) => img.mtime >= minMtime);
        if (recentImage) {
          const data = await readFile(recentImage.filePath);
          if (data.length > 100) return new Uint8Array(data);
        }
      } catch {
        // Ignore errors reading a specific conversation directory
      }
    }
  } catch (err) {
    logger?.warn(`Failed searching Antigravity brain for generated image: ${err instanceof Error ? err.message : "unknown error"}`);
  }

  return null;
}

export async function findTranscriptError(specificConvId?: string | null): Promise<string | null> {
  if (!specificConvId) return null;
  const userHome = homedir();
  const baseDir = path.join(userHome, ".gemini", "antigravity", "brain", specificConvId, ".system_generated", "logs");
  const transcriptFullPath = path.join(baseDir, "transcript_full.jsonl");
  const transcriptPath = path.join(baseDir, "transcript.jsonl");

  try {
    const fullExists = await access(transcriptFullPath, constants.R_OK)
      .then(() => true)
      .catch(() => false);
    const normExists =
      !fullExists &&
      (await access(transcriptPath, constants.R_OK)
        .then(() => true)
        .catch(() => false));
    const filePath = fullExists ? transcriptFullPath : normExists ? transcriptPath : null;
    if (!filePath) return null;

    const raw = await readFile(filePath, "utf8");
    const lines = raw.split(/\r?\n/).filter(Boolean);
    for (const line of lines) {
      try {
        const step = JSON.parse(line) as {
          source?: string;
          type?: string;
          status?: string;
          content?: string;
        };
        const text = `${typeof step.content === "string" ? step.content : ""} ${typeof step.status === "string" ? step.status : ""}`;
        if (/429|RESOURCE_EXHAUSTED|RATE_LIMIT_EXCEEDED|exhausted your capacity|quota/i.test(text)) {
          const match = text.match(/(?:429|RESOURCE_EXHAUSTED|RATE_LIMIT_EXCEEDED|exhausted your capacity|quota)[^\n\r.]*/i);
          return match ? match[0].trim() : "429 RESOURCE_EXHAUSTED (RATE_LIMIT_EXCEEDED)";
        }
      } catch {
        // Ignore JSON parse errors for non-JSON log lines
      }
    }
  } catch {
    // Ignore transcript access/read errors
  }
  return null;
}
