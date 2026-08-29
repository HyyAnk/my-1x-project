import { access, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { EpisodeSchema, SceneSchema, nowIso, type Episode, type Scene } from "@studio/shared";
import { RepositoryError } from "./errors.js";
import { allowedEpisodeFiles } from "./helpers.js";
import { parseScenes, serializeScenes } from "./sceneCodec.js";
import type { RepositoryRuntime } from "./runtime.js";

export async function clearSequenceDrafts(this: RepositoryRuntime,episodeId: string): Promise<void> {
  await this.removeTree(this.resolvePath("runtime", "shot-drafts", episodeId));
}

export async function saveSequenceDraft(this: RepositoryRuntime,episodeId: string, sequenceNumber: number, scenes: Scene[]): Promise<void> {
  const directory = this.resolvePath("runtime", "shot-drafts", episodeId);
  await mkdir(directory, { recursive: true });
  const normalized = scenes.map((scene, index) => SceneSchema.parse({ ...scene, episode_id: episodeId, scene_number: index + 1 }));
  await this.writeJsonAtomic(path.join(directory, `sequence-${String(sequenceNumber).padStart(2, "0")}.json`), normalized);
}

export async function readSequenceDrafts(this: RepositoryRuntime,episodeId: string): Promise<Array<{ sequenceNumber: number; scenes: Scene[]; modified_at: string }>> {
  const directory = this.resolvePath("runtime", "shot-drafts", episodeId);
  const entries = await readdir(directory, { withFileTypes: true }).catch(() => []);
  const drafts: Array<{ sequenceNumber: number; scenes: Scene[]; modified_at: string }> = [];
  for (const entry of entries.filter((item) => item.isFile() && /^sequence-\d+\.json$/i.test(item.name))) {
    const sequenceNumber = Number(entry.name.match(/\d+/)?.[0]);
    try {
      const filePath = path.join(directory, entry.name);
      const [payload, metadata] = await Promise.all([readFile(filePath, "utf8"), stat(filePath)]);
      drafts.push({ sequenceNumber, scenes: SceneSchema.array().parse(JSON.parse(payload) as unknown), modified_at: metadata.mtime.toISOString() });
    } catch {
      // An incomplete draft remains isolated and cannot corrupt the committed scene plan.
    }
  }
  return drafts.sort((a, b) => a.sequenceNumber - b.sequenceNumber);
}

export async function commitSequenceDrafts(this: RepositoryRuntime,channelId: string, episodeId: string, expectedCount: number): Promise<boolean> {
  const drafts = await this.readSequenceDrafts(episodeId);
  if (drafts.length !== expectedCount || drafts.some((draft, index) => draft.sequenceNumber !== index + 1)) return false;
  await this.saveScenes(channelId, episodeId, drafts.flatMap((draft) => draft.scenes));
  await this.clearSequenceDrafts(episodeId);
  return true;
}

export async function updateEpisodeStage(this: RepositoryRuntime,channelId: string, episodeId: string, stage: Episode["stage"]): Promise<Episode> {
  const episode = await this.getEpisode(channelId, episodeId);
  const channel = await this.getChannel(channelId);
  const next = EpisodeSchema.parse({ ...episode, stage, updated_at: nowIso() });
  await this.writeJsonAtomic(this.resolvePath("channels", channel.slug, "episodes", episode.slug, "episode.json"), next);
  return next;
}

export async function backupEpisodeFile(this: RepositoryRuntime,channelId: string, episodeId: string, filename: string): Promise<string | null> {
  if (!allowedEpisodeFiles.has(filename)) throw new RepositoryError("Unsupported episode file", "FILE_NOT_ALLOWED");
  const episode = await this.getEpisode(channelId, episodeId);
  const channel = await this.getChannel(channelId);
  const source = this.resolvePath("channels", channel.slug, "episodes", episode.slug, filename);
  try {
    await access(source);
  } catch {
    return null;
  }
  const backup = `${source}.${new Date().toISOString().replaceAll(/[:.]/g, "-")}.bak`;
  await writeFile(backup, await readFile(source));
  return backup;
}
