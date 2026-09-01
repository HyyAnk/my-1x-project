import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { ContextManifestSchema, type ContextManifest, type Episode, type TaskType } from "@studio/shared";
import type { RepositoryService } from "../repository.js";
import type { StudioLogger } from "../logger.js";
import { DEFAULT_CONFIG } from "../config.js";
import { studioRuntimePath } from "../runtimePaths.js";
import type { ContextFile } from "./contextTypes.js";

export async function readSharedRules(repository: RepositoryService, names: string[], target: ContextFile[]): Promise<void> {
  for (const name of names) {
    const relative = `shared/${name}`;
    const absolute = repository.resolveContextPath(relative);
    try {
      const content = await readFile(absolute, "utf8");
      target.push({ path: relative, reason: "shared production rule", content });
    } catch {
      // A missing optional rule is not fatal; the manifest still records the other inputs.
    }
  }
}

export async function readRuntimeConfig(repository: RepositoryService): Promise<{
  video_generation: { max_scene_duration_seconds?: number; narration_words_per_second?: number };
}> {
  try {
    const raw = JSON.parse(await readFile(studioRuntimePath(repository.rootDirectory, "config.json"), "utf8")) as Record<string, unknown>;
    return {
      ...raw,
      video_generation: {
        ...DEFAULT_CONFIG.video_generation,
        ...(raw.video_generation as object | undefined),
      },
    };
  } catch {
    return { video_generation: DEFAULT_CONFIG.video_generation };
  }
}

export function composeContextPrompt(
  taskType: TaskType,
  channel: { display_name: string; description: string; target_audience: string; language: string; market: string },
  episode: Episode | null,
  files: ContextFile[],
  extra: Record<string, unknown>,
): string {
  const context = files.map((file) => `\n--- FILE: ${file.path} (${file.reason}) ---\n${file.content}`).join("\n");
  const episodeLine = episode
    ? `Episode: ${episode.topic.title}\nPremise: ${episode.topic.premise}\nHook: ${episode.topic.hook}`
    : "No episode is confirmed for this task.";
  return [
    "You are working inside AI Quiz Studio.",
    `Task type: ${taskType}`,
    `Channel: ${channel.display_name}`,
    `Channel description: ${channel.description}`,
    `Audience: ${channel.target_audience}; language: ${channel.language}; market: ${channel.market}`,
    episodeLine,
    taskType === "GENERATE_RESEARCH"
      ? "Use read-only web research to verify this confirmed topic. Prefer primary records, government/university archives, standards bodies, museums, and contemporary reporting. Never invent a source or inaccessible quotation."
      : "Use only the scoped context below. Treat the research claim ledger as the factual boundary and never invent facts, quotes, people, programs, figures, or sources. DO NOT USE ANY WORKSPACE/CODE SEARCH OR EDITING TOOLS; output the final response text or JSON directly.",
    `Task instructions: ${JSON.stringify(extra)}`,
    context,
  ].join("\n");
}

export async function finalizeContextManifest(
  repository: RepositoryService,
  logger: StudioLogger,
  taskType: TaskType,
  channelId: string,
  episodeId: string | null,
  files: ContextFile[],
  excluded: string[],
  prompt: string,
): Promise<ContextManifest> {
  const manifest = ContextManifestSchema.parse({
    task_type: taskType,
    scope: { channel_id: channelId, episode_id: episodeId },
    included_files: files.map(({ path: filePath, reason, content }) => ({ path: filePath, reason, bytes: Buffer.byteLength(content) })),
    excluded_categories: excluded,
    approximate_bytes: Buffer.byteLength(prompt),
    prompt,
  });
  const auditDirectory = path.join(repository.roots.runtime, "logs");
  await mkdir(auditDirectory, { recursive: true });
  await appendFile(
    path.join(auditDirectory, "context-manifests.jsonl"),
    `${JSON.stringify({ ...manifest, created_at: new Date().toISOString() })}\n`,
    "utf8",
  );
  logger.debug("Context manifest assembled", { step: "context", profileId: channelId });
  return manifest;
}
