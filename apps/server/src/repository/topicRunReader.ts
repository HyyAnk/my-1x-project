import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { TopicRunSchema, nowIso } from "@studio/shared";
import { RepositoryError } from "./errors.js";
import type { TopicRun } from "./helpers.js";

export interface TopicRunFileInfo {
  entry: { name: string };
  filePath: string;
  effectiveDiskTime: number;
}

export async function findLatestTopicRunFile(directory: string): Promise<TopicRunFileInfo | null> {
  const entries = await readdir(directory, { withFileTypes: true });
  const jsonFiles = entries.filter((item) => item.isFile() && item.name.endsWith(".json"));
  if (jsonFiles.length === 0) return null;

  const filesWithMeta: TopicRunFileInfo[] = await Promise.all(
    jsonFiles.map(async (entry) => {
      const filePath = path.join(directory, entry.name);
      const fileStat = await stat(filePath).catch(() => null);
      const match = entry.name.match(/(?:suggestion|topic-run|run)-(\d+)/);
      const filenameTimestamp = match ? Number(match[1]) : 0;
      const mtimeMs = fileStat?.mtimeMs ?? 0;
      const effectiveDiskTime = filenameTimestamp > 0 ? filenameTimestamp : mtimeMs;
      return { entry, filePath, effectiveDiskTime };
    }),
  );

  filesWithMeta.sort((a, b) => b.effectiveDiskTime - a.effectiveDiskTime);
  return filesWithMeta[0] ?? null;
}

export function parseTopicRunData(parsed: unknown, fileName: string): TopicRun {
  const validated = TopicRunSchema.safeParse(parsed);
  if (validated.success) {
    return validated.data;
  }

  if (
    typeof parsed === "object" &&
    parsed !== null &&
    "run_id" in parsed &&
    typeof parsed.run_id === "string" &&
    "candidates" in parsed &&
    Array.isArray(parsed.candidates)
  ) {
    const legacy = parsed as {
      run_id: string;
      generated_at?: string;
      target_episode_count?: number;
      target_short_reel_count?: number;
      candidates: unknown[];
      shortages?: unknown[];
    };
    return {
      run_id: legacy.run_id,
      generated_at: legacy.generated_at || nowIso(),
      target_episode_count: legacy.target_episode_count ?? 3,
      target_short_reel_count: legacy.target_short_reel_count ?? 2,
      candidates: legacy.candidates as TopicRun["candidates"],
      shortages: (legacy.shortages as TopicRun["shortages"]) || [],
    };
  }

  throw new RepositoryError(
    `TOPIC_RUN_CORRUPTED: Latest topic run file "${fileName}" failed schema validation.`,
    "TOPIC_RUN_CORRUPTED",
  );
}

export async function readTopicRunFile(filePath: string, fileName: string): Promise<TopicRun> {
  let content: string;
  try {
    content = await readFile(filePath, "utf8");
  } catch (error) {
    throw new RepositoryError(
      `TOPIC_RUN_CORRUPTED: Failed to read latest topic run file "${fileName}".`,
      "TOPIC_RUN_CORRUPTED",
      { cause: error },
    );
  }

  try {
    const parsed: unknown = JSON.parse(content);
    return parseTopicRunData(parsed, fileName);
  } catch (error) {
    if (error instanceof RepositoryError) throw error;
    throw new RepositoryError(
      `TOPIC_RUN_CORRUPTED: Latest topic run file "${fileName}" contains invalid JSON.`,
      "TOPIC_RUN_CORRUPTED",
      { cause: error },
    );
  }
}

export async function loadTopicRunsFromDirectory(directory: string): Promise<TopicRun[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const runs: TopicRun[] = [];

  for (const entry of entries.filter((item) => item.isFile() && item.name.endsWith(".json"))) {
    try {
      const run = JSON.parse(await readFile(path.join(directory, entry.name), "utf8")) as TopicRun;
      if (run && Array.isArray(run.candidates)) {
        runs.push(run);
      }
    } catch {
      // Preserve forward compatibility with partially written topic runs.
    }
  }

  return runs;
}
