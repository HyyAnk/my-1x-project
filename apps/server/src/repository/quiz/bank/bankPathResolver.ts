import { existsSync } from "node:fs";
import path from "node:path";
import type { RepositoryRuntime } from "../../runtime.js";
import { assertSafeBankPathSegments } from "./bankPathSafety.js";

export const QUESTION_BANK_DIR = "question_bank";

/**
 * Resolves a readable path for a question bank asset, checking runtime root first,
 * then falling back to the project .quiz-studio root if needed.
 */
export function getQuestionBankPath(this: RepositoryRuntime, ...segments: string[]): string {
  assertSafeBankPathSegments(segments);
  const runtimePath = path.join(this.roots.runtime, QUESTION_BANK_DIR, ...segments);
  if (existsSync(runtimePath)) return runtimePath;

  const defaultProjectRuntime = path.join(this.rootDirectory, ".quiz-studio");
  const isRedirectedRuntime = path.resolve(this.roots.runtime) !== path.resolve(defaultProjectRuntime);

  if (isRedirectedRuntime) {
    if (segments[0] === "taxonomy.json") {
      const projectPath = path.join(defaultProjectRuntime, QUESTION_BANK_DIR, ...segments);
      if (existsSync(projectPath)) return projectPath;
    }
    return runtimePath;
  }

  const projectPath = path.join(defaultProjectRuntime, QUESTION_BANK_DIR, ...segments);
  if (existsSync(projectPath)) return projectPath;
  return runtimePath;
}

/**
 * Resolves the target writable path for a question bank asset, prioritizing
 * existing project storage unless runtime has been explicitly redirected.
 */
export function getQuestionBankWritePath(this: RepositoryRuntime, ...segments: string[]): string {
  assertSafeBankPathSegments(segments);
  const runtimeBank = path.join(this.roots.runtime, QUESTION_BANK_DIR);
  const defaultProjectRuntime = path.join(this.rootDirectory, ".quiz-studio");
  const isRedirectedRuntime = path.resolve(this.roots.runtime) !== path.resolve(defaultProjectRuntime);

  if (isRedirectedRuntime) {
    return path.join(runtimeBank, ...segments);
  }

  const projectBank = path.join(defaultProjectRuntime, QUESTION_BANK_DIR);
  if (existsSync(projectBank)) return path.join(projectBank, ...segments);
  return path.join(runtimeBank, ...segments);
}
