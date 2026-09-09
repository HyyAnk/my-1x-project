import { existsSync } from "node:fs";
import { mkdir, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { BankSubtopicBatchSchema, type BankSubtopicBatch } from "@studio/shared";
import { RepositoryError } from "../../errors.js";
import type { RepositoryRuntime } from "../../runtime.js";
import { QUESTION_BANK_DIR, getQuestionBankPath, getQuestionBankWritePath } from "./bankPathResolver.js";
import { assertSafeBankFilesystemPath, assertSafeBankPathSegments } from "./bankPathSafety.js";
import { withBankRead, withBankWrite } from "./bankSerializationBoundary.js";
import { assertEnglishBatchWrite } from "./bankWritePolicy.js";

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
 * Reads a single subtopic batch file from storage, normalizing legacy archetypes.
 */
export async function readSubtopicBatchUnlocked(
  this: RepositoryRuntime,
  archetypeId: string,
  domainId: string,
  subtopicId: string,
): Promise<BankSubtopicBatch | null> {
  assertSafeBankPathSegments([archetypeId, domainId, subtopicId], ["archetype", "domain", "subtopic"]);
  const normalizedArch = archetypeId === "verdict_fact_myth" ? "verdict_true_false" : archetypeId;
  const filePath = getQuestionBankPath.call(this, normalizedArch, domainId, `${subtopicId}.json`);

  const parseBatch = (raw: string, sourcePath: string): BankSubtopicBatch => {
    let content: unknown;
    try {
      content = JSON.parse(raw);
    } catch (error) {
      throw new RepositoryError(`Malformed JSON in batch file ${sourcePath}`, "BANK_BATCH_CORRUPT", { cause: error });
    }
    const parsed = BankSubtopicBatchSchema.safeParse(content);
    if (!parsed.success) {
      throw new RepositoryError(`Schema validation failed for batch file ${sourcePath}: ${parsed.error.message}`, "BANK_BATCH_CORRUPT", {
        cause: parsed.error,
      });
    }
    if (parsed.data.domain_id !== domainId || parsed.data.subtopic_id !== subtopicId || !matchesArchetypeFilter(normalizedArch, parsed.data.archetype_id)) {
      throw new RepositoryError(`Batch membership does not match requested path ${normalizedArch}/${domainId}/${subtopicId}`, "BANK_BATCH_INCONSISTENT");
    }
    assertNestedQuestionMembership(parsed.data, sourcePath);
    const normalized = { ...parsed.data, archetype_id: parsed.data.archetype_id === "verdict_fact_myth" ? "verdict_true_false" : parsed.data.archetype_id };
    normalized.questions = normalized.questions.map((question) =>
      question.archetype_id === "verdict_fact_myth" ? { ...question, archetype_id: "verdict_true_false" as const } : question,
    );
    return normalized;
  };

  const assertSafeTarget = async (target: string): Promise<void> => {
    const roots = [path.join(this.roots.runtime, QUESTION_BANK_DIR), path.join(this.rootDirectory, ".quiz-studio", QUESTION_BANK_DIR)];
    const root = roots.find((candidate) => {
      const relative = path.relative(path.resolve(candidate), path.resolve(target));
      return relative === "" || (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
    });
    if (!root) throw new RepositoryError(`Question Bank path escaped its root: "${target}"`, "UNSAFE_PATH");
    await assertSafeBankFilesystemPath(root, target);
  };
  await assertSafeTarget(filePath);

  try {
    return parseBatch(await readFile(filePath, "utf8"), filePath);
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      if (normalizedArch === "verdict_true_false") {
        try {
          const legacyPath = getQuestionBankPath.call(this, "verdict_fact_myth", domainId, `${subtopicId}.json`);
          await assertSafeTarget(legacyPath);
          return parseBatch(await readFile(legacyPath, "utf8"), legacyPath);
        } catch (legacyErr: unknown) {
          if ((legacyErr as NodeJS.ErrnoException).code === "ENOENT") {
            return null;
          }
          throw legacyErr;
        }
      }
      return null;
    }
    if (err instanceof RepositoryError) throw err;
    throw new RepositoryError(`Failed to read batch file ${filePath}`, "BANK_BATCH_READ_FAILED", { cause: err });
  }
}

function assertNestedQuestionMembership(batch: BankSubtopicBatch, sourcePath: string): void {
  for (const question of batch.questions) {
    const archetypeMatches = matchesArchetypeFilter(batch.archetype_id, question.archetype_id);
    if (question.domain_id !== batch.domain_id || question.subtopic_id !== batch.subtopic_id || !archetypeMatches) {
      throw new RepositoryError(`Question membership does not match batch ${sourcePath}`, "BANK_BATCH_INCONSISTENT");
    }
  }
}

export function readSubtopicBatch(
  this: RepositoryRuntime,
  archetypeId: string,
  domainId: string,
  subtopicId: string,
): Promise<BankSubtopicBatch | null> {
  return withBankRead(this, () => readSubtopicBatchUnlocked.call(this, archetypeId, domainId, subtopicId));
}

/**
 * Atomically writes a subtopic batch to disk and keeps legacy mirrored files updated.
 */
export async function writeSubtopicBatchUnlocked(this: RepositoryRuntime, batch: BankSubtopicBatch): Promise<void> {
  const validated = BankSubtopicBatchSchema.parse(batch);
  assertSafeBankPathSegments([validated.archetype_id, validated.domain_id, validated.subtopic_id], ["archetype", "domain", "subtopic"]);
  assertEnglishBatchWrite(validated);
  const normalizedBatch = {
    ...validated,
    archetype_id: validated.archetype_id === "verdict_fact_myth" ? "verdict_true_false" : validated.archetype_id,
  };
  assertNestedQuestionMembership(validated, `${validated.archetype_id}/${validated.domain_id}/${validated.subtopic_id}`);
  const batchFilePath = getQuestionBankWritePath.call(
    this,
    normalizedBatch.archetype_id,
    normalizedBatch.domain_id,
    `${normalizedBatch.subtopic_id}.json`,
  );
  await assertSafeBankFilesystemPath(path.join(this.roots.runtime, QUESTION_BANK_DIR), batchFilePath);
  await mkdir(path.dirname(batchFilePath), { recursive: true });
  await this.writeJsonAtomic(batchFilePath, normalizedBatch);

  if (normalizedBatch.archetype_id === "verdict_true_false") {
    const legacyPath = getQuestionBankWritePath.call(
      this,
      "verdict_fact_myth",
      normalizedBatch.domain_id,
      `${normalizedBatch.subtopic_id}.json`,
    );
    await assertSafeBankFilesystemPath(path.join(this.roots.runtime, QUESTION_BANK_DIR), legacyPath);
    if (existsSync(legacyPath)) {
      await this.writeJsonAtomic(legacyPath, normalizedBatch);
    }
  }
}

export function writeSubtopicBatch(this: RepositoryRuntime, batch: BankSubtopicBatch): Promise<void> {
  return withBankWrite(this, () => writeSubtopicBatchUnlocked.call(this, batch));
}

/**
 * Discovers and lists all subtopic batches across runtime and project repository locations.
 */
// Directory traversal necessarily branches for each filesystem boundary; keep validation in this single read transaction.
// eslint-disable-next-line complexity
export async function listQuestionBankBatchesUnlocked(
  this: RepositoryRuntime,
  filter?: { archetypeId?: string; domainId?: string },
): Promise<BankSubtopicBatch[]> {
  const runtimeBankRoot = path.join(this.roots.runtime, QUESTION_BANK_DIR);
  const defaultProjectRuntime = path.join(this.rootDirectory, ".quiz-studio");
  const isRedirectedRuntime = path.resolve(this.roots.runtime) !== path.resolve(defaultProjectRuntime);

  const candidateRoots: string[] = [runtimeBankRoot];
  if (!isRedirectedRuntime) {
    const projectBankRoot = path.join(defaultProjectRuntime, QUESTION_BANK_DIR);
    if (projectBankRoot !== runtimeBankRoot && existsSync(projectBankRoot)) {
      candidateRoots.push(projectBankRoot);
    }
  }

  const batchesMap = new Map<string, { data: BankSubtopicBatch; isRuntime: boolean; archDir: string }>();

  for (const bankRoot of candidateRoots) {
    await assertSafeBankFilesystemPath(bankRoot, bankRoot);
    const isRuntime = bankRoot === runtimeBankRoot;
    let archetypeDirs: string[];
    try {
      const entries = await readdir(bankRoot, { withFileTypes: true });
      if (entries.some((entry) => entry.isSymbolicLink())) {
        throw new RepositoryError(`Question Bank contains a symlink or junction at ${bankRoot}`, "UNSAFE_PATH");
      }
      entries.forEach((entry) => assertSafeBankPathSegments([entry.name], ["archetype"]));
      archetypeDirs = entries.filter((d) => d.isDirectory()).map((d) => d.name);
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        continue;
      }
      throw new RepositoryError(`Failed to read Question Bank root at ${bankRoot}: ${(err as Error).message}`, "BANK_READ_FAILED", { cause: err });
    }

    for (const archDir of archetypeDirs) {
      if (!matchesArchetypeFilter(archDir, filter?.archetypeId)) continue;
      const archPath = path.join(bankRoot, archDir);
      await assertSafeBankFilesystemPath(bankRoot, archPath);

      let domainDirs: string[];
      try {
        const entries = await readdir(archPath, { withFileTypes: true });
        if (entries.some((entry) => entry.isSymbolicLink())) {
          throw new RepositoryError(`Question Bank contains a symlink or junction at ${archPath}`, "UNSAFE_PATH");
        }
        entries.forEach((entry) => assertSafeBankPathSegments([entry.name], ["domain"]));
        domainDirs = entries.filter((d) => d.isDirectory()).map((d) => d.name);
      } catch (err: unknown) {
        if ((err as NodeJS.ErrnoException).code === "ENOENT") {
          continue;
        }
        throw new RepositoryError(`Failed to read archetype directory at ${archPath}: ${(err as Error).message}`, "BANK_READ_FAILED", { cause: err });
      }

      for (const domDir of domainDirs) {
        if (filter?.domainId && domDir !== filter.domainId) continue;
        const domPath = path.join(archPath, domDir);
        await assertSafeBankFilesystemPath(bankRoot, domPath);

        let batchFiles: string[];
        try {
          const entries = await readdir(domPath, { withFileTypes: true });
          if (entries.some((entry) => entry.isSymbolicLink())) {
            throw new RepositoryError(`Question Bank contains a symlink or junction at ${domPath}`, "UNSAFE_PATH");
          }
          entries.forEach((entry) => assertSafeBankPathSegments([entry.name], ["batch file"]));
          batchFiles = entries.filter((f) => f.isFile() && f.name.endsWith(".json")).map((f) => f.name);
        } catch (err: unknown) {
          if ((err as NodeJS.ErrnoException).code === "ENOENT") {
            continue;
          }
          throw new RepositoryError(`Failed to read domain directory at ${domPath}: ${(err as Error).message}`, "BANK_READ_FAILED", { cause: err });
        }

        for (const file of batchFiles) {
          const filePath = path.join(domPath, file);
          await assertSafeBankFilesystemPath(bankRoot, filePath);
          let rawContent: string;
          try {
            rawContent = await readFile(filePath, "utf8");
          } catch (err: unknown) {
            throw new RepositoryError(`Failed to read batch file ${filePath}: ${(err as Error).message}`, "BANK_READ_FAILED", { cause: err });
          }

          let content: unknown;
          try {
            content = JSON.parse(rawContent);
          } catch (err: unknown) {
            throw new RepositoryError(`Malformed JSON in batch file ${filePath}: ${(err as Error).message}`, "BANK_BATCH_CORRUPT", { cause: err });
          }

          const parsed = BankSubtopicBatchSchema.safeParse(content);
          if (!parsed.success) {
            throw new RepositoryError(
              `Schema validation failed for batch file ${filePath}: ${parsed.error.message}`,
              "BANK_BATCH_CORRUPT",
              { cause: parsed.error },
            );
          }

          const data = parsed.data;
          const expectedSubtopicId = file.replace(/\.json$/, "");
          if (data.subtopic_id !== expectedSubtopicId) {
            throw new RepositoryError(
              `Inconsistent batch subtopic membership: file ${file} contains subtopic_id "${data.subtopic_id}" (expected "${expectedSubtopicId}")`,
              "BANK_BATCH_INCONSISTENT",
            );
          }
          if (data.domain_id !== domDir) {
            throw new RepositoryError(
              `Inconsistent batch domain membership: batch in directory "${domDir}" contains domain_id "${data.domain_id}"`,
              "BANK_BATCH_INCONSISTENT",
            );
          }
          if (!matchesArchetypeFilter(archDir, data.archetype_id)) {
            throw new RepositoryError(
              `Inconsistent batch archetype membership: batch in directory "${archDir}" contains archetype_id "${data.archetype_id}"`,
              "BANK_BATCH_INCONSISTENT",
            );
          }
          assertNestedQuestionMembership(data, filePath);

          if (data.archetype_id === "verdict_fact_myth") {
            data.archetype_id = "verdict_true_false";
          }
          data.questions = data.questions.map((q) => {
            if (q.archetype_id === "verdict_fact_myth") {
              return { ...q, archetype_id: "verdict_true_false" };
            }
            return q;
          });
          const key = `${data.archetype_id}:${data.domain_id}:${data.subtopic_id}`;
          const existing = batchesMap.get(key);
          if (!existing) {
            batchesMap.set(key, { data, isRuntime, archDir });
          } else if (isRuntime && !existing.isRuntime) {
            batchesMap.set(key, { data, isRuntime, archDir });
          } else if (
            isRuntime === existing.isRuntime &&
            archDir === "verdict_true_false" &&
            existing.archDir !== "verdict_true_false"
          ) {
            batchesMap.set(key, { data, isRuntime, archDir });
          }
        }
      }
    }
  }

  const batches = Array.from(batchesMap.values()).map((v) => v.data);
  const questionIds = new Set<string>();
  for (const batch of batches) {
    for (const question of batch.questions) {
      if (questionIds.has(question.id)) {
        throw new RepositoryError(`Duplicate Question Bank question ID "${question.id}"`, "BANK_DUPLICATE_QUESTION_ID");
      }
      questionIds.add(question.id);
    }
  }
  return batches;
}

export function listQuestionBankBatches(
  this: RepositoryRuntime,
  filter?: { archetypeId?: string; domainId?: string },
): Promise<BankSubtopicBatch[]> {
  return withBankRead(this, () => listQuestionBankBatchesUnlocked.call(this, filter));
}
