import { mkdir, readdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

export async function writeCompositionFiles(
  renderRoot: string,
  compositionPath: string,
  html: string,
  compositionFiles: Record<string, string> = {},
): Promise<void> {
  await writeFile(compositionPath, html, "utf8");
  for (const [relativePath, content] of Object.entries(compositionFiles)) {
    const filePath = path.join(renderRoot, relativePath);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, content, "utf8");
  }
  // The checker scans every composition, including unmounted files from older timelines.
  const directory = path.join(renderRoot, "compositions");
  const entries = await readdir(directory, { withFileTypes: true }).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return [];
    throw error;
  });
  const current = new Set(Object.keys(compositionFiles).map((file) => file.replaceAll("\\", "/")));
  for (const entry of entries) {
    const generated = /^(quiz-q\d+-\d+|candy-transition-\d+|candy-intro|candy-outro)\.html$/.test(entry.name);
    if (entry.isFile() && generated && !current.has(`compositions/${entry.name}`)) {
      await unlink(path.join(directory, entry.name));
    }
  }
}
