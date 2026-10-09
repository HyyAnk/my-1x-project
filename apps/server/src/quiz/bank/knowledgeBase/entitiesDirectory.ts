import fs from "node:fs";
import path from "node:path";

/**
 * Computes a lightweight fingerprint (filenames + mtimeMs + size) of the entities directory.
 * Takes < 0.1ms for 14 files and enables real-time hot-reload when new entities or files are added.
 */
export function computeEntitiesDirectoryFingerprint(targetDir: string): string {
  if (!fs.existsSync(targetDir)) return "non-existent";
  try {
    const filenames = fs
      .readdirSync(targetDir)
      .filter((file) => file.endsWith(".json"))
      .sort();
    let fp = "";
    for (const file of filenames) {
      const st = fs.statSync(path.join(targetDir, file));
      fp += `${file}:${st.mtimeMs}:${st.size};`;
    }
    return fp;
  } catch {
    return "error";
  }
}

/**
 * Resolves the directory containing knowledge base JSON files across monorepo runtimes.
 */
export function resolveKnowledgeBaseEntitiesDir(customDir?: string): string {
  if (customDir && fs.existsSync(customDir)) {
    return customDir;
  }

  const cwd = process.cwd();
  const candidates = [
    path.resolve(cwd, ".quiz-studio", "knowledge_base", "entities"),
    path.resolve(cwd, "..", "..", ".quiz-studio", "knowledge_base", "entities"),
    path.resolve(cwd, "..", ".quiz-studio", "knowledge_base", "entities"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return candidates[0];
}
