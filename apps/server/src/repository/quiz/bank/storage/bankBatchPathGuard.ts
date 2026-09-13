import { existsSync, type Dirent } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { RepositoryError } from "../../../errors.js";
import type { RepositoryRuntime } from "../../../runtime.js";
import { QUESTION_BANK_DIR, getQuestionBankPath } from "../bankPathResolver.js";
import { assertSafeBankFilesystemPath, assertSafeBankPathSegments } from "../bankPathSafety.js";

/**
 * Checks if a directory archetype matches an archetype filter,
 * treating verdict_fact_myth and verdict_true_false as compatible synonyms.
 */
export function matchesArchetypeFilter(dirArchetype: string, filterArchetype?: string): boolean {
  if (!filterArchetype) return true;
  if (dirArchetype === filterArchetype) return true;
  if (
    (filterArchetype === "verdict_true_false" || filterArchetype === "verdict_fact_myth") &&
    (dirArchetype === "verdict_true_false" || dirArchetype === "verdict_fact_myth")
  ) {
    return true;
  }
  return false;
}

/**
 * Asserts that a target file path does not escape the runtime or project Question Bank roots.
 */
export async function assertSafeTarget(
  this: RepositoryRuntime | void,
  runtimeOrTarget: Pick<RepositoryRuntime, "roots" | "rootDirectory"> | string,
  maybeTarget?: string,
): Promise<void> {
  let runtime: Pick<RepositoryRuntime, "roots" | "rootDirectory">;
  let target: string;

  if (typeof runtimeOrTarget === "string") {
    if (!this) {
      throw new RepositoryError("Runtime context is required to assert safe target", "UNSAFE_PATH");
    }
    runtime = this;
    target = runtimeOrTarget;
  } else {
    runtime = runtimeOrTarget;
    target = maybeTarget!;
  }

  const roots = [
    path.join(runtime.roots.runtime, QUESTION_BANK_DIR),
    path.join(runtime.rootDirectory, ".quiz-studio", QUESTION_BANK_DIR),
  ];
  const root = roots.find((candidate) => {
    const relative = path.relative(path.resolve(candidate), path.resolve(target));
    return relative === "" || (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
  });
  if (!root) {
    throw new RepositoryError(`Question Bank path escaped its root: "${target}"`, "UNSAFE_PATH");
  }
  await assertSafeBankFilesystemPath(root, target);
}

/**
 * Asserts that none of the directory entries are symlinks or junctions.
 */
export function assertNoSymlinks(entries: Dirent[], dirPath: string): void {
  if (entries.some((entry) => entry.isSymbolicLink())) {
    throw new RepositoryError(`Question Bank contains a symlink or junction at ${dirPath}`, "UNSAFE_PATH");
  }
}

/**
 * Resolves candidate Question Bank roots across runtime and project repository locations.
 */
export function resolveBankCandidateRoots(runtime: Pick<RepositoryRuntime, "roots" | "rootDirectory">): string[] {
  const runtimeBankRoot = path.join(runtime.roots.runtime, QUESTION_BANK_DIR);
  const defaultProjectRuntime = path.join(runtime.rootDirectory, ".quiz-studio");
  const isRedirectedRuntime = path.resolve(runtime.roots.runtime) !== path.resolve(defaultProjectRuntime);

  const candidateRoots: string[] = [runtimeBankRoot];
  if (!isRedirectedRuntime) {
    const projectBankRoot = path.join(defaultProjectRuntime, QUESTION_BANK_DIR);
    if (projectBankRoot !== runtimeBankRoot && existsSync(projectBankRoot)) {
      candidateRoots.push(projectBankRoot);
    }
  }
  return candidateRoots;
}

/**
 * Reads child directory names safely, verifying absence of symlinks and valid path segments.
 */
export async function readSafeBankChildDirs(
  bankRoot: string,
  dirPath: string,
  segmentKind: "archetype" | "domain",
): Promise<string[]> {
  await assertSafeBankFilesystemPath(bankRoot, dirPath);
  try {
    const entries = await readdir(dirPath, { withFileTypes: true });
    assertNoSymlinks(entries, dirPath);
    entries.forEach((entry) => assertSafeBankPathSegments([entry.name], [segmentKind]));
    return entries.filter((d) => d.isDirectory()).map((d) => d.name);
  } catch (err: unknown) {
    if (err instanceof RepositoryError) throw err;
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    const label = segmentKind === "archetype" ? "Question Bank root" : "archetype directory";
    throw new RepositoryError(`Failed to read ${label} at ${dirPath}: ${(err as Error).message}`, "BANK_READ_FAILED", {
      cause: err,
    });
  }
}

/**
 * Reads batch JSON file names safely from a domain directory.
 */
export async function readSafeBankBatchFileNames(bankRoot: string, domPath: string): Promise<string[]> {
  await assertSafeBankFilesystemPath(bankRoot, domPath);
  try {
    const entries = await readdir(domPath, { withFileTypes: true });
    assertNoSymlinks(entries, domPath);
    entries.forEach((entry) => assertSafeBankPathSegments([entry.name], ["batch file"]));
    return entries.filter((f) => f.isFile() && f.name.endsWith(".json")).map((f) => f.name);
  } catch (err: unknown) {
    if (err instanceof RepositoryError) throw err;
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw new RepositoryError(`Failed to read domain directory at ${domPath}: ${(err as Error).message}`, "BANK_READ_FAILED", {
      cause: err,
    });
  }
}

/**
 * Reads batch JSON file content safely after asserting containment within bankRoot.
 */
export async function readSafeBankBatchContent(bankRoot: string, filePath: string): Promise<string> {
  await assertSafeBankFilesystemPath(bankRoot, filePath);
  try {
    return await readFile(filePath, "utf8");
  } catch (err: unknown) {
    throw new RepositoryError(`Failed to read batch file ${filePath}: ${(err as Error).message}`, "BANK_READ_FAILED", {
      cause: err,
    });
  }
}

/**
 * Reads raw batch content from disk, falling back to legacy archetype path if primary does not exist.
 */
export async function readBatchContentWithFallback(
  runtime: RepositoryRuntime,
  normalizedArch: string,
  domainId: string,
  subtopicId: string,
): Promise<{ raw: string; filePath: string } | null> {
  const filePath = getQuestionBankPath.call(runtime, normalizedArch, domainId, `${subtopicId}.json`);
  await assertSafeTarget(runtime, filePath);
  try {
    const raw = await readFile(filePath, "utf8");
    return { raw, filePath };
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      if (err instanceof RepositoryError) throw err;
      throw new RepositoryError(`Failed to read batch file ${filePath}`, "BANK_BATCH_READ_FAILED", { cause: err });
    }
    if (normalizedArch !== "verdict_true_false") return null;
    try {
      const legacyPath = getQuestionBankPath.call(runtime, "verdict_fact_myth", domainId, `${subtopicId}.json`);
      await assertSafeTarget(runtime, legacyPath);
      const raw = await readFile(legacyPath, "utf8");
      return { raw, filePath: legacyPath };
    } catch (legacyErr: unknown) {
      if ((legacyErr as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw legacyErr;
    }
  }
}
