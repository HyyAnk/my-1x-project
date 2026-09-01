import path from "node:path";

export const STUDIO_RUNTIME_DIRECTORY = ".quiz-studio";

export function studioRuntimePath(rootDirectory: string, ...segments: string[]): string {
  return path.join(rootDirectory, STUDIO_RUNTIME_DIRECTORY, ...segments);
}
