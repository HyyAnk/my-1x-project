import { existsSync } from "node:fs";
import { mkdir, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { BankSubtopicBatchSchema, type BankSubtopicBatch } from "@studio/shared";
import type { RepositoryRuntime } from "../../runtime.js";
import { QUESTION_BANK_DIR, getQuestionBankPath, getQuestionBankWritePath } from "./bankPathResolver.js";

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
export async function readSubtopicBatch(
  this: RepositoryRuntime,
  archetypeId: string,
  domainId: string,
  subtopicId: string,
): Promise<BankSubtopicBatch | null> {
  const normalizedArch = archetypeId === "verdict_fact_myth" ? "verdict_true_false" : archetypeId;
  const filePath = getQuestionBankPath.call(this, normalizedArch, domainId, `${subtopicId}.json`);

  try {
    const raw = JSON.parse(await readFile(filePath, "utf8")) as unknown;
    const parsed = BankSubtopicBatchSchema.parse(raw);
    if (parsed.archetype_id === "verdict_fact_myth") {
      parsed.archetype_id = "verdict_true_false";
    }
    return parsed;
  } catch {
    if (normalizedArch === "verdict_true_false") {
      try {
        const legacyPath = getQuestionBankPath.call(this, "verdict_fact_myth", domainId, `${subtopicId}.json`);
        const rawLegacy = JSON.parse(await readFile(legacyPath, "utf8")) as unknown;
        const parsed = BankSubtopicBatchSchema.parse(rawLegacy);
        parsed.archetype_id = "verdict_true_false";
        return parsed;
      } catch {
        return null;
      }
    }
    return null;
  }
}

/**
 * Atomically writes a subtopic batch to disk and keeps legacy mirrored files updated.
 */
export async function writeSubtopicBatch(this: RepositoryRuntime, batch: BankSubtopicBatch): Promise<void> {
  const normalizedBatch = {
    ...batch,
    archetype_id: batch.archetype_id === "verdict_fact_myth" ? "verdict_true_false" : batch.archetype_id,
  };
  const batchFilePath = getQuestionBankWritePath.call(
    this,
    normalizedBatch.archetype_id,
    normalizedBatch.domain_id,
    `${normalizedBatch.subtopic_id}.json`,
  );
  await mkdir(path.dirname(batchFilePath), { recursive: true });
  await this.writeJsonAtomic(batchFilePath, normalizedBatch);

  if (normalizedBatch.archetype_id === "verdict_true_false") {
    const legacyPath = getQuestionBankWritePath.call(
      this,
      "verdict_fact_myth",
      normalizedBatch.domain_id,
      `${normalizedBatch.subtopic_id}.json`,
    );
    if (existsSync(legacyPath)) {
      await this.writeJsonAtomic(legacyPath, normalizedBatch);
    }
  }
}

/**
 * Discovers and lists all subtopic batches across runtime and project repository locations.
 */
export async function listQuestionBankBatches(
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
    const isRuntime = bankRoot === runtimeBankRoot;
    let archetypeDirs: string[];
    try {
      archetypeDirs = (await readdir(bankRoot, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name);
    } catch {
      continue;
    }

    for (const archDir of archetypeDirs) {
      if (!matchesArchetypeFilter(archDir, filter?.archetypeId)) continue;
      const archPath = path.join(bankRoot, archDir);

      let domainDirs: string[];
      try {
        domainDirs = (await readdir(archPath, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name);
      } catch {
        continue;
      }

      for (const domDir of domainDirs) {
        if (filter?.domainId && domDir !== filter.domainId) continue;
        const domPath = path.join(archPath, domDir);

        let batchFiles: string[];
        try {
          batchFiles = (await readdir(domPath, { withFileTypes: true }))
            .filter((f) => f.isFile() && f.name.endsWith(".json"))
            .map((f) => f.name);
        } catch {
          continue;
        }

        for (const file of batchFiles) {
          const filePath = path.join(domPath, file);
          try {
            const content = JSON.parse(await readFile(filePath, "utf8")) as unknown;
            const parsed = BankSubtopicBatchSchema.safeParse(content);
            if (parsed.success) {
              const data = parsed.data;
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
          } catch {
            // Ignore unparseable files
          }
        }
      }
    }
  }

  return Array.from(batchesMap.values()).map((v) => v.data);
}
