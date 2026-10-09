import { existsSync } from "node:fs";
import { copyFile, mkdir, readdir } from "node:fs/promises";
import path from "node:path";

const SQLITE_FILES = ["questions.db", "questions.db-wal", "questions.db-shm"];

/** Lists every `<archetype>/<domain>/<subtopic>.json` batch file under a Question Bank root, sorted. */
export async function listBankBatchFiles(bankRoot: string): Promise<string[]> {
  const files: string[] = [];
  for (const archetype of await readdir(bankRoot, { withFileTypes: true })) {
    if (!archetype.isDirectory()) continue;
    const archetypeDir = path.join(bankRoot, archetype.name);
    for (const domain of await readdir(archetypeDir, { withFileTypes: true })) {
      if (!domain.isDirectory()) continue;
      const domainDir = path.join(archetypeDir, domain.name);
      for (const file of await readdir(domainDir, { withFileTypes: true })) {
        if (file.isFile() && file.name.endsWith(".json")) files.push(path.join(domainDir, file.name));
      }
    }
  }
  return files.sort();
}

/** Copies one bank file into the backup directory, preserving its path relative to the bank root. */
export async function backUpBankFile(bankRoot: string, backupDir: string, filePath: string): Promise<void> {
  if (!existsSync(filePath)) return;
  const target = path.join(backupDir, path.relative(bankRoot, filePath));
  await mkdir(path.dirname(target), { recursive: true });
  await copyFile(filePath, target);
}

/** Copies the SQLite index together with its WAL side files so the backup is consistent. */
export async function backUpBankSqlite(bankRoot: string, backupDir: string): Promise<void> {
  for (const name of SQLITE_FILES) await backUpBankFile(bankRoot, backupDir, path.join(bankRoot, name));
}
