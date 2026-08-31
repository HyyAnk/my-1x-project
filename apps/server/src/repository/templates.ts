import { readFile } from "node:fs/promises";
import { RepositoryError } from "./errors.js";
import type { RepositoryRuntime } from "./runtime.js";

export async function getTemplate(this: RepositoryRuntime, filename: string): Promise<string> {
  try {
    return await readFile(this.resolvePath("templates", filename), "utf8");
  } catch {
    throw new RepositoryError(`Required template is missing: ${filename}`, "TEMPLATE_MISSING");
  }
}
