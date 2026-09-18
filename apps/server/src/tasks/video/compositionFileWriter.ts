import { mkdir, writeFile } from "node:fs/promises";
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
}
